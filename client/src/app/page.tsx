"use client";

import React, { useState, useEffect, useRef } from 'react';
import VisualPulse from '@/components/VisualPulse';
import EvidenceCard from '@/components/EvidenceCard';
import { Command, Send, MessageSquare } from 'lucide-react';

export default function Home() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [status, setStatus] = useState("SYSTEM READY");
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const connect = () => {
      const socket = new WebSocket("ws://localhost:8001/ws");
      
      socket.onopen = () => {
        setStatus("SYSTEM CONNECTED");
        ws.current = socket;
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'status') {
          setStatus(data.content.toUpperCase());
        } else if (data.type === 'evidence') {
          setEvidenceList((prev) => [data.content, ...prev]);
        } else if (data.type === 'summary') {
          setSummary(data.content);
          setIsSearching(false);
        }
      };

      socket.onclose = () => {
        setStatus("SYSTEM OFFLINE - RECONNECTING...");
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      ws.current?.close();
    };
  }, []);

  const handleSearch = () => {
    if (!query || !ws.current) return;
    
    setIsSearching(true);
    setEvidenceList([]);
    setSummary(null);
    
    ws.current.send(JSON.stringify({
      type: "research",
      query: query
    }));
    setQuery("");
  };

  return (
    <main className="min-h-screen relative swiss-grid selection:bg-accent selection:text-black">
      <VisualPulse active={isSearching} />
      
      {/* Header */}
      <header className="fixed top-0 left-0 w-full p-8 z-50 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto">
          <h1 className="text-bauhaus text-5xl leading-[0.8] mb-2">
            AETHER<br />CANVAS
          </h1>
          <div className="h-1 w-12 bg-accent" />
        </div>
        <div className="text-right font-mono pointer-events-auto">
          <div className="flex items-center justify-end gap-2">
            <div className={`w-2 h-2 rounded-full ${ws.current?.readyState === WebSocket.OPEN ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
            <p className="text-xs text-white/50 tracking-widest">{status}</p>
          </div>
          <p className="text-[10px] text-accent mt-1 tracking-[0.2em]">CORE_ENGINE: NEXUS_B1</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-48 px-8 pb-48 max-w-[1800px] mx-auto">
        
        {/* Evidence Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {evidenceList.map((evidence, i) => (
            <div key={i} className="animate-in fade-in slide-in-from-bottom-12 duration-1000 ease-out">
              <EvidenceCard evidence={evidence} />
            </div>
          ))}
        </div>

        {/* Summary Synthesis Layer */}
        {summary && (
          <div className="max-w-4xl mx-auto glass border-l-8 border-accent p-12 mb-24 animate-in slide-in-from-left-12 duration-700 bg-surface/80">
            <div className="flex items-center gap-4 mb-8">
              <MessageSquare className="w-8 h-8 text-accent" />
              <h2 className="text-bauhaus text-4xl tracking-tighter uppercase">Audited_结晶</h2>
            </div>
            <div className="prose prose-invert max-w-none font-mono text-sm leading-relaxed text-white/80 whitespace-pre-wrap selection:bg-accent selection:text-black">
              {summary}
            </div>
            <div className="mt-12 flex justify-end">
              <span className="font-mono text-[10px] text-accent tracking-[0.3em] uppercase">High Fidelity Evidence Verified</span>
            </div>
          </div>
        )}
        
        {isSearching && evidenceList.length === 0 && (
           <div className="flex flex-col items-center justify-center h-[40vh]">
              <div className="w-16 h-1 bg-accent animate-pulse mb-4" />
              <p className="text-bauhaus text-3xl tracking-tighter opacity-80 uppercase">Bursting_Exploration...</p>
              <p className="font-mono text-xs text-white/20 mt-2 tracking-widest uppercase">Nexus-Browser fetching visual proof</p>
           </div>
        )}
      </div>

      {/* Superpowers Logic Footer */}
      <footer className="fixed bottom-0 left-0 w-full p-12 z-50 pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto">
          <div className="glass rounded-none border-l-4 border-accent p-1 flex items-center gap-2 group transition-all duration-500 shadow-2xl bg-black/95">
            <div className="pl-4">
              <Command className="w-5 h-5 text-accent" />
            </div>
            <input 
              type="text" 
              placeholder="ENTER RESEARCH INTENT OR URL"
              className="flex-1 bg-transparent border-none outline-none font-mono text-sm py-5 px-2 tracking-[0.2em] uppercase placeholder:text-white/10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button 
              onClick={handleSearch}
              className="bg-accent hover:bg-white text-black px-8 py-5 transition-all duration-500 font-bauhaus text-xl group-hover:px-12"
            >
              EXEC
            </button>
          </div>
          <div className="mt-4 flex justify-between px-2 font-mono text-[9px] text-white/20 tracking-widest uppercase">
            <span>Alt+Space to invoke superpowers</span>
            <span>Agentic Orchestration: Enabled</span>
          </div>
        </div>
      </footer>

      {/* Swiss Design Accents */}
      <div className="fixed top-1/2 left-4 -translate-y-1/2 font-mono text-[10px] text-white/5 flex flex-col gap-8 pointer-events-none">
        <span>01</span><span>02</span><span>03</span><span>04</span>
      </div>
    </main>
  );
}
