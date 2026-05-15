'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Key, Image as ImageIcon, Upload, CheckCircle2, Info, Loader2, Trash2, Sparkles, Copy, ExternalLink, AlertCircle, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase';

interface AvatarAsset {
  id: string;
  public_url: string;
  name?: string;
  created_at: string;
}

interface AvatarHubProps {
  onSelect: (config: any) => void;
  onBack?: () => void;
  projectId: string;
  currentConfig?: any;
}

export default function AvatarHub({ onSelect, onBack, projectId, currentConfig }: AvatarHubProps) {
  const t = useTranslations('profile');
  const common = useTranslations('common');
  const [activeTab, setActiveTab] = useState<'stock' | 'byok' | 'photo'>(currentConfig?.mode || 'stock');
  const [selectedAsset, setSelectedAsset] = useState<string | null>(currentConfig?.assetId || null);
  
  // Real Assets State
  const [assets, setAssets] = useState<AvatarAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Prompt Generator State
  const [showPromptGenerator, setShowPromptGenerator] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const STOCK_AVATARS = [
    { id: 'stock_1', name: 'Mark', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&h=1000&auto=format&fit=facearea&facepad=2' },
    { id: 'stock_2', name: 'Sarah', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1000&h=1000&auto=format&fit=facearea&facepad=2' },
    { id: 'stock_3', name: 'David', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1000&h=1000&auto=format&fit=facearea&facepad=2' },
    { id: 'stock_4', name: 'Elena', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000&h=1000&auto=format&fit=facearea&facepad=2' },
    { id: 'stock_5', name: 'James', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1000&h=1000&auto=format&fit=facearea&facepad=2' },
    { id: 'stock_6', name: 'Aisha', url: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=1000&h=1000&auto=format&fit=facearea&facepad=2' },
    { id: 'stock_7', name: 'Lucas', url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=1000&h=1000&auto=format&fit=facearea&facepad=2' },
    { id: 'stock_8', name: 'Sofia', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=1000&h=1000&auto=format&fit=facearea&facepad=2' }
  ];

  const handleConfirm = () => {
    if (!selectedAsset) return;
    
    let url = null;
    if (activeTab === 'stock') {
      url = STOCK_AVATARS.find(a => a.id === selectedAsset)?.url || null;
    } else if (activeTab === 'photo') {
      url = assets.find(a => a.id === selectedAsset)?.public_url || null;
    }

    onSelect({ 
      mode: activeTab === 'photo' ? 'fal' : activeTab, 
      assetId: selectedAsset,
      photoUrl: url
    });
  };

  // Fetch Assets when "photo" tab is active
  useEffect(() => {
    if (activeTab === 'photo') {
      fetchAssets();
    }
  }, [activeTab]);

  const fetchAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('media_assets')
        .select('*')
        .eq('project_id', projectId) // Use project_id as per schema_v2.sql
        .eq('asset_type', 'image')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssets(data || []);
    } catch (err: any) {
      console.error('Error fetching assets:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 1. Upload to Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      // 3. Register in media_assets table
      const { data: asset, error: dbError } = await supabase
        .from('media_assets')
        .insert({
          project_id: projectId,
          public_url: publicUrl,
          file_path: filePath,
          asset_type: 'image',
          metadata: { name: file.name, size: file.size }
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setAssets(prev => [asset, ...prev]);
      setSelectedAsset(asset.id);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAsset = async (e: React.MouseEvent, asset: AvatarAsset) => {
    e.stopPropagation();
    if (!confirm('Удалить это фото навсегда?')) return;

    try {
      // 1. Delete from Storage
      if ((asset as any).file_path) {
        await supabase.storage
          .from('media')
          .remove([(asset as any).file_path]);
      }

      // 2. Delete from DB
      const { error } = await supabase
        .from('media_assets')
        .delete()
        .eq('id', asset.id);

      if (error) throw error;

      // 3. Update State
      setAssets(prev => prev.filter(a => a.id !== asset.id));
      if (selectedAsset === asset.id) setSelectedAsset(null);
      if ('vibrate' in navigator) navigator.vibrate(50);
    } catch (err: any) {
      console.error('Delete failed:', err);
      alert('Не удалось удалить: ' + err.message);
    }
  };

  const handleGeneratePrompt = async () => {
    if (!promptInput.trim()) return;
    setIsGeneratingPrompt(true);
    setGeneratedPrompt(null);
    try {
      const res = await fetch('/api/ai/avatar-prompt', {
        method: 'POST',
        body: JSON.stringify({ description: promptInput, locale: common('locale') })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGeneratedPrompt(data.prompt);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleCopy = () => {
    if (!generatedPrompt) return;
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: 'stock', title: t('avatarStockTitle'), icon: User },
    { id: 'byok', title: t('avatarByokTitle'), icon: Key },
    { id: 'photo', title: t('avatarPhotoTitle'), icon: ImageIcon },
  ];

  return (
    <div className="h-full w-full flex flex-col bg-[#050508] relative">
      {/* Premium Header */}
      <div className="p-8 pb-4 flex items-center justify-between">
        <div>
           <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white leading-none">
             SELECT AI<br/>
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">PERSONA</span>
           </h1>
           <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20 mt-2">Archetype Selection Engine</p>
        </div>
        
        {onBack && (
          <button 
            onClick={onBack}
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all hover:bg-white/10"
          >
             <AlertCircle className="rotate-45" size={20} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-8 space-y-8 custom-scrollbar pb-40">
      {/* Tab Switcher */}
      <div className="flex p-1 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-300 relative",
              activeTab === tab.id ? "text-white" : "text-white/40 hover:text-white/60"
            )}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="active-tab"
                className="absolute inset-0 bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.1)] blur-[1px]"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <tab.icon className="w-4 h-4 relative z-10" />
            <span className="text-sm font-medium relative z-10">{tab.title}</span>
          </button>
        ))}
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto px-1 min-h-0 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="space-y-6"
          >
            {activeTab === 'stock' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {STOCK_AVATARS.map((item) => (
                    <button 
                      key={item.id}
                      onClick={() => setSelectedAsset(item.id)}
                      className={clsx(
                        "aspect-[3/4] rounded-[2rem] overflow-hidden transition-all duration-500 relative group border-2",
                        selectedAsset === item.id ? "border-purple-500 scale-[1.02] shadow-2xl shadow-purple-500/20" : "border-white/5 grayscale-[0.3] hover:grayscale-0 hover:border-white/20"
                      )}
                    >
                      <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/90 italic">{item.name}</p>
                      </div>
                      {selectedAsset === item.id && (
                        <div className="absolute top-4 right-4 text-white bg-purple-500 rounded-full p-1 shadow-xl">
                          <CheckCircle2 className="w-4 h-4" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
            )}

            {activeTab === 'byok' && (
              <div className="space-y-6 max-w-xl mx-auto py-10">
                <div className="p-10 rounded-[3rem] bg-gradient-to-br from-purple-600/10 via-blue-600/5 to-transparent border border-white/10 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Key size={80} />
                  </div>
                  
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-purple-400">
                      <Key size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">HeyGen BYOK</h3>
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/20">Bring Your Own Key Integration</p>
                    </div>
                  </div>

                  <p className="text-xs text-white/40 leading-relaxed font-bold uppercase tracking-widest mb-8">
                    {t('heygenKeyHint') || 'Unlock direct access to your HeyGen personas. Synthesis costs will be billed to your HeyGen account.'}
                  </p>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] pl-1">
                      HeyGen API Key
                    </label>
                    <div className="relative">
                      <input 
                        type="password"
                        placeholder="sk_..."
                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-white placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all font-mono text-sm shadow-inner"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-purple-500/10 text-purple-400 text-[8px] font-black uppercase tracking-widest border border-purple-500/20">
                        Secure
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-6 text-[9px] text-white/20 font-black uppercase tracking-widest pl-1">
                      <Info className="w-4 h-4 text-purple-500/40" />
                      <span>Cost per render: 0 Credits (Billed via HeyGen)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'photo' && (
              <div className="space-y-6">
                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-200 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <p>{error}</p>
                  </div>
                )}

                {/* Prompt Helper Removed per user request */}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={clsx(
                      "aspect-[3/4] rounded-[2rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-white/[0.03] hover:border-white/10 transition-all group relative overflow-hidden",
                      uploading && "pointer-events-none opacity-50"
                    )}
                  >
                    {uploading ? (
                      <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-all border border-white/5 shadow-2xl">
                          <Plus className="w-6 h-6 text-white/40" />
                        </div>
                        <div className="text-center">
                          <span className="text-[10px] font-black text-white/60 uppercase tracking-widest block">{t('uploadPhoto') || 'Upload Photo'}</span>
                          <span className="text-[7px] font-bold text-white/20 uppercase tracking-widest mt-1 block">JPG / PNG Supported</span>
                        </div>
                      </>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>
                  
                  {/* Real Library Assets */}
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="aspect-[3/4] rounded-[2rem] bg-white/5 animate-pulse border border-white/5" />
                    ))
                  ) : (
                    assets.map((asset) => (
                      <button 
                        key={asset.id}
                        onClick={() => setSelectedAsset(asset.id)}
                        className={clsx(
                          "aspect-[3/4] rounded-[2rem] overflow-hidden transition-all duration-500 relative group border-2",
                          selectedAsset === asset.id ? "border-purple-500 scale-[1.02] shadow-2xl shadow-purple-500/20" : "border-white/5 grayscale-[0.3] hover:grayscale-0 hover:border-white/20"
                        )}
                      >
                        <img src={asset.public_url} alt="Library Photo" className="w-full h-full object-cover" />
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-white/90 italic">User Photo</p>
                        </div>

                        {selectedAsset === asset.id && (
                          <div className="absolute top-4 right-4 text-white bg-purple-500 rounded-full p-1 shadow-xl">
                            <CheckCircle2 className="w-4 h-4" strokeWidth={3} />
                          </div>
                        )}
                        
                        {/* Delete Button */}
                        <button 
                          onClick={(e) => handleDeleteAsset(e, asset)}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-white/40 hover:text-red-400 hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100 z-30"
                        >
                          <Trash2 size={14} />
                        </button>

                      </button>
                    ))
                  )}
                </div>

                {!loading && assets.length === 0 && !error && (
                  <div className="flex flex-col items-center justify-center py-12 text-white/20">
                    <ImageIcon className="w-12 h-12 mb-3 opacity-10" />
                    <p className="text-sm italic">{t('libraryEmpty')}</p>
                  </div>
                )}

                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3">
                  <Info className="w-5 h-5 text-white/40 shrink-0" />
                  <p className="text-xs text-white/50 leading-relaxed">
                    {t('photoHelp')}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>


      {/* Fixed Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-8 flex items-center justify-between bg-[#0a0a14]/95 backdrop-blur-2xl border-t border-white/5 z-[200]">
         <div className="flex items-center gap-3">
            <div className={clsx(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
              selectedAsset ? "bg-green-500/10 text-green-500" : "bg-white/5 text-white/10"
            )}>
              <CheckCircle2 size={20} strokeWidth={selectedAsset ? 3 : 2} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                {selectedAsset ? 'Облик выбран' : 'Выберите персонажа'}
              </span>
              <span className="text-[7px] font-bold text-white/20 uppercase tracking-widest">
                {selectedAsset ? 'Ready for AI Synthesis' : 'Please select an identity above'}
              </span>
            </div>
         </div>
         <button
           onClick={handleConfirm}
           disabled={!selectedAsset}
           className="px-12 py-5 rounded-[2rem] bg-white text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-white/90 disabled:opacity-20 disabled:grayscale transition-all active:scale-95 shadow-2xl shadow-white/10"
         >
           Выбрать персонажа
         </button>
      </div>
    </div>
  );
}
