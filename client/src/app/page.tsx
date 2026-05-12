"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import VisualPulse from '@/components/VisualPulse';
import EvidenceCard from '@/components/EvidenceCard';
import { Command, ShieldCheck, Target, Mic, MicOff, Zap } from 'lucide-react';
import gsap from 'gsap';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [status, setStatus] = useState("SYSTEM READY");
  const [activeCitation, setActiveCitation] = useState<any>(null);
  const [commandHint, setCommandHint] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  
  const recognition = useRef<any>(null);
  const ws = useRef<WebSocket | null>(null);
  const citationRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      recognition.current.lang = 'zh-CN';
      recognition.current.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) setQuery(prev => prev + event.results[i][0].transcript);
          else interim += event.results[i][0].transcript;
        }
        setTranscript(interim);
      };
      recognition.current.onend = () => isListening && recognition.current.start();
    }
  }, [isListening]);

  const toggleListening = () => {
    if (isListening) { recognition.current?.stop(); setIsListening(false); setTranscript(""); }
    else { recognition.current?.start(); setIsListening(true); setStatus("LISTENING..."); }
  };

  useEffect(() => {
    const connect = () => {
      const socket = new WebSocket("ws://localhost:8001/ws");
      socket.onopen = () => { setStatus("SYSTEM CONNECTED"); ws.current = socket; };
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'status') setStatus(data.content.toUpperCase());
        else if (data.type === 'evidence') setEvidenceList((prev) => [data.content, ...prev]);
        else if (data.type === 'summary') { setSummaryData(data.content); setIsSearching(false); }
        else if (data.type === 'clear') { setEvidenceList([]); setSummaryData(null); setIsSearching(false); }
      };
      socket.onclose = () => setTimeout(connect, 3000);
    };
    connect();
    return () => ws.current?.close();
  }, []);

  const sendFeedback = (data: any) => {
    ws.current?.send(JSON.stringify({ type: "feedback", data }));
  };

  const handleSearch = () => {
    if (!query || !ws.current) return;
    setIsSearching(true);
    if (!query.startsWith("/m ")) { setEvidenceList([]); setSummaryData(null); }
    ws.current.send(JSON.stringify({ type: "research", query }));
    setQuery("");
  };

  useLayoutEffect(() => {
    if (activeCitation && svgRef.current && pathRef.current) {
      const btn = citationRefs.current[activeCitation.point];
      const card = cardRefs.current[activeCitation.url];
      if (btn && card) {
        const svgRect = svgRef.current.getBoundingClientRect();
        const bRect = btn.getBoundingClientRect();
        const cRect = card.getBoundingClientRect();
        const startX = bRect.left + bRect.width / 2 - svgRect.left;
        const startY = bRect.top + bRect.height / 2 - svgRect.top;
        const endX = cRect.left + cRect.width / 2 - svgRect.left;
        const endY = cRect.top + cRect.height / 2 - svgRect.top;
        const d = `M ${startX} ${startY} C ${startX + (endX - startX) * 0.1} ${startY + (endY - startY) * 0.5}, ${startX + (endX - startX) * 0.9} ${startY + (endY - startY) * 0.5}, ${endX} ${endY}`;
        gsap.fromTo(pathRef.current, { strokeDasharray: 1000, strokeDashoffset: 1000, opacity: 0 }, { strokeDashoffset: 0, opacity: 1, duration: 0.8 });
        pathRef.current.setAttribute('d', d);
      }
    } else if (pathRef.current) gsap.to(pathRef.current, { opacity: 0, duration: 0.3 });
  }, [activeCitation]);

  return (
    <main className="min-h-screen relative swiss-grid selection:bg-accent selection:text-black overflow-x-hidden">
      <VisualPulse active={isSearching} />
      
      {/* Voice Subtitles Overlay */}
      {isListening && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-full max-w-4xl px-4 md:px-8 pointer-events-none">
          <p className="text-bauhaus text-4xl md:text-6xl text-center tracking-tighter text-white opacity-90 italic drop-shadow-2xl">
            {transcript || "LISTENING..."}
          </p>
        </div>
      )}

      <svg ref={svgRef} className="fixed inset-0 pointer-events-none z-40 w-full h-full">
        <path ref={pathRef} fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeDasharray="5,5" className="drop-shadow-[0_0_8px_rgba(255,62,0,0.8)]" />
      </svg>

      <header className="fixed top-0 left-0 w-full p-4 md:p-8 z-50 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto">
          <h1 className="text-bauhaus text-3xl md:text-5xl leading-[0.8] mb-2">AETHER<br />CANVAS</h1>
          <div className="h-1 w-8 md:w-12 bg-accent" />
        </div>
        <div className="text-right font-mono pointer-events-auto flex flex-col items-end gap-2">
          <button onClick={toggleListening} className={`flex items-center gap-2 px-3 py-1 border text-[9px] md:text-[10px] ${isListening ? 'border-accent text-accent animate-pulse' : 'border-white/10 hover:border-white/40'}`}>
            {isListening ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />} {isListening ? 'VOICE ON' : 'VOICE OFF'}
          </button>
          <div className="text-[9px] md:text-xs text-white/50 tracking-widest uppercase">{status}</div>
        </div>
      </header>

      <div className="pt-32 md:pt-48 px-4 md:px-8 pb-32 md:pb-48 max-w-[1800px] mx-auto relative z-10">
        <div className="masonry-columns mb-12">
          {evidenceList.map((evidence, i) => (
            <div key={i} ref={el => { cardRefs.current[evidence.url] = el; }} className="masonry-item animate-in fade-in slide-in-from-bottom-12 duration-1000">
              <EvidenceCard evidence={evidence} activeLocator={activeCitation?.url === evidence.url ? activeCitation?.locator_text : null} onFeedback={sendFeedback} />
            </div>
          ))}
        </div>

        {summaryData && (
          <div className="max-w-4xl mx-auto glass border-l-4 md:border-l-8 border-accent p-6 md:p-12 mb-24 animate-in slide-in-from-left-12 duration-700 bg-surface/90">
            <div className="flex items-center gap-4 mb-8">
              <ShieldCheck className="w-6 h-6 md:w-8 md:h-8 text-accent" />
              <h2 className="text-bauhaus text-2xl md:text-4xl tracking-tighter uppercase">Asymmetric_Auditing</h2>
            </div>
            <div className="prose prose-invert max-w-none font-mono text-xs md:text-sm leading-relaxed text-white/80 mb-12">{summaryData.summary}</div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                {summaryData.citations?.map((cit: any, i: number) => (
                  <button key={i} ref={el => { citationRefs.current[cit.point] = el; }} onClick={() => setActiveCitation(cit === activeCitation ? null : cit)} className={`text-left p-3 md:p-4 glass border-l-2 transition-all duration-300 ${activeCitation === cit ? 'border-accent bg-accent/10 translate-x-1 md:translate-x-2' : 'border-white/10'}`}>
                    <p className="font-mono text-[10px] md:text-[11px] text-white/90 mb-1">“{cit.point}”</p>
                    <p className="font-mono text-[8px] md:text-[9px] text-white/30 truncate uppercase">{new URL(cit.url).hostname}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="fixed bottom-0 left-0 w-full p-4 md:p-12 z-50 pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto">
          <div className="glass rounded-none border-l-4 border-accent p-1 flex items-center gap-2 shadow-2xl bg-black/95">
            <div className="pl-4"><Command className="w-5 h-5 text-accent" /></div>
            <input 
              type="text" 
              placeholder="RESEARCH INTENT..."
              className="flex-1 bg-transparent border-none outline-none font-mono text-[10px] md:text-sm py-4 md:py-5 px-2 tracking-[0.2em] uppercase"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} className="bg-accent hover:bg-white text-black px-4 md:px-8 py-4 md:py-5 transition-all duration-500 font-bauhaus text-lg md:text-xl">EXEC</button>
          </div>
        </div>
      </footer>
    </main>
  );
}
