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

  // Dynamic accent based on source palette
  const sourceColor = evidence.palette?.[0] || 'var(--accent)';

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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className={`relative group overflow-hidden border transition-all duration-700 flex flex-col h-full bg-black/40 backdrop-blur-xl ${highlight ? 'border-accent shadow-[0_0_30px_rgba(var(--accent-rgb),0.2)]' : 'border-white/10 hover:border-white/30'}`}
      style={{ 
        borderColor: highlight ? sourceColor : undefined,
        boxShadow: highlight ? `0 0 40px ${sourceColor}33` : undefined
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

      <div className="relative aspect-[16/10] overflow-hidden bg-black/80">
        {evidence.screenshot ? (
          <motion.img 
            initial={{ filter: 'grayscale(100%)' }}
            animate={{ filter: highlight ? 'grayscale(0%)' : 'grayscale(100%)' }}
            whileHover={{ filter: 'grayscale(0%)' }}
            src={`data:image/png;base64,${evidence.screenshot}`} 
            className="w-full h-full object-cover transition-all duration-1000 opacity-60 group-hover:opacity-100" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-2 border-white/5 border-t-accent animate-spin" />
          </div>
        )}
        
        {/* Pixel Alignment Box */}
        <AnimatePresence>
          {highlight && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute border-2 z-10 pointer-events-none" 
              style={{ 
                borderColor: sourceColor,
                left: `${(highlight.rect.x / 1280) * 100}%`, 
                top: `${(highlight.rect.y / 800) * 100}%`, 
                width: `${(highlight.rect.w / 1280) * 100}%`, 
                height: `${(highlight.rect.h / 800) * 100}%`,
                boxShadow: `0 0 15px ${sourceColor}`
              }}
            >
               <div className="absolute -top-5 left-0 text-black font-mono text-[7px] px-1 py-0.5 uppercase tracking-tighter" style={{ backgroundColor: sourceColor }}>
                  <Crosshair className="w-2 h-2 inline mr-1" /> {lang === 'zh' ? '像素审计成功' : 'AUDIT_SUCCESS'}
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
           <button onClick={() => { setIsLiked(!isLiked); if(!isLiked) onFeedback?.(evidence); }} className={`p-2 glass-panel rounded-lg transition-all ${isLiked ? 'text-accent' : 'text-white/40 hover:text-white'}`}>
              <Heart className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} />
           </button>
           <a href={evidence.url} target="_blank" rel="noreferrer" className="p-2 glass-panel rounded-lg hover:bg-accent/20 transition-colors text-white/40 hover:text-white"><ExternalLink className="w-4 h-4" /></a>
        </div>
      </div>
      
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border border-white/10 text-white/40 uppercase tracking-widest bg-white/5">
              {new URL(evidence.url).hostname.replace('www.', '')}
            </span>
            {evidence.importance && evidence.importance > 0.8 && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded text-black bg-accent uppercase tracking-widest">Crucial</span>
            )}
          </div>
          <h3 className="font-bauhaus text-xl leading-tight mb-3 text-white/90 group-hover:text-accent transition-colors duration-500">{evidence.title || "Extracting Knowledge..."}</h3>
        </div>
        
        <div className="relative">
          <p className="text-white/40 text-[11px] line-clamp-3 font-mono leading-relaxed lowercase mb-4 italic">
            {evidence.text || "Scanning DOM architecture for evidence clusters..."}
          </p>
          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <div className="flex gap-1">
               {evidence.palette?.slice(0, 3).map((c, i) => (
                 <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
               ))}
            </div>
            <Eye className="w-3 h-3 text-white/5 group-hover:text-accent/30 transition-colors" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EvidenceCard;
