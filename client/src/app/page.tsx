"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import VisualPulse from '@/components/VisualPulse';
import EvidenceCard from '@/components/EvidenceCard';
import { Command, ShieldCheck, Target } from 'lucide-react';
import gsap from 'gsap';

export default function Home() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [status, setStatus] = useState("SYSTEM READY");
  const [activeCitation, setActiveCitation] = useState<any>(null);
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
      };
      socket.onclose = () => { setStatus("SYSTEM OFFLINE - RECONNECTING..."); setTimeout(connect, 3000); };
    };
    connect();
    return () => ws.current?.close();
  }, []);

  const handleSearch = () => {
    if (!query || !ws.current) return;
    setIsSearching(true);
    setEvidenceList([]);
    setSummaryData(null);
    setActiveCitation(null);
    ws.current.send(JSON.stringify({ type: "research", query }));
    setQuery("");
  };

  // Connection Animation Logic
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

        // Draw an organic curve
        const cp1x = startX + (endX - startX) * 0.1;
        const cp1y = startY + (endY - startY) * 0.5;
        const cp2x = startX + (endX - startX) * 0.9;
        const cp2y = startY + (endY - startY) * 0.5;

        const d = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
        
        gsap.fromTo(pathRef.current, 
          { strokeDasharray: 1000, strokeDashoffset: 1000, opacity: 0 },
          { strokeDashoffset: 0, opacity: 1, duration: 0.8, ease: "power2.out" }
        );
        pathRef.current.setAttribute('d', d);
      }
    } else if (pathRef.current) {
      gsap.to(pathRef.current, { opacity: 0, duration: 0.3 });
    }
  }, [activeCitation]);

  return (
    <main className="min-h-screen relative swiss-grid selection:bg-accent selection:text-black overflow-x-hidden">
      <VisualPulse active={isSearching} />
      
      {/* SVG Connection Layer */}
      <svg ref={svgRef} className="fixed inset-0 pointer-events-none z-40 w-full h-full">
        <path 
          ref={pathRef}
          fill="none" 
          stroke="var(--color-accent)" 
          strokeWidth="1.5" 
          strokeDasharray="5,5"
          className="drop-shadow-[0_0_8px_rgba(255,62,0,0.8)]"
        />
      </svg>

      {/* Header */}
      <header className="fixed top-0 left-0 w-full p-8 z-50 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto">
          <h1 className="text-bauhaus text-5xl leading-[0.8] mb-2">AETHER<br />CANVAS</h1>
          <div className="h-1 w-12 bg-accent" />
        </div>
        <div className="text-right font-mono pointer-events-auto">
          <div className="flex items-center justify-end gap-2">
            <div className={`w-2 h-2 rounded-full ${ws.current?.readyState === WebSocket.OPEN ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
            <p className="text-xs text-white/50 tracking-widest">{status}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-48 px-8 pb-48 max-w-[1800px] mx-auto relative z-10">
        
        {/* Masonry Evidence Grid */}
        <div className="masonry-columns mb-12">
          {evidenceList.map((evidence, i) => (
            <div 
              key={i} 
              ref={el => { cardRefs.current[evidence.url] = el; }}
              className="masonry-item animate-in fade-in slide-in-from-bottom-12 duration-1000 ease-out"
            >
              <EvidenceCard 
                evidence={evidence} 
                activeLocator={activeCitation?.url === evidence.url ? activeCitation?.locator_text : null} 
              />
            </div>
          ))}
        </div>

        {/* Summary Layer */}
        {summaryData && (
          <div className="max-w-4xl mx-auto glass border-l-8 border-accent p-12 mb-24 animate-in slide-in-from-left-12 duration-700 bg-surface/90 relative">
            <div className="flex items-center gap-4 mb-8">
              <ShieldCheck className="w-8 h-8 text-accent" />
              <h2 className="text-bauhaus text-4xl tracking-tighter uppercase">Asymmetric_Auditing</h2>
            </div>
            
            <div className="prose prose-invert max-w-none font-mono text-sm leading-relaxed text-white/80 mb-12">
              {summaryData.summary}
            </div>

            <div className="space-y-4">
              <h3 className="font-mono text-[10px] text-white/30 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                <Target className="w-3 h-3" /> PIXEL_LEVEL_EVIDENCE_MAP
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summaryData.citations?.map((cit: any, i: number) => (
                  <button 
                    key={i}
                    ref={el => { citationRefs.current[cit.point] = el; }}
                    onClick={() => setActiveCitation(cit === activeCitation ? null : cit)}
                    className={`text-left p-4 glass border-l-2 transition-all duration-300 hover:bg-accent/10 ${activeCitation === cit ? 'border-accent bg-accent/10 translate-x-2' : 'border-white/10'}`}
                  >
                    <p className="font-mono text-[11px] text-white/90 mb-1">“{cit.point}”</p>
                    <p className="font-mono text-[9px] text-white/30 truncate uppercase tracking-tighter">{new URL(cit.url).hostname}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Superpowers Bar */}
      <footer className="fixed bottom-0 left-0 w-full p-12 z-50 pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto">
          <div className="glass rounded-none border-l-4 border-accent p-1 flex items-center gap-2 shadow-2xl bg-black/95">
            <div className="pl-4"><Command className="w-5 h-5 text-accent" /></div>
            <input 
              type="text" 
              placeholder="INPUT RESEARCH INTENT..."
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
