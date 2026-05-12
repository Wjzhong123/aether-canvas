"use client";

import React, { useState, useEffect } from 'react';
import { ExternalLink, Search, Play, Crosshair, Heart } from 'lucide-react';

interface EvidenceElement {
  tag: string;
  text: string;
  rect: { x: number; y: number; w: number; h: number };
}

interface Evidence {
  url: string;
  title: string;
  screenshot?: string;
  text?: string;
  palette?: string[];
  hero_image?: string;
  video_frames?: string[];
  elements?: EvidenceElement[];
  status: 'success' | 'error' | 'pending';
}

interface EvidenceCardProps {
  evidence: Evidence;
  activeLocator?: string;
  onFeedback?: (data: any) => void;
}

const EvidenceCard: React.FC<EvidenceCardProps> = ({ evidence, activeLocator, onFeedback }) => {
  const [highlight, setHighlight] = useState<EvidenceElement | null>(null);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (activeLocator && evidence.elements) {
      const match = evidence.elements.find(el => 
        el.text.toLowerCase().includes(activeLocator.toLowerCase()) || 
        activeLocator.toLowerCase().includes(el.text.toLowerCase())
      );
      setHighlight(match || null);
    } else {
      setHighlight(null);
    }
  }, [activeLocator, evidence.elements]);

  const handleLike = () => {
    setIsLiked(!isLiked);
    if (!isLiked && onFeedback) {
      onFeedback({
        url: evidence.url,
        title: evidence.title,
        type: "positive_interaction",
        timestamp: new Date().toISOString()
      });
    }
  };

  return (
    <div className={`glass group overflow-hidden border-white/10 hover:border-accent/50 transition-all duration-500 flex flex-col h-full bg-surface/50 ${highlight ? 'ring-2 ring-accent shadow-[0_0_30px_rgba(255,62,0,0.3)] scale-[1.02]' : ''}`}>
      <div className="flex h-1">
        {evidence.palette?.map((c, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: c }} />
        ))}
      </div>

      <div className="relative aspect-video overflow-hidden border-b border-white/5 bg-black">
        {evidence.screenshot ? (
          <img 
            src={`data:image/png;base64,${evidence.screenshot}`} 
            className={`w-full h-full object-cover transition-all duration-700 ${highlight ? 'opacity-100' : 'opacity-70 group-hover:opacity-90'}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Search className="w-8 h-8 text-white/10 animate-pulse" />
          </div>
        )}
        
        {highlight && (
          <div 
            className="absolute border-2 border-accent bg-accent/10 pointer-events-none z-10"
            style={{
              left: `${(highlight.rect.x / 1280) * 100}%`,
              top: `${(highlight.rect.y / 800) * 100}%`,
              width: `${(highlight.rect.w / 1280) * 100}%`,
              height: `${(highlight.rect.h / 800) * 100}%`,
            }}
          >
             <div className="absolute -top-6 -left-0.5 bg-accent text-black font-mono text-[8px] px-1 py-0.5 flex items-center gap-1 uppercase">
                <Crosshair className="w-2 h-2" /> PIXEL_ALIGNED
             </div>
          </div>
        )}

        <div className="absolute top-2 right-2 flex gap-2">
           <button onClick={handleLike} className={`p-2 glass rounded-full transition-all ${isLiked ? 'text-accent bg-accent/20' : 'text-white/40 hover:text-white'}`}>
              <Heart className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} />
           </button>
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
    </div>
  );
};

export default EvidenceCard;
