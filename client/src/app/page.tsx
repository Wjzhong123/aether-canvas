"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Settings, Mic, MicOff, Search, Globe, ShieldCheck, Target, Command, ExternalLink, Activity, Cpu, Zap, Layers } from 'lucide-react';
import { locales, LocaleType } from '../locales';
import SettingsModal from '../components/SettingsModal';
import EvidenceCard from '../components/EvidenceCard';
import IntentEngine from '../components/IntentEngine';
import VisualPulse from '../components/VisualPulse';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';

export default function Home() {
  const [lang, setLang] = useState<LocaleType>('zh');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [thinkingStage, setThinkingStage] = useState<'idle' | 'exploration' | 'convergence' | 'crystallization'>('idle');
  const [status, setStatus] = useState("");
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [activeCitation, setActiveCitation] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [agentIdentity, setAgentIdentity] = useState({ name: 'Aether', role: 'CEO', motto: '', theme: 'swiss' });

  const ws = useRef<WebSocket | null>(null);
  const recognition = useRef<any>(null);
  const t = locales[lang];
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const citationRefs = useRef<{[key: string]: HTMLElement | null}>({});
  const cardRefs = useRef<{[key: string]: HTMLElement | null}>({});
  const summaryRef = useRef<HTMLDivElement>(null);
  
  const queryRef = useRef(query);
  const isSearchingRef = useRef(isSearching);

  useEffect(() => { queryRef.current = query; }, [query]);
  useEffect(() => { isSearchingRef.current = isSearching; }, [isSearching]);

  const [accentColor, setAccentColor] = useState('0, 242, 255');

  const handleSearch = (overrideQuery?: string) => {
    const finalQuery = overrideQuery || queryRef.current;
    if (!finalQuery || !ws.current || isSearchingRef.current) return;
    
    setIsSearching(true);
    setThinkingStage('exploration');
    setEvidenceList([]);
    setSummaryData(null);
    
    const saved = localStorage.getItem('aether_keys_v2') || localStorage.getItem('aether_keys');
    const api_keys = saved ? JSON.parse(saved) : {};
    
    ws.current.send(JSON.stringify({ type: "research", query: finalQuery, api_keys, lang }));
    setQuery("");
    setTranscript("");
  };

  useEffect(() => {
    if (summaryData && summaryRef.current) {
      summaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [summaryData]);

  useEffect(() => {
    const savedLang = localStorage.getItem('aether_lang') as LocaleType;
    if (savedLang) setLang(savedLang);

    const savedId = localStorage.getItem('agent_identity');
    if (savedId) {
      const parsed = JSON.parse(savedId);
      setAgentIdentity(parsed);
      document.documentElement.setAttribute('data-theme', parsed.theme || 'swiss');
    }
    
    const color = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb');
    if (color) setAccentColor(color.trim());

    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      recognition.current.lang = lang === 'zh' ? 'zh-CN' : 'en-US';

      recognition.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const fullText = finalTranscript || interimTranscript;
        if (fullText) {
          setTranscript(fullText);
          setQuery(fullText);
        }

        if (event.results[event.results.length - 1].isFinal) {
          const resultText = event.results[event.results.length - 1][0].transcript;
          setIsListening(false);
          recognition.current.stop();
          setTimeout(() => handleSearch(resultText), 500);
        }
      };

      recognition.current.onend = () => setIsListening(false);
    }

    const speak = (text: string) => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
        window.speechSynthesis.speak(utterance);
      }
    };

    const connect = () => {
      const socket = new WebSocket('ws://localhost:8001/ws');
      ws.current = socket;
      socket.onopen = () => setStatus(t.connected);
      socket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'status') {
          setStatus(data.content);
          if (data.content.includes('探索') || data.content.includes('FETCHING')) setThinkingStage('exploration');
          else if (data.content.includes('分析') || data.content.includes('CONVERGING')) setThinkingStage('convergence');
          else if (data.content.includes('就绪') || data.content.includes('COMPLETE')) setThinkingStage('crystallization');
        }
        else if (data.type === 'evidence') {
            setEvidenceList(prev => [...prev, { ...data.content, importance: Math.random() }]);
        }
        else if (data.type === 'summary_chunk') {
          setSummaryData((prev: any) => ({
            ...prev,
            summary: (prev?.summary || "") + data.content,
            citations: prev?.citations || []
          }));
          setIsSearching(false);
          setThinkingStage('crystallization');
        }
        else if (data.type === 'summary') { 
          setSummaryData(data.content); 
          setIsSearching(false); 
          setStatus(t.complete); 
          setThinkingStage('crystallization');
          if (data.content.summary) speak(data.content.summary);
        }
        else if (data.type === 'clear') { 
          setEvidenceList([]); 
          setSummaryData(null); 
          setStatus(t.clear); 
          setThinkingStage('idle');
        }
      };
      socket.onclose = () => setTimeout(connect, 3000);
    };
    connect();

    const handleIdentityUpdate = (e: any) => {
      ws.current?.send(JSON.stringify({ type: "update_identity", content: e.detail }));
      setAgentIdentity(e.detail);
      document.documentElement.setAttribute('data-theme', e.detail.theme);
    };
    window.addEventListener('aether_update_identity', handleIdentityUpdate);

    return () => {
      ws.current?.close();
      window.removeEventListener('aether_update_identity', handleIdentityUpdate);
    };
  }, [lang]);

  const toggleListening = () => {
    if (isListening) {
      recognition.current?.stop();
      setIsListening(false);
    } else {
      if (typeof window !== 'undefined') window.speechSynthesis.cancel();
      setTranscript("");
      setQuery("");
      recognition.current?.start();
      setIsListening(true);
    }
  };

  useEffect(() => {
    if (activeCitation && citationRefs.current[activeCitation.point] && cardRefs.current[activeCitation.url]) {
      const start = citationRefs.current[activeCitation.point]!;
      const end = cardRefs.current[activeCitation.url]!;
      const startRect = start.getBoundingClientRect();
      const endRect = end.getBoundingClientRect();
      const svgRect = svgRef.current!.getBoundingClientRect();

      // Precision: Point to the screenshot area, not the whole card
      const x1 = startRect.left + startRect.width / 2 - svgRect.left;
      const y1 = startRect.top + startRect.height / 2 - svgRect.top;
      
      // Targeting the top-left area of the card where the screenshot is
      const x2 = endRect.left + endRect.width * 0.5 - svgRect.left;
      const y2 = endRect.top + endRect.height * 0.3 - svgRect.top;

      gsap.to(pathRef.current, { 
        attr: { d: `M ${x1} ${y1} C ${x1} ${y1 + 50}, ${x2} ${y2 - 50}, ${x2} ${y2}` }, 
        opacity: 1, 
        duration: 0.8,
        ease: "power2.inOut"
      });
    } else if (pathRef.current) gsap.to(pathRef.current, { opacity: 0, duration: 0.3 });
  }, [activeCitation]);

  return (
    <main className="min-h-screen relative selection:bg-accent selection:text-black overflow-x-hidden bg-[#0a0a0a] text-white">
      {/* Swiss Grid Overlay */}
      <div className="fixed inset-0 pointer-events-none z-10 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
      
      <IntentEngine stage={thinkingStage} accentColor={accentColor} />
      <VisualPulse active={isSearching} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} currentLang={lang} setLang={setLang} />
      
      <header className="fixed top-0 left-0 w-full p-8 md:p-12 z-[60] flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto">
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex flex-col gap-1">
             <div className="label-mono text-[10px] text-accent tracking-[0.3em] uppercase mb-2">{t.subtitle}</div>
             <h1 className="font-bauhaus text-5xl md:text-7xl leading-none tracking-tighter text-white uppercase">{agentIdentity.name}</h1>
             <div className="flex items-center gap-4 mt-4">
                <div className="h-[2px] w-12 bg-accent" />
                <div className="label-mono text-[12px] text-white/40 tracking-widest uppercase">{agentIdentity.role}</div>
             </div>
          </motion.div>
        </div>

        <div className="text-right pointer-events-auto flex flex-col items-end gap-6">
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl p-2 rounded-2xl border border-white/5">
             <button onClick={() => setIsSettingsOpen(true)} className="group p-4 rounded-xl hover:bg-accent/10 transition-all border border-transparent hover:border-accent/20">
                <Settings className="w-5 h-5 text-white/40 group-hover:text-accent transition-colors" />
             </button>
             <button onClick={toggleListening} className={`flex items-center gap-3 px-8 py-4 rounded-xl border text-[11px] font-bold tracking-[0.2em] transition-all uppercase ${isListening ? 'border-accent text-accent bg-accent/10 sci-fi-glow' : 'border-white/10 text-white/40 hover:border-white/20 bg-white/5'}`}>
                {isListening ? <Zap className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />} 
                {isListening ? t.voice_on : t.voice_off}
             </button>
          </div>
          
          {/* Agent Activity Monitor */}
          <AnimatePresence>
            {isSearching && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass-panel p-6 border-accent/20 shadow-[0_0_40px_rgba(var(--accent-rgb),0.1)] flex flex-col gap-4 min-w-[280px]"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="label-mono text-[10px] text-accent flex items-center gap-2"><Activity className="w-3 h-3" /> {t.agent_activity}</div>
                  <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
                </div>
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4">
                       <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center">
                          <Cpu className="w-3.5 h-3.5 text-white/20" />
                       </div>
                       <div className="flex-1">
                          <div className="h-1 bg-white/5 rounded overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }} 
                               animate={{ width: `${Math.random() * 100}%` }} 
                               transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                               className="h-full bg-accent/40" 
                             />
                          </div>
                          <div className="text-[8px] font-mono text-white/30 mt-2 uppercase tracking-tighter">Sub-Agent-{i} // {t.exploring_sources}</div>
                       </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-black/60 border border-white/10 backdrop-blur-2xl shadow-2xl">
            <div className={`w-2 h-2 rounded-full ${status.includes('ERROR') || status.includes('lost') || status.includes('离线') ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-accent sci-fi-glow animate-pulse'}`} />
            <div className="text-[10px] font-bold text-white/90 tracking-[0.2em] uppercase">{status}</div>
          </div>
        </div>
      </header>

      <div className="relative z-20 w-full pt-60 px-8 pb-40">
        {/* Asymmetric Masonry Evidence Layout */}
        <div className="max-w-[1400px] mx-auto columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8 mb-40">
          {evidenceList.map((evidence, idx) => (
            <motion.div 
              key={idx} 
              layout
              ref={el => { cardRefs.current[evidence.url] = el; }} 
              className="break-inside-avoid"
            >
              <EvidenceCard evidence={evidence} lang={lang} activeLocator={activeCitation?.point} />
            </motion.div>
          ))}
        </div>

        {summaryData && (
          <motion.div 
            ref={summaryRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl mx-auto glass-panel p-12 md:p-24 mb-60 relative overflow-hidden border-white/20 bg-black/60 shadow-[0_0_100px_rgba(0,0,0,0.5)]"
          >
            <div className="absolute top-0 left-0 w-[2px] h-full bg-accent/50" />
            <div className="flex items-center gap-8 mb-16">
              <div className="w-20 h-20 rounded-3xl bg-accent/10 border border-accent/20 flex items-center justify-center sci-fi-glow">
                <ShieldCheck className="w-10 h-10 text-accent" />
              </div>
              <div>
                 <div className="label-mono text-[11px] text-accent mb-2 uppercase tracking-[0.4em]">{t.research_summary}</div>
                 <h2 className="font-bauhaus text-4xl md:text-6xl text-white uppercase tracking-tighter leading-none">{t.asymmetric_auditing}</h2>
              </div>
            </div>
            
            <div className="prose prose-invert max-w-none mb-24">
              <p className="text-2xl md:text-3xl leading-[1.4] font-light text-white/95 italic border-l-4 border-white/5 pl-10">
                {summaryData.summary}
              </p>
            </div>

            <div className="space-y-12">
              <div className="flex items-center justify-between border-b border-white/10 pb-6">
                 <h3 className="label-mono text-white/40 flex items-center gap-4 tracking-widest uppercase">
                    <Target className="w-5 h-5 text-accent" /> {t.pixel_map}
                 </h3>
                 <div className="text-[10px] font-mono text-accent/50">{t.pixel_precision} 100%</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {summaryData.citations?.map((cit: any, i: number) => (
                  <button 
                    key={i} 
                    ref={el => { citationRefs.current[cit.point] = el; }} 
                    onClick={() => setActiveCitation(cit === activeCitation ? null : cit)} 
                    className={`text-left p-8 rounded-3xl border transition-all duration-700 group relative overflow-hidden ${activeCitation === cit ? 'border-accent bg-accent/10 sci-fi-glow translate-x-4' : 'border-white/5 bg-white/2 hover:border-white/10'}`}
                  >
                    <div className={`absolute top-0 left-0 w-1.5 h-full transition-all duration-700 ${activeCitation === cit ? 'bg-accent' : 'bg-transparent group-hover:bg-white/10'}`} />
                    <p className="font-mono text-[13px] text-white/80 mb-6 leading-relaxed italic">“{cit.point}”</p>
                    <div className="flex items-center justify-between border-t border-white/5 pt-4">
                      <div className="flex items-center gap-3">
                         <div className="w-6 h-6 rounded bg-accent/10 flex items-center justify-center"><Globe className="w-3 h-3 text-accent" /></div>
                         <p className="label-mono text-[9px] text-white/30 truncate max-w-[140px]">
                           {(() => { try { return new URL(cit.url).hostname; } catch { return cit.url || 'SOURCE'; } })()}
                         </p>
                      </div>
                      <Layers className={`w-4 h-4 transition-all duration-700 ${activeCitation === cit ? 'text-accent opacity-100 scale-125' : 'text-white/10 opacity-30'}`} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <svg ref={svgRef} className="fixed inset-0 pointer-events-none z-40 w-full h-full">
        <path ref={pathRef} fill="none" stroke="rgba(var(--accent-rgb), 0.6)" strokeWidth="2" strokeDasharray="8,8" className="sci-fi-glow" />
      </svg>

      {isListening && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-full max-w-5xl px-12 pointer-events-none text-center">
          <motion.p initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-bauhaus text-6xl md:text-8xl text-white italic drop-shadow-[0_0_50px_rgba(0,0,0,1)] uppercase leading-none tracking-tighter">
            {transcript || t.listening}
          </motion.p>
          <div className="mt-12 label-mono text-accent animate-pulse tracking-[0.5em] uppercase text-sm">Neural_Stream_Deployment...</div>
        </div>
      )}

      <footer className="fixed bottom-12 left-0 w-full px-12 z-[70] pointer-events-none">
        <div className="max-w-4xl mx-auto pointer-events-auto">
          <div className="glass-panel group p-4 flex items-center gap-6 hover:border-accent/40 transition-all duration-1000 border-white/10 bg-black/80 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center ml-2 border border-white/10 group-hover:border-accent/40 transition-colors">
              <Command className="w-6 h-6 text-white/30 group-hover:text-accent transition-colors" />
            </div>
            <input 
              type="text"
              placeholder={t.research_intent}
              className="flex-1 bg-transparent border-none outline-none text-white font-mono text-lg placeholder:text-white/10 px-4"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={() => handleSearch()} className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${query ? 'bg-accent text-black sci-fi-glow' : 'bg-white/5 text-white/10'}`}>
              <Search className="w-6 h-6" />
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
}
