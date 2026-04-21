'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Key, Image as ImageIcon, Upload, CheckCircle2, Info, Loader2, AlertCircle, Sparkles, Copy, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase';

interface AvatarAsset {
  id: string;
  url: string;
  name?: string;
  created_at: string;
}

interface AvatarHubProps {
  onSelect: (config: any) => void;
  currentConfig?: any;
}

export default function AvatarHub({ onSelect, currentConfig }: AvatarHubProps) {
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

  // Sync state with parent
  useEffect(() => {
    onSelect({ mode: activeTab, assetId: selectedAsset });
  }, [activeTab, selectedAsset]);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('media_assets')
        .select('*')
        .eq('user_id', user.id)
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
          user_id: user.id,
          url: publicUrl,
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
    <div className="w-full space-y-6">
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

      {/* Content Area */}
      <div className="min-h-[300px]">
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
                {[1, 2, 3, 4, 1, 2, 3, 4].map((i, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setSelectedAsset(`stock_${idx}`)}
                    className={clsx(
                      "aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 relative group",
                      selectedAsset === `stock_${idx}` ? "ring-2 ring-white/50 scale-[1.02]" : "ring-1 ring-white/10 grayscale-[0.3] hover:grayscale-0"
                    )}
                  >
                    <img src={`https://picsum.photos/seed/${idx+10}/300/400`} alt="Avatar" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                      <p className="text-xs text-white/80 font-medium">Avatar Model {idx + 1}</p>
                    </div>
                    {selectedAsset === `stock_${idx}` && (
                      <div className="absolute top-2 right-2 text-white bg-black/40 rounded-full p-1 backdrop-blur-md">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'byok' && (
              <div className="space-y-4 p-6 bg-white/5 rounded-3xl border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <Key className="w-6 h-6 text-white/60" />
                  <h3 className="text-lg font-semibold">{t('avatarByokTitle')}</h3>
                </div>
                <p className="text-sm text-white/50 leading-relaxed italic">
                  {t('heygenKeyHint')}
                </p>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/30 uppercase tracking-widest pl-1">
                    {t('heygenKeyLabel')}
                  </label>
                  <input 
                    type="password"
                    placeholder={t('heygenKeyPlaceholder')}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-mono text-sm"
                  />
                  <div className="flex items-center gap-2 mt-4 text-[11px] text-white/40 uppercase tracking-wider pl-1">
                    <Info className="w-3 h-3" />
                    <span>Cost per render: Standard HeyGen API rate</span>
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

                {/* Prompt Helper Section */}
                <div className="mb-6">
                  <button
                    onClick={() => setShowPromptGenerator(!showPromptGenerator)}
                    className="flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white/90 transition-colors group"
                    id="toggle-prompt-wizard"
                  >
                    <Sparkles className={clsx("w-4 h-4 transition-transform", showPromptGenerator && "rotate-12")} />
                    <span>{t('promptHelperTitle')}</span>
                  </button>

                  <AnimatePresence>
                    {showPromptGenerator && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 p-5 rounded-3xl border border-white/10 bg-white/5 space-y-4 shadow-2xl backdrop-blur-xl">
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-white/80">{t('promptHelperTitle')}</h4>
                            <p className="text-[11px] text-white/40 leading-relaxed">{t('promptHelperSub')}</p>
                          </div>
                          
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={promptInput}
                              onChange={(e) => setPromptInput(e.target.value)}
                              placeholder={t('promptHelperPlaceholder')}
                              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:ring-1 focus:ring-white/20 transition-all"
                              onKeyDown={(e) => e.key === 'Enter' && handleGeneratePrompt()}
                            />
                            <button
                              onClick={handleGeneratePrompt}
                              disabled={isGeneratingPrompt || !promptInput.trim()}
                              className="bg-white text-black hover:bg-white/90 disabled:opacity-30 px-5 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95"
                            >
                              {isGeneratingPrompt ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Sparkles className="w-4 h-4" />
                              )}
                              <span>{t('promptHelperBtn')}</span>
                            </button>
                          </div>

                          {generatedPrompt && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="p-4 rounded-2xl bg-black/40 border border-white/5 relative group selection:bg-white/20"
                            >
                              <p className="text-xs font-mono leading-relaxed pr-10 text-white/70">{generatedPrompt}</p>
                              <button
                                onClick={handleCopy}
                                className="absolute top-3 right-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-white/60 hover:text-white group"
                                title={t('copyPrompt')}
                              >
                                {copied ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                              {copied && (
                                <motion.span 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="absolute -top-8 right-0 text-[10px] font-bold text-green-400 uppercase tracking-widest"
                                >
                                  Copied!
                                </motion.span>
                              )}
                            </motion.div>
                          )}

                          <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                            <Info className="w-4 h-4 text-white/30 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-white/40 leading-relaxed">
                              {t('instructionGrok')}
                            </p>
                            <ExternalLink className="w-3 h-3 text-white/20 ml-auto shrink-0" />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Upload Card */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={clsx(
                      "aspect-[3/4] rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white/5 hover:border-white/20 transition-all group relative overflow-hidden",
                      uploading && "pointer-events-none opacity-50"
                    )}
                  >
                    {uploading ? (
                      <Loader2 className="w-6 h-6 text-white/60 animate-spin" />
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-all">
                          <Upload className="w-5 h-5 text-white/60" />
                        </div>
                        <span className="text-xs font-medium text-white/40">{t('uploadPhoto')}</span>
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
                      <div key={i} className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse border border-white/5" />
                    ))
                  ) : (
                    assets.map((asset) => (
                      <div 
                        key={asset.id}
                        onClick={() => setSelectedAsset(asset.id)}
                        className={clsx(
                          "aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 relative ring-1",
                          selectedAsset === asset.id ? "ring-white/50 scale-[1.02]" : "ring-white/10 opacity-70 hover:opacity-100 shadow-lg"
                        )}
                      >
                        <img src={asset.url} alt="Library Photo" className="w-full h-full object-cover" />
                        {selectedAsset === asset.id && (
                          <div className="absolute top-2 right-2 text-white bg-black/40 rounded-full p-1 backdrop-blur-md">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                      </div>
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

      <div className="h-px bg-white/5" />
    </div>
  );
}
