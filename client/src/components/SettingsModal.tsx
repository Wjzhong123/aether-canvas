"use client";

import React, { useState, useEffect } from 'react';
import { X, Save, Shield, Cpu, Languages, Plus, Trash2, AlertCircle, Key, Check, Zap, Sliders, Globe, Activity, BookmarkPlus } from 'lucide-react';
import { locales, LocaleType } from '../locales';

interface ProviderConfig {
  key: string;
  baseUrl?: string;
}

interface SavedModel {
  name: string;
  id: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: LocaleType;
  setLang: (lang: LocaleType) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentLang, setLang }) => {
  const [activeTab, setActiveTab] = useState<'models' | 'providers' | 'identity'>('providers');
  const [keys, setKeys] = useState<Record<string, ProviderConfig>>({
    OPENAI_API_KEY: { key: '', baseUrl: 'https://api.openai.com/v1' },
    DEEPSEEK_API_KEY: { key: '', baseUrl: 'https://api.deepseek.com' },
  });
  
  const [identity, setIdentity] = useState({ 
    name: 'Aether', 
    role: 'CEO', 
    motto: '', 
    theme: 'swiss',
    premiumModel: 'gpt-4o',
    cheapModel: 'deepseek/deepseek-chat',
    temperature: 0.7
  });
  
  const [savedModels, setSavedModels] = useState<SavedModel[]>([]);
  const [newModelName, setNewModelName] = useState('');
  const [newModelId, setNewModelId] = useState('');
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  
  const t = locales[currentLang];

  const modelPresets = [
    { label: 'GPT-4o (Premium)', value: 'gpt-4o' },
    { label: 'GPT-4o Mini (Fast)', value: 'gpt-4o-mini' },
    { label: 'DeepSeek Chat', value: 'deepseek/deepseek-chat' },
    { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20240620' },
    { label: 'Zhipu GLM-4', value: 'zhipuai/glm-4' },
    { label: 'NVIDIA Llama 3', value: 'nvidia_nim/meta/llama3-70b-instruct' },
    ...savedModels.map(m => ({ label: `[${currentLang === 'zh' ? '库' : 'LIB'}] ${m.name}`, value: m.id }))
  ];

  useEffect(() => {
    // Load Keys
    const savedKeys = localStorage.getItem('aether_keys_v2');
    if (savedKeys) {
      try {
        const parsed = JSON.parse(savedKeys);
        const sanitized: Record<string, ProviderConfig> = {};
        Object.entries(parsed).forEach(([k, v]) => {
          if (v && typeof v === 'object') {
            sanitized[k] = { 
              key: (v as any).key || '', 
              baseUrl: (v as any).baseUrl || '' 
            };
          }
        });
        setKeys(sanitized);
      } catch (e) {}
    }

    // Load Identity
    const savedIdentity = localStorage.getItem('agent_identity');
    if (savedIdentity) {
      try {
        const parsed = JSON.parse(savedIdentity);
        setIdentity({
          ...identity,
          ...parsed,
          temperature: parsed.temperature ?? 0.7
        });
      } catch (e) {}
    }

    // Load Saved Models
    const savedCustomModels = localStorage.getItem('aether_custom_models');
    if (savedCustomModels) {
      try { setSavedModels(JSON.parse(savedCustomModels)); } catch(e) {}
    }
  }, [isOpen]);

  const handleSave = () => {
    setSaveStatus('saving');
    localStorage.setItem('aether_keys_v2', JSON.stringify(keys));
    localStorage.setItem('agent_identity', JSON.stringify(identity));
    localStorage.setItem('aether_custom_models', JSON.stringify(savedModels));

    window.dispatchEvent(new CustomEvent('aether_update_identity', { detail: identity }));
    
    setTimeout(() => {
      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus('idle');
        onClose();
      }, 800);
    }, 500);
  };

  const addModelToLibrary = () => {
    if (newModelName && newModelId) {
      const updated = [...savedModels, { name: newModelName, id: newModelId }];
      setSavedModels(updated);
      setNewModelName('');
      setNewModelId('');
      setIsAddingModel(false);
    }
  };

  const removeModel = (id: string) => {
    setSavedModels(savedModels.filter(m => m.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="glass-panel w-full max-w-2xl h-[700px] flex flex-col relative overflow-hidden shadow-2xl border border-white/10 animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-widest text-white uppercase">{t.settings}</h2>
              <p className="text-[8px] font-mono text-accent/40 uppercase">AETHER_SYNC // ACTIVE</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/50 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white/5 p-1 mx-6 mt-6 rounded-xl border border-white/5">
          <button 
            onClick={() => setActiveTab('providers')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'providers' ? 'bg-accent text-black shadow-lg' : 'text-white/40 hover:text-white/60'}`}
          >
            <Key className="w-3 h-3" /> {t.tabs.providers}
          </button>
          <button 
            onClick={() => setActiveTab('models')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'models' ? 'bg-accent text-black shadow-lg' : 'text-white/40 hover:text-white/60'}`}
          >
            <Cpu className="w-3 h-3" /> {t.tabs.models}
          </button>
          <button 
            onClick={() => setActiveTab('identity')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'identity' ? 'bg-accent text-black shadow-lg' : 'text-white/40 hover:text-white/60'}`}
          >
            <Activity className="w-3 h-3" /> {t.tabs.identity}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Tab 1: Providers & Keys */}
          {activeTab === 'providers' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-tighter">{t.auth_matrix}</p>
                <button onClick={() => {
                  const name = prompt(t.provider_prompt);
                  if (name) setKeys({...keys, [name.trim().toUpperCase()]: { key: '', baseUrl: '' }});
                }} className="text-[10px] font-bold text-accent hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> {t.add_provider}
                </button>
              </div>

              <div className="space-y-4">
                {Object.entries(keys).map(([name, config]) => (
                  <div key={name} className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-4 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                        <span className="text-[9px] font-mono text-accent font-bold tracking-widest">{name}</span>
                      </div>
                      <button onClick={() => removeKey(name)} className="opacity-0 group-hover:opacity-100 text-red-500/50 hover:text-red-500 transition-all">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[8px] text-white/20 uppercase font-bold">{t.secret_key}</label>
                        <input 
                          type="password"
                          className="w-full bg-black/40 border border-white/5 rounded-lg p-2 font-mono text-[10px] text-white outline-none focus:border-accent/40"
                          value={config?.key || ''}
                          onChange={(e) => setKeys({...keys, [name]: { ...config, key: e.target.value }})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] text-white/20 uppercase font-bold">{t.base_endpoint}</label>
                        <input 
                          type="text"
                          className="w-full bg-black/40 border border-white/5 rounded-lg p-2 font-mono text-[10px] text-white/40 outline-none focus:border-accent/40"
                          value={config?.baseUrl || ''}
                          placeholder={currentLang === 'zh' ? '默认地址' : 'Standard API'}
                          onChange={(e) => setKeys({...keys, [name]: { ...config, baseUrl: e.target.value }})}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Models & Custom Library */}
          {activeTab === 'models' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-accent/80 uppercase tracking-tighter flex items-center gap-2">
                    <Zap className="w-3 h-3" /> {t.premiumModel}
                  </label>
                  <select 
                    value={identity.premiumModel}
                    onChange={(e) => setIdentity({ ...identity, premiumModel: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-mono text-white outline-none appearance-none"
                  >
                    {modelPresets.map(p => <option key={p.value} value={p.value} className="bg-[#0a0a0a]">{p.label}</option>)}
                    <option value="manual_override" className="bg-[#0a0a0a]">{t.customModel}</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-accent/80 uppercase tracking-tighter flex items-center gap-2">
                    <Activity className="w-3 h-3" /> {t.cheapModel}
                  </label>
                  <select 
                    value={identity.cheapModel}
                    onChange={(e) => setIdentity({ ...identity, cheapModel: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-mono text-white outline-none appearance-none"
                  >
                    {modelPresets.map(p => <option key={p.value} value={p.value} className="bg-[#0a0a0a]">{p.label}</option>)}
                    <option value="manual_override" className="bg-[#0a0a0a]">{t.customModel}</option>
                  </select>
                </div>
              </div>

              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <BookmarkPlus className="w-4 h-4 text-accent" /> {t.model_library}
                  </h3>
                  {!isAddingModel ? (
                    <button onClick={() => setIsAddingModel(true)} className="text-[10px] font-bold text-accent hover:underline uppercase">
                      {t.register_new}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <input 
                        placeholder={t.model_name_label}
                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-mono text-white outline-none w-32"
                        value={newModelName}
                        onChange={(e) => setNewModelName(e.target.value)}
                      />
                      <input 
                        placeholder={t.model_id_label}
                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-mono text-white outline-none w-32"
                        value={newModelId}
                        onChange={(e) => setNewModelId(e.target.value)}
                      />
                      <button onClick={addModelToLibrary} className="text-accent"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setIsAddingModel(false)} className="text-white/20"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {savedModels.length === 0 && (
                    <div className="col-span-full py-8 text-center border border-dashed border-white/10 rounded-xl">
                      <p className="text-[10px] text-white/20 uppercase tracking-widest italic">{currentLang === 'zh' ? '仓库空空如也 // 请在上方登记模型' : 'Library Empty // Add Custom Models Above'}</p>
                    </div>
                  )}
                  {savedModels.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl group hover:border-accent/30 transition-all">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-white/80">{m.name}</span>
                        <span className="text-[8px] font-mono text-white/20">{m.id}</span>
                      </div>
                      <button onClick={() => removeModel(m.id)} className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-accent/5 border border-accent/20 rounded-2xl space-y-6">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-accent uppercase flex items-center gap-2">
                    <Sliders className="w-3 h-3" /> {t.cognitive_temp}
                  </label>
                  <span className="text-xs font-mono text-accent">{identity.temperature.toFixed(2)}</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.01"
                  className="w-full accent-accent bg-white/10 h-1 rounded-lg cursor-pointer"
                  value={identity.temperature}
                  onChange={(e) => setIdentity({ ...identity, temperature: parseFloat(e.target.value) })}
                />
                <div className="flex justify-between text-[8px] text-accent/40 font-mono uppercase">
                  <span>{t.deterministic}</span>
                  <span>{t.creative}</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Identity & Language */}
          {activeTab === 'identity' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t.lang_pref}</label>
                  <div className="flex gap-2">
                    {(['zh', 'en'] as LocaleType[]).map(l => (
                      <button 
                        key={l}
                        onClick={() => setLang(l)}
                        className={`flex-1 py-3 font-mono text-[10px] font-bold rounded-xl border transition-all ${currentLang === l ? 'bg-white text-black border-white shadow-lg shadow-white/10' : 'border-white/10 text-white/40 hover:border-white/30'}`}
                      >
                        {l === 'zh' ? '中文 (ZH)' : 'ENGLISH (EN)'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t.agent_name}</label>
                  <input 
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 font-mono text-xs text-white outline-none focus:border-white/20"
                    value={identity.name}
                    onChange={(e) => setIdentity({...identity, name: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t.motto_mission}</label>
                <textarea 
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 font-mono text-xs text-white min-h-[120px] outline-none focus:border-white/20"
                  value={identity.motto}
                  onChange={(e) => setIdentity({...identity, motto: e.target.value})}
                />
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-black border-t border-white/10 flex justify-end gap-4">
          <button onClick={onClose} className="px-6 py-2 text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest transition-colors">{t.cancel}</button>
          <button 
            onClick={handleSave} 
            disabled={saveStatus !== 'idle'}
            className={`min-w-[140px] px-8 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-3 transition-all duration-300 ${saveStatus === 'success' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-accent text-black hover:sci-fi-glow'}`}
          >
            {saveStatus === 'saving' ? t.syncing : saveStatus === 'success' ? t.synced : t.persist}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
