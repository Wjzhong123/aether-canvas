"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, Search, Crosshair, Heart, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  elements?: EvidenceElement[];
  importance?: number; // 0 to 1
}

interface EvidenceCardProps {
  evidence: Evidence;
  activeLocator?: string;
  onFeedback?: (data: any) => void;
  lang: 'zh' | 'en';
}

const EvidenceCard: React.FC<EvidenceCardProps> = ({ evidence, activeLocator, onFeedback, lang }) => {
  const [highlight, setHighlight] = useState<EvidenceElement | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgContainerRef = useRef<HTMLDivElement>(null);

  // Dynamic accent based on source palette or dominant color
  const sourceColor = evidence.palette?.[0] || (evidence as any).dominant_color || 'var(--accent)';

  useEffect(() => {
    if (activeLocator && evidence.elements) {
      const match = evidence.elements.find(el => 
        el.text.toLowerCase().includes(activeLocator.toLowerCase()) || 
        activeLocator.toLowerCase().includes(el.text.toLowerCase())
      );
      setHighlight(match || null);
      
      // Auto-scroll to evidence area
      if (match && imgContainerRef.current) {
        const x = (match.rect.x / 1280) * imgContainerRef.current.scrollWidth;
        const y = (match.rect.y / 800) * imgContainerRef.current.scrollHeight;
        imgContainerRef.current.scrollTo({
          left: x - imgContainerRef.current.clientWidth / 2,
          top: y - imgContainerRef.current.clientHeight / 2,
          behavior: 'smooth'
        });
      }
    } else {
      setHighlight(null);
    }
  }, [activeLocator, evidence.elements]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        zIndex: evidence.importance && evidence.importance > 0.8 ? 20 : 10,
        boxShadow: evidence.importance && evidence.importance > 0.8 ? `0 20px 80px rgba(0,0,0,0.8)` : `0 4px 20px rgba(0,0,0,0.3)`
      }}
      whileHover={{ scale: 1.02, zIndex: 30 }}
      className={`relative group overflow-hidden border transition-all duration-700 flex flex-col h-full bg-black/40 backdrop-blur-xl ${highlight ? 'border-accent shadow-[0_0_50px_rgba(var(--accent-rgb),0.3)]' : 'border-white/10 hover:border-white/30'}`}
      style={{ 
        borderColor: highlight ? sourceColor : undefined,
      }}
    >
      {/* Noise Filter Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-50" />

      {/* Swiss Style Color Bar */}
      <div className="flex h-[2px]">
        {evidence.palette?.map((c, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: c }} />
        ))}
      </div>

      <div ref={imgContainerRef} className="relative aspect-[16/10] overflow-hidden bg-black/80">
        {evidence.screenshot ? (
          <>
            <motion.img 
              initial={{ filter: 'grayscale(100%)' }}
              animate={{ filter: highlight ? 'grayscale(0%)' : 'grayscale(100%)' }}
              whileHover={{ filter: 'grayscale(0%)' }}
              src={`data:image/png;base64,${evidence.screenshot}`} 
              className="w-full h-full object-cover transition-all duration-1000 opacity-60 group-hover:opacity-100" 
            />
            {/* Dynamic Spotlight Mask */}
            <AnimatePresence>
              {highlight && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 pointer-events-none"
                >
                  <svg className="w-full h-full">
                    <defs>
                      <mask id={`mask-${evidence.url.slice(-8)}`}>
                        <rect width="100%" height="100%" fill="white" fillOpacity="0.4" />
                        <rect 
                          x={`${(highlight.rect.x / 1280) * 100}%`} 
                          y={`${(highlight.rect.y / 800) * 100}%`} 
                          width={`${(highlight.rect.w / 1280) * 100}%`} 
                          height={`${(highlight.rect.h / 800) * 100}%`} 
                          fill="black" 
                        />
                      </mask>
                    </defs>
                    <rect width="100%" height="100%" fill="black" fillOpacity="0.7" mask={`url(#mask-${evidence.url.slice(-8)})`} />
                  </svg>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
             <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-white/5 border-t-accent animate-spin" />
                <div className="label-mono text-[8px] text-accent animate-pulse uppercase tracking-[0.3em]">Penetrating_DOM...</div>
             </div>
          </div>
        )}
        
        {/* Pixel Alignment Box */}
        <AnimatePresence>
          {highlight && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute border-2 z-20 pointer-events-none" 
              style={{ 
                borderColor: sourceColor,
                left: `${(highlight.rect.x / 1280) * 100}%`, 
                top: `${(highlight.rect.y / 800) * 100}%`, 
                width: `${(highlight.rect.w / 1280) * 100}%`, 
                height: `${(highlight.rect.h / 800) * 100}%`,
                boxShadow: `0 0 25px ${sourceColor}`
              }}
            >
               <div className="absolute -top-6 left-0 text-black font-mono text-[8px] px-2 py-0.5 uppercase tracking-tighter whitespace-nowrap" style={{ backgroundColor: sourceColor }}>
                  <Crosshair className="w-3 h-3 inline mr-1 animate-spin-slow" /> {lang === 'zh' ? '像素审计锁定' : 'PIXEL_AUDIT_LOCKED'}
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute top-4 right-4 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 z-30">
           <button onClick={() => { setIsLiked(!isLiked); if(!isLiked) onFeedback?.(evidence); }} className={`p-3 glass-panel rounded-xl transition-all shadow-xl ${isLiked ? 'text-accent border-accent/40 bg-accent/10' : 'text-white/40 hover:text-white border-white/5'}`}>
              <Heart className="w-5 h-5" fill={isLiked ? "currentColor" : "none"} />
           </button>
           <a href={evidence.url} target="_blank" rel="noreferrer" className="p-3 glass-panel rounded-xl hover:bg-accent/20 transition-all text-white/40 hover:text-white border-white/5 shadow-xl"><ExternalLink className="w-5 h-5" /></a>
        </div>
      </div>
      
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-white/10 text-white/50 uppercase tracking-widest bg-white/5">
              {(() => {
                try { return new URL(evidence.url).hostname.replace('www.', ''); }
                catch { return 'SOURCE'; }
              })()}
            </span>
            {evidence.importance && evidence.importance > 0.8 && (
              <motion.span 
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-[9px] font-bold px-2 py-0.5 rounded text-black bg-accent uppercase tracking-widest"
              >
                CRITICAL_EVIDENCE
              </motion.span>
            )}
          </div>
          <h3 className="font-bauhaus text-xl md:text-2xl leading-[1.1] mb-4 text-white/95 group-hover:text-accent transition-colors duration-700 tracking-tighter uppercase line-clamp-2">{evidence.title || "DECODING_INTENT..."}</h3>
        </div>
        
        <div className="relative">
          <p className="text-white/40 text-[12px] line-clamp-3 font-mono leading-relaxed lowercase mb-6 italic">
            {evidence.text || "Synchronizing with Nexus nodes to extract multidimensional truth clusters..."}
          </p>
          <div className="flex items-center justify-between pt-5 border-t border-white/5">
            <div className="flex gap-1.5">
               {evidence.palette?.slice(0, 4).map((c, i) => (
                 <div key={i} className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: c }} />
               ))}
            </div>
            <div className="flex items-center gap-4 text-white/5 group-hover:text-accent/40 transition-colors">
               <div className="label-mono text-[8px] opacity-0 group-hover:opacity-100 transition-opacity">{(evidence as any).layout_hint || 'STANDARD'}</div>
               <Eye className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EvidenceCard;
