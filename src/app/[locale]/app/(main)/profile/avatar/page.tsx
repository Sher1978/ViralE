'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Key, 
  Image as ImageIcon, 
  Upload, 
  CheckCircle2, 
  Info, 
  Loader2, 
  AlertCircle, 
  Sparkles, 
  Copy, 
  ExternalLink,
  Plus,
  Search,
  Grid,
  Camera,
  Layers,
  Cpu,
  Trash2,
  Download,
  X,
  ChevronLeft,
  Zap,
  Globe
} from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase';
import { CreditBadge } from '@/components/ui/CreditBadge';
import { profileService, Profile } from '@/lib/services/profileService';
import { Link, useRouter } from '@/navigation';

interface AvatarAsset {
  id: string;
  url: string;
  name?: string;
  created_at: string;
  asset_type: string;
  metadata?: any;
}

export default function AvatarStudioPage() {
  const t = useTranslations('profile');
  const common = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'stock' | 'photo' | 'byok'>('photo');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assets, setAssets] = useState<AvatarAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AvatarAsset | null>(null);
  
  // BYOK State
  const [heygenKey, setHeygenKey] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Prompt Generator State
  const [showPromptGenerator, setShowPromptGenerator] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    profileService.getOrCreateProfile().then(p => {
      setProfile(p);
      if (p?.heygen_api_key) setHeygenKey(p.heygen_api_key);
    });
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
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

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

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
      setActiveTab('photo');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveHeygenKey = async () => {
    setIsSavingKey(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/profile/heygen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: heygenKey })
      });
      if (!res.ok) throw new Error('Failed to save key');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleGeneratePrompt = async () => {
    if (!promptInput.trim()) return;
    setIsGeneratingPrompt(true);
    setGeneratedPrompt(null);
    try {
      const res = await fetch('/api/ai/avatar-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: promptInput, locale })
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

  const stockAvatars = [
    { id: 'stock_1', name: 'Mark', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&h=1000&auto=format&fit=facearea&facepad=2' },
    { id: 'stock_2', name: 'Sarah', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1000&h=1000&auto=format&fit=facearea&facepad=2' },
    { id: 'stock_3', name: 'David', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1000&h=1000&auto=format&fit=facearea&facepad=2' },
    { id: 'stock_4', name: 'Elena', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000&h=1000&auto=format&fit=facearea&facepad=2' },
    { id: 'stock_5', name: 'James', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1000&h=1000&auto=format&fit=facearea&facepad=2' },
    { id: 'stock_6', name: 'Aisha', url: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=1000&h=1000&auto=format&fit=facearea&facepad=2' },
    { id: 'stock_7', name: 'Lucas', url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=1000&h=1000&auto=format&fit=facearea&facepad=2' },
    { id: 'stock_8', name: 'Sofia', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=1000&h=1000&auto=format&fit=facearea&facepad=2' }
  ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30">
      {/* Header */}
      <div className="sticky top-0 z-50 glass-premium border-b border-white/5 py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="space-y-0.5">
            <h1 className="text-xs font-black uppercase tracking-[0.3em] text-white/40 flex items-center gap-2">
              <Cpu size={12} className="text-cyan-500" />
              Production Hub
            </h1>
            <h2 className="text-xl font-black uppercase italic tracking-tighter">
              Avatar <span className="gradient-text-purple">Studio</span>
            </h2>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <CreditBadge credits={profile?.credits_balance || 0} packs={0} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="h-10 px-4 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-white/5"
          >
            <Plus size={14} />
            {t('uploadPhoto')}
          </button>
          <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10 w-fit">
          {[
            { id: 'photo', label: t('avatarPhotoTitle'), icon: ImageIcon },
            { id: 'stock', label: t('avatarStockTitle'), icon: Grid },
            { id: 'byok', label: t('byokLabel'), icon: Key },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                "flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === tab.id ? "bg-white text-black shadow-xl" : "text-white/40 hover:text-white/60"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'photo' && (
              <div className="space-y-8">
                {/* Prompt Wizard */}
                <div className="relative group">
                   <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                   <div className="relative p-8 rounded-[2rem] bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-6">
                      <div className="flex items-center justify-between">
                         <div className="space-y-1">
                            <h3 className="text-lg font-black uppercase tracking-tight">{t('promptHelperTitle')}</h3>
                            <p className="text-xs text-white/40 uppercase font-bold tracking-widest">{t('promptHelperSub')}</p>
                         </div>
                         <Sparkles className="text-cyan-500 animate-pulse" size={24} />
                      </div>
                      
                      <div className="flex gap-3">
                         <input 
                            type="text"
                            value={promptInput}
                            onChange={(e) => setPromptInput(e.target.value)}
                            placeholder={t('promptHelperPlaceholder')}
                            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 transition-all"
                         />
                         <button 
                            onClick={handleGeneratePrompt}
                            disabled={isGeneratingPrompt || !promptInput.trim()}
                            className="px-8 rounded-2xl bg-cyan-500 text-black text-xs font-black uppercase tracking-widest hover:bg-cyan-400 disabled:opacity-30 transition-all flex items-center gap-2"
                         >
                            {isGeneratingPrompt ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
                            {t('promptHelperBtn')}
                         </button>
                      </div>

                      {generatedPrompt && (
                        <div className="p-5 rounded-2xl bg-black/50 border border-white/5 relative group/prompt">
                           <p className="text-[11px] font-mono text-white/60 leading-relaxed pr-12">{generatedPrompt}</p>
                           <button 
                            onClick={handleCopy}
                            className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
                           >
                              {copied ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
                           </button>
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-[10px] font-bold text-white/30 uppercase tracking-widest bg-black/30 p-3 rounded-xl border border-white/5 w-fit">
                         <Globe size={14} className="text-cyan-500" />
                         {t('instructionGrok')}
                      </div>
                   </div>
                </div>

                {/* Photo Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {/* Upload Card */}
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-[3/4] rounded-[2rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-white/5 hover:border-white/20 transition-all group relative overflow-hidden"
                  >
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                      <Upload className="text-white/20 group-hover:text-white/60 transition-colors" size={32} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">{t('uploadPhoto')}</span>
                    {uploading && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                        <Loader2 className="animate-spin text-cyan-500" size={32} />
                      </div>
                    )}
                  </motion.div>

                  {/* Assets */}
                  {assets.map((asset, i) => (
                    <motion.div
                      key={asset.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ y: -5 }}
                      onClick={() => setSelectedAsset(asset)}
                      className="group relative aspect-[3/4] rounded-[2rem] bg-white/[0.02] border border-white/5 overflow-hidden cursor-pointer"
                    >
                      <img src={asset.url} alt="Avatar" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-5">
                         <div className="flex justify-between items-center">
                            <div className="space-y-0.5">
                               <p className="text-[10px] font-black uppercase tracking-wider text-white">PORTRAIT</p>
                               <p className="text-[8px] font-bold text-cyan-500 uppercase">NEURAL READY</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                               <ImageIcon size={14} />
                            </div>
                         </div>
                      </div>
                      <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                    </motion.div>
                  ))}
                </div>

                {assets.length === 0 && !loading && (
                  <div className="py-20 text-center space-y-4">
                     <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto text-white/5">
                        <ImageIcon size={40} strokeWidth={1} />
                     </div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-white/20">{t('libraryEmpty')}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stock' && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {stockAvatars.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ y: -5 }}
                    className="group relative aspect-[3/4] rounded-[2rem] bg-white/[0.02] border border-white/5 overflow-hidden cursor-pointer"
                  >
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-5">
                       <p className="text-xs font-black uppercase tracking-widest text-white mb-1">{item.name}</p>
                       <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">HeyGen Official Model</p>
                    </div>
                    <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <CheckCircle2 size={14} className="text-cyan-500" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {activeTab === 'byok' && (
              <div className="max-w-2xl space-y-8">
                <div className="p-10 rounded-[3rem] bg-white/[0.03] border border-white/10 space-y-8 relative overflow-hidden group">
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full" />
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500">
                        <Key size={20} />
                      </div>
                      <h3 className="text-2xl font-black uppercase italic tracking-tighter">{t('avatarByokTitle')}</h3>
                    </div>
                    <p className="text-sm text-white/40 leading-relaxed">
                      {t('heygenKeyHint')}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 pl-1">{t('heygenKeyLabel')}</label>
                       <input 
                          type="password"
                          value={heygenKey}
                          onChange={(e) => setHeygenKey(e.target.value)}
                          placeholder={t('heygenKeyPlaceholder')}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 transition-all font-mono"
                       />
                    </div>

                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                      <Info size={16} className="text-white/20" />
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                        Cost per render: Standard HeyGen API rate
                      </p>
                    </div>

                    <button 
                      onClick={handleSaveHeygenKey}
                      disabled={isSavingKey || !heygenKey}
                      className={clsx(
                        "w-full py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-3",
                        saveSuccess 
                          ? "bg-green-500 text-white shadow-lg shadow-green-500/20" 
                          : "bg-white text-black hover:scale-[1.01]"
                      )}
                    >
                      {isSavingKey ? <Loader2 className="animate-spin" size={16} /> : saveSuccess ? <CheckCircle2 size={16} /> : <Sparkles size={16} />}
                      {saveSuccess ? 'Saved' : 'Save Connection'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Asset Detail Modal */}
      <AnimatePresence>
        {selectedAsset && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAsset(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-5xl aspect-[16/10] bg-[#05050a] border border-white/10 rounded-[3rem] overflow-hidden flex flex-col md:flex-row shadow-2xl"
            >
               {/* Image Preview */}
               <div className="flex-1 bg-white/[0.02] relative group flex items-center justify-center overflow-hidden">
                  <img src={selectedAsset.url} alt="Preview" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
               </div>

               {/* Asset Metadata Sidebar */}
               <div className="w-full md:w-96 border-l border-white/10 p-10 flex flex-col justify-between">
                  <div className="space-y-10">
                     <div className="space-y-4">
                        <div className="flex items-center gap-2 text-cyan-500">
                           <Cpu size={14} />
                           <span className="text-[10px] font-black uppercase tracking-[0.3em]">Neural Metadata</span>
                        </div>
                        <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none">
                          {selectedAsset.metadata?.name || 'Asset_Node_01.png'}
                        </h3>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-black uppercase tracking-widest text-cyan-500">
                           <div className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse" />
                           NEURAL READY
                        </div>
                     </div>

                     <div className="space-y-5">
                        <div className="flex justify-between items-center py-3 border-b border-white/5">
                           <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Type</span>
                           <span className="text-[10px] font-black text-white/60 uppercase">Avatar Source</span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-white/5">
                           <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Added</span>
                           <span className="text-[10px] font-black text-white/60 uppercase">
                             {new Date(selectedAsset.created_at).toLocaleDateString()}
                           </span>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-white/5">
                           <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Status</span>
                           <span className="text-[10px] font-black text-green-500 uppercase">Synchronized</span>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <a 
                      href={selectedAsset.url} 
                      download 
                      target="_blank"
                      className="w-full py-5 rounded-2xl bg-white text-black text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                     >
                        <Download size={14} />
                        Download Asset
                     </a>
                     <button className="w-full py-5 rounded-2xl bg-white/5 border border-white/10 text-red-500/60 text-[11px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 transition-all flex items-center justify-center gap-2">
                        <Trash2 size={14} />
                        Decommission
                     </button>
                  </div>
               </div>

               <button 
                onClick={() => setSelectedAsset(null)}
                className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
               >
                  <X size={24} />
               </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
