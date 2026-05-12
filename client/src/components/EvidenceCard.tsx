"use client";

import React from 'react';
import { ExternalLink, Search, Play } from 'lucide-react';

interface Evidence {
  url: string;
  title: string;
  screenshot?: string;
  text?: string;
  palette?: string[];
  hero_image?: string;
  video_frames?: string[];
  status: 'success' | 'error' | 'pending';
}

const EvidenceCard: React.FC<{ evidence: Evidence }> = ({ evidence }) => {
  return (
    <div className="glass group overflow-hidden border-white/10 hover:border-accent/50 transition-all duration-500 flex flex-col h-full bg-surface/50">
      {/* Palette Header */}
      <div className="flex h-1">
        {evidence.palette?.map((c, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: c }} />
        ))}
      </div>

      <div className="relative aspect-video overflow-hidden border-b border-white/5 bg-black">
        {evidence.screenshot ? (
          <img 
            src={`data:image/png;base64,${evidence.screenshot}`} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Search className="w-8 h-8 text-white/10 animate-pulse" />
          </div>
        )}
        
        {/* Video Frames Overlay */}
        {evidence.video_frames && evidence.video_frames.length > 0 && (
          <div className="absolute bottom-2 left-2 flex gap-1">
             {evidence.video_frames.map((f, i) => (
               <div key={i} className="w-8 h-8 border border-white/20 rounded overflow-hidden">
                 <img src={`data:image/png;base64,${f}`} className="w-full h-full object-cover" />
               </div>
             ))}
             <div className="w-8 h-8 glass flex items-center justify-center rounded">
               <Play className="w-3 h-3 text-accent" fill="currentColor" />
             </div>
          </div>
        )}

        <div className="absolute top-2 right-2 flex gap-2">
           <a href={evidence.url} target="_blank" rel="noreferrer" className="p-2 glass rounded-full hover:bg-accent/20 transition-colors">
              <ExternalLink className="w-4 h-4" />
           </a>
        </div>
      </div>
      
      <div className="p-4 flex-1">
        <h3 className="text-bauhaus text-lg mb-1 truncate group-hover:text-accent transition-colors tracking-tighter">
          {evidence.title || "Exploring..."}
        </h3>
        <p className="text-[10px] font-mono text-white/20 mb-2 uppercase tracking-widest truncate">
          {new URL(evidence.url).hostname}
        </p>
        <p className="text-white/40 text-[11px] line-clamp-3 font-mono leading-relaxed lowercase">
          {evidence.text || "Analyzing visual proof and metadata..."}
        </p>
      </div>
      
      <div className="px-4 py-2 bg-black/20 border-t border-white/5 flex justify-between items-center">
        <div className="flex gap-2">
          {evidence.hero_image && <div className="w-4 h-4 rounded-full bg-accent/20 border border-accent/40" title="Hero Image Found" />}
        </div>
        <div className={`w-1.5 h-1.5 rounded-full ${evidence.status === 'success' ? 'bg-accent' : 'bg-white/10 animate-pulse'}`} />
      </div>
    </div>
  );
};

export default EvidenceCard;
