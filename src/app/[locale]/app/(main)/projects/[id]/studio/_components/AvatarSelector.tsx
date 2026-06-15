'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Upload, User, Check, Sparkles, 
  Image as ImageIcon, Loader2, AlertCircle, 
  ChevronRight, Cpu, Zap, Activity, Trash2
} from 'lucide-react';
import { useLocale } from 'next-intl';
import { storageService } from '@/lib/services/storageService';
import { v4 as uuidv4 } from 'uuid';

interface AvatarSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (photoUrl: string, avatarId?: string, avatarType?: string) => Promise<void>;
  isGenerating: boolean;
  projectId: string;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  isGenerating,
  projectId
}) => {
  const locale = useLocale();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [assets, setAssets] = React.useState<any[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = React.useState(true);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Persist avatars in state to prevent re-fetching glitches
  const [defaultAvatars, setDefaultAvatars] = React.useState<any[]>([]);
  const [isLoadingAvatars, setIsLoadingAvatars] = React.useState(true);

  // Background sync logic
  const syncAvatars = React.useCallback(async () => {
    try {
      const res = await fetch('/api/ai/heygen/avatars');
      const data = await res.json();
      if (data.avatars && data.avatars.length > 0) {
        setDefaultAvatars(data.avatars);
      }
    } catch (e) {
      console.error('Background sync failed:', e);
    } finally {
      setIsLoadingAvatars(false);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      // Show cached/initial if available, then sync in background
      syncAvatars();
      fetchAssets();
    }
  }, [isOpen]);  const fetchAssets = async () => {
    try {
      const res = await fetch(`/api/profile/assets`);
      const data = await res.json();
      // Only keep talking photos (avatars) in this view
      const filtered = (data.assets || []).filter((a: any) => a.type === 'photo' || a.type === 'talking_photo');
      setAssets(filtered);
    } catch (e) {
      console.error('Failed to fetch assets:', e);
    } finally {
      setIsLoadingAssets(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target as any).files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      // Upload to user-specific avatars folder so photos appear in the gallery
      const { data: { user } } = await (await import('@/lib/supabase')).supabase.auth.getUser();
      const ext = file.name.split('.').pop() || 'jpg';
      const folderPath = user?.id
        ? `avatars/${user.id}/${Date.now()}.${ext}`
        : `avatars/${uuidv4()}.${ext}`;

      const { supabase } = await import('@/lib/supabase');
      const { error: uploadError } = await supabase.storage.from('media').upload(folderPath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(folderPath);

      // Persist avatar to global assets database
      const saveRes = await fetch('/api/profile/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: publicUrl,
          type: 'talking_photo',
          metadata: { label: file.name || 'Uploaded Avatar' },
          projectId
        })
      });

      if (!saveRes.ok) throw new Error('Failed to save avatar to catalog');
      const { asset: persistedAsset } = await saveRes.json();

      // Inject the persisted asset from database directly into our state
      setAssets(prev => [persistedAsset, ...prev]);
      setSelectedId(persistedAsset.id);
    } catch (e) {
      console.error('Upload failed:', e);
      setError(e instanceof Error ? e.message : 'Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAssetDelete = async (assetId: string) => {
    try {
      setAssets(prev => prev.filter(a => a.id !== assetId));
      if (selectedId === assetId) setSelectedId(null);
      
      await fetch(`/api/profile/assets?id=${assetId}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.error('Failed to delete asset:', e);
    }
  };
  const handleConfirm = () => {
    const allOptions = [...defaultAvatars, ...assets];
    const selected = allOptions.find(a => a.id === selectedId);
    if (selected) {
      const isInitialStock = selected.id.startsWith('stock_');
      const isFreshStock = defaultAvatars.some(a => a.id === selectedId) && !isInitialStock;
      
      onSelect(
        selected.url, 
        isFreshStock ? selected.id : undefined, 
        selected.type
      );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-6"
        >
          <div className="w-full max-w-4xl bg-[#0a0a14] border border-white/10 rounded-[2.5rem] md:rounded-[3rem] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
             {/* Header */}
             <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between">
                <div>
                   <h2 className="text-2xl md:text-3xl font-black italic uppercase text-white tracking-tighter leading-none">
                       <span className="text-purple-500">Face Swap</span> — выберите фото
                    </h2>
                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1">
                       Ваше фото будет наложено на записанное видео (Face Swap)
                    </p>
                </div>
                <button 
                  onClick={onClose}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                >
                   <X size={20} />
                </button>
             </div>

             {/* Content */}
             <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                {isGenerating ? (
                   <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-12 text-center">
                      <div className="relative w-full max-w-lg aspect-video rounded-[2rem] md:rounded-[3rem] bg-black/40 border border-white/5 overflow-hidden shadow-2xl flex items-center justify-center mb-12">
                         <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5" />
                         
                         {/* Neural Network Visualization */}
                         <div className="relative z-10 flex flex-col items-center gap-6">
                            <div className="flex items-center gap-4">
                               <motion.div 
                                 animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                 transition={{ duration: 2, repeat: Infinity }}
                                 className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30"
                               >
                                  <Cpu className="text-purple-400" size={24} />
                               </motion.div>
                               <div className="h-[2px] w-12 md:w-20 bg-gradient-to-r from-purple-500/30 via-white/20 to-blue-500/30 relative">
                                  <motion.div 
                                    animate={{ left: ['0%', '100%', '0%'] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white blur-sm shadow-[0_0_10px_white]"
                                  />
                               </div>
                               <motion.div 
                                 animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 1, 0.5] }}
                                 transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                                 className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30"
                               >
                                  <Zap className="text-blue-400" size={24} />
                               </motion.div>
                            </div>
                            
                            <div className="space-y-2">
                               <h3 className="text-xl md:text-2xl font-black italic uppercase text-white tracking-tighter leading-none">Запуск <span className="text-purple-400">Face Swap</span></h3>
                                <p className="text-[8px] md:text-[10px] font-bold text-white/30 uppercase tracking-[0.4em] animate-pulse">AI Face Synthesis in Progress...</p>
                            </div>

                            <div className="w-48 md:w-64 h-1.5 md:h-2 bg-white/5 rounded-full overflow-hidden">
                               <motion.div 
                                 animate={{ width: ['0%', '100%'] }}
                                 transition={{ duration: 180, ease: "linear" }}
                                 className="h-full bg-gradient-to-r from-purple-500 to-blue-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                               />
                            </div>
                         </div>

                         {/* Scanning Line Effect */}
                         <motion.div 
                           animate={{ top: ['-10%', '110%'] }}
                           transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                           className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500 to-transparent z-20 shadow-[0_0_10px_rgba(168,85,247,0.8)]"
                         />
                      </div>

                      <div className="max-w-md space-y-4">
                         <p className="text-white/40 text-[10px] md:text-[11px] leading-relaxed italic">
                            "Мы объединяем ваш уникальный тембр голоса с визуальным аватаром. ИИ анализирует каждую фонему для создания идеальной мимики и синхронизации губ."
                         </p>
                      </div>
                   </div>
                ) : (
                   <div className="space-y-10">
                      {/* Upload Section */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <button 
                            onClick={() => (fileInputRef.current as any)?.click()}
                            disabled={isUploading}
                            className="aspect-square rounded-[2rem] border-2 border-dashed border-white/10 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all flex flex-col items-center justify-center gap-3 group relative overflow-hidden"
                          >
                             {isUploading ? (
                               <div className="flex flex-col items-center gap-2">
                                  <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                                  <span className="text-[8px] font-black uppercase text-purple-400">Uploading...</span>
                               </div>
                             ) : (
                               <>
                                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-purple-400 transition-colors">
                                     <Upload size={24} />
                                  </div>
                                  <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Upload Photo</span>
                               </>
                             )}
                          </button>

                          {/* Default Avatars */}
                          {isLoadingAvatars && <div className="col-span-full text-center py-4 text-white/20 animate-pulse">Syncing with HeyGen...</div>}
                          {defaultAvatars.map((avatar) => (
                             <button 
                               key={avatar.id}
                               onClick={() => setSelectedId(avatar.id)}
                               className={`relative aspect-square rounded-[2rem] overflow-hidden border-2 transition-all ${
                                 selectedId === avatar.id ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-white/5 hover:border-white/20'
                               }`}
                             >
                                <img src={avatar.url} crossOrigin="anonymous" className="w-full h-full object-cover" alt={avatar.label} />
                                <div className={`absolute inset-0 bg-purple-500/20 transition-opacity ${selectedId === avatar.id ? 'opacity-100' : 'opacity-0'}`} />
                                {selectedId === avatar.id && (
                                   <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-lg">
                                      <Check size={14} strokeWidth={4} />
                                   </div>
                                )}
                                <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                   <span className="text-[8px] font-black uppercase text-white tracking-widest">{avatar.label}</span>
                                </div>
                             </button>
                          ))}
                      </div>

                      {/* User Assets Section */}
                      {assets.length > 0 && (
                         <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase text-white/20 tracking-[0.2em] ml-1">Your Assets</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                               {assets.map((asset) => (
                                  <div key={asset.id} className="relative group">
                                    <button 
                                      onClick={() => setSelectedId(asset.id)}
                                      className={`w-full aspect-square rounded-[2rem] overflow-hidden border-2 transition-all ${
                                        selectedId === asset.id ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-white/5 hover:border-white/20'
                                      }`}
                                    >
                                       <img src={asset.url} crossOrigin="anonymous" className="w-full h-full object-cover" alt="User asset" />
                                       {selectedId === asset.id && (
                                          <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white">
                                             <Check size={14} strokeWidth={4} />
                                          </div>
                                       )}
                                    </button>
                                    
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAssetDelete(asset.id);
                                      }}
                                      className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-20 hover:scale-110 active:scale-90"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                               ))}
                            </div>
                         </div>
                      )}

                      {error && (
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-xs font-bold">
                           <AlertCircle size={16} />
                           {error}
                        </div>
                      )}
                   </div>
                )}
             </div>

             {/* Footer */}
             {!isGenerating && (
                <div className="p-6 md:p-8 bg-black/40 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                   <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest flex items-center gap-2">
                      <AlertCircle size={12} /> Потребуется ~1-2 минуты для рендера
                   </p>
                   <button 
                     onClick={handleConfirm}
                     disabled={!selectedId}
                     className={`w-full md:w-auto px-10 py-5 rounded-2xl md:rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all ${
                        selectedId 
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20 active:scale-95' 
                          : 'bg-white/5 text-white/10 cursor-not-allowed'
                     }`}
                   >
                       Запустить Face Swap <ChevronRight size={16} className="inline ml-1" />
                   </button>
                </div>
             )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden" 
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
