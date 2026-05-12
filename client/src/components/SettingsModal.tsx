"use client";

import React, { useState, useEffect } from 'react';
import { X, Save, Shield, Cpu } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [keys, setKeys] = useState({ openai: '', deepseek: '' });

  useEffect(() => {
    const saved = localStorage.getItem('aether_keys');
    if (saved) setKeys(JSON.parse(saved));
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('aether_keys', JSON.stringify(keys));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-xl">
      <div className="glass w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-accent/5">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-accent" />
            <h2 className="text-bauhaus text-2xl tracking-tighter uppercase">Model_Management</h2>
          </div>
          <button onClick={onClose} className="hover:rotate-90 transition-transform duration-300">
            <X className="w-6 h-6 text-white/50 hover:text-white" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          <div className="space-y-4">
            <label className="font-mono text-[10px] text-white/30 uppercase tracking-[0.4em] flex items-center gap-2">
              <Cpu className="w-3 h-3" /> OpenAI_API_KEY
            </label>
            <input 
              type="password"
              placeholder="sk-..."
              className="w-full bg-white/5 border border-white/10 p-4 font-mono text-sm outline-none focus:border-accent transition-colors"
              value={keys.openai}
              onChange={(e) => setKeys({...keys, openai: e.target.value})}
            />
            <p className="text-[10px] font-mono text-white/10">USED FOR PREMIUM AUDITING AND SYNTHESIS (GPT-4O)</p>
          </div>

          <div className="space-y-4">
            <label className="font-mono text-[10px] text-white/30 uppercase tracking-[0.4em] flex items-center gap-2">
              <Cpu className="w-3 h-3" /> DeepSeek_API_KEY
            </label>
            <input 
              type="password"
              placeholder="sk-..."
              className="w-full bg-white/5 border border-white/10 p-4 font-mono text-sm outline-none focus:border-accent transition-colors"
              value={keys.deepseek}
              onChange={(e) => setKeys({...keys, deepseek: e.target.value})}
            />
            <p className="text-[10px] font-mono text-white/10">USED FOR ATOMIC INTENT DECOMPOSITION AND PLANNING</p>
          </div>
        </div>

        <div className="p-6 bg-black/50 border-t border-white/10 flex justify-end gap-4">
          <button onClick={onClose} className="px-6 py-2 font-mono text-xs text-white/50 hover:text-white transition-colors">CANCEL</button>
          <button onClick={handleSave} className="bg-accent text-black px-8 py-2 font-bauhaus text-xl flex items-center gap-2 hover:bg-white transition-colors">
            <Save className="w-5 h-5" /> PERSIST
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
