"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import VisualPulse from '@/components/VisualPulse';
import EvidenceCard from '@/components/EvidenceCard';
import { Command, ShieldCheck, Target, Trash2, Zap } from 'lucide-react';
import gsap from 'gsap';

export default function Home() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [status, setStatus] = useState("SYSTEM READY");
  const [activeCitation, setActiveCitation] = useState<any>(null);
  const [commandHint, setCommandHint] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);
  
  const citationRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    const connect = () => {
      const socket = new WebSocket("ws://localhost:8001/ws");
      socket.onopen = () => { setStatus("SYSTEM CONNECTED"); ws.current = socket; };
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'status') setStatus(data.content.toUpperCase());
        else if (data.type === 'evidence') setEvidenceList((prev) => [data.content, ...prev]);
        else if (data.type === 'summary') { setSummaryData(data.content); setIsSearching(false); }
        else if (data.type === 'clear') { setEvidenceList([]); setSummaryData(null); setStatus("CANVAS CLEARED"); setIsSearching(false); }
      };
      socket.onclose = () => { setStatus("SYSTEM OFFLINE..."); setTimeout(connect, 3000); };
    };
    connect();
    return () => ws.current?.close();
  }, []);

  useEffect(() => {
    if (query.startsWith("/v ")) setCommandHint("VIDEO MODE: Focusing on visual motion & YouTube");
    else if (query.startsWith("/p ")) setCommandHint("PALETTE MODE: Focusing on UI/UX & Style");
    else if (query.startsWith("/m ")) setCommandHint("MEMORY MODE: Direct brain retrieval");
    else if (query.startsWith("/clear")) setCommandHint("CLEAR: Wipe the current canvas");
    else setCommandHint(null);
  }, [query]);

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
      <svg ref={svgRef} className="fixed inset-0 pointer-events-none z-40 w-full h-full">
        <path ref={pathRef} fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeDasharray="5,5" className="drop-shadow-[0_0_8px_rgba(255,62,0,0.8)]" />
      </svg>

      <header className="fixed top-0 left-0 w-full p-8 z-50 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto">
          <h1 className="text-bauhaus text-5xl leading-[0.8] mb-2">AETHER<br />CANVAS</h1>
          <div className="h-1 w-12 bg-accent" />
        </div>
        <div className="text-right font-mono pointer-events-auto">
          <div className="flex items-center justify-end gap-2 text-xs text-white/50 tracking-widest uppercase">
            <div className={`w-2 h-2 rounded-full ${ws.current?.readyState === WebSocket.OPEN ? 'bg-green-500' : 'bg-red-500'}`} />
            {status}
          </div>
        </div>
      </header>

      <div className="pt-48 px-8 pb-48 max-w-[1800px] mx-auto relative z-10">
        <div className="masonry-columns mb-12">
          {evidenceList.map((evidence, i) => (
            <div key={i} ref={el => { cardRefs.current[evidence.url] = el; }} className="masonry-item animate-in fade-in slide-in-from-bottom-12 duration-1000">
              <EvidenceCard evidence={evidence} activeLocator={activeCitation?.url === evidence.url ? activeCitation?.locator_text : null} />
            </div>
          ))}
        </div>

        {summaryData && (
          <div className="max-w-4xl mx-auto glass border-l-8 border-accent p-12 mb-24 animate-in slide-in-from-left-12 duration-700 bg-surface/90">
            <div className="flex items-center gap-4 mb-8">
              <ShieldCheck className="w-8 h-8 text-accent" />
              <h2 className="text-bauhaus text-4xl tracking-tighter uppercase">Asymmetric_Auditing</h2>
            </div>
            <div className="prose prose-invert max-w-none font-mono text-sm leading-relaxed text-white/80 mb-12">{summaryData.summary}</div>
            <div className="space-y-4">
              <h3 className="font-mono text-[10px] text-white/30 uppercase tracking-[0.3em] mb-4 flex items-center gap-2"><Target className="w-3 h-3" /> PIXEL_LEVEL_EVIDENCE_MAP</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summaryData.citations?.map((cit: any, i: number) => (
                  <button key={i} ref={el => { citationRefs.current[cit.point] = el; }} onClick={() => setActiveCitation(cit === activeCitation ? null : cit)} className={`text-left p-4 glass border-l-2 transition-all duration-300 hover:bg-accent/10 ${activeCitation === cit ? 'border-accent bg-accent/10 translate-x-2' : 'border-white/10'}`}>
                    <p className="font-mono text-[11px] text-white/90 mb-1">“{cit.point}”</p>
                    <p className="font-mono text-[9px] text-white/30 truncate uppercase">{new URL(cit.url).hostname}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="fixed bottom-0 left-0 w-full p-12 z-50 pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto">
          {commandHint && (
            <div className="mb-2 bg-accent text-black font-mono text-[10px] px-3 py-1 flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-300">
               <Zap className="w-3 h-3" fill="currentColor" /> {commandHint}
            </div>
          )}
          <div className="glass rounded-none border-l-4 border-accent p-1 flex items-center gap-2 shadow-2xl bg-black/95 group transition-all duration-300 focus-within:ring-1 ring-accent/50">
            <div className="pl-4"><Command className="w-5 h-5 text-accent" /></div>
            <input 
              type="text" 
              placeholder="ENTER RESEARCH INTENT OR COMMAND..."
              className="flex-1 bg-transparent border-none outline-none font-mono text-sm py-5 px-2 tracking-[0.2em] uppercase"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} className="bg-accent hover:bg-white text-black px-8 py-5 transition-all duration-500 font-bauhaus text-xl">EXEC</button>
          </div>
        </div>
      </footer>
    </main>
  );
}
