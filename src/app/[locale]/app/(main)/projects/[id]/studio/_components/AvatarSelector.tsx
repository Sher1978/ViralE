'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Upload, User, Check, Sparkles, 
  Image as ImageIcon, Loader2, AlertCircle, 
  ChevronRight, Cpu, Zap, Activity
} from 'lucide-react';
import { useLocale } from 'next-intl';
import { storageService } from '@/lib/services/storageService';
import { v4 as uuidv4 } from 'uuid';

interface AvatarSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (photoUrl: string) => Promise<void>;
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
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Mock default avatars for now
  const defaultAvatars = [
    { id: 'def_1', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop', label: 'Classic' },
    { id: 'def_2', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop', label: 'Modern' },
    { id: 'def_3', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop', label: 'Expert' },
  ];

  React.useEffect(() => {
    const fetchAssets = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/assets?type=image`);
        const data = await res.json();
        setAssets(data.assets || []);
      } catch (e) {
        console.error('Failed to fetch assets:', e);
      } finally {
        setIsLoadingAssets(false);
      }
    };
    if (isOpen) fetchAssets();
  }, [isOpen, projectId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingAssets(true);
    try {
      const publicUrl = await storageService.uploadFile(file, `avatar_${uuidv4()}.jpg`, 'media_assets');
      if (publicUrl) {
        const newAsset = { id: `manual_${Date.now()}`, url: publicUrl, label: 'Uploaded' };
        setAssets(prev => [newAsset, ...prev]);
        setSelectedId(newAsset.id);
      }
    } catch (e) {
      console.error('Upload failed:', e);
    } finally {
      setIsLoadingAssets(false);
    }
  };

  const handleConfirm = () => {
    const selected = [...defaultAvatars, ...assets].find(a => a.id === selectedId);
    if (selected) {
      onSelect(selected.url);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
        >
          <div className="w-full max-w-4xl bg-[#0a0a14] border border-white/10 rounded-[3rem] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
             {/* Header */}
             <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div>
                   <h2 className="text-3xl font-black italic uppercase text-white tracking-tighter">
                      Выберите <span className="text-purple-500">Облик</span>
                   </h2>
                   <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">
                      Это фото будет "оживлено" под ваш голос
                   </p>
                </div>
                <button 
                  onClick={onClose}
                  className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                >
                   <X size={24} />
                </button>
             </div>

             {/* Content */}
             <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {isGenerating ? (
                   <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                      <div className="relative w-full max-w-lg aspect-video rounded-[3rem] bg-black/40 border border-white/5 overflow-hidden shadow-2xl flex items-center justify-center mb-12">
                         <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5" />
                         
                         {/* Neural Network Visualization */}
                         <div className="relative z-10 flex flex-col items-center gap-6">
                            <div className="flex items-center gap-4">
                               <motion.div 
                                 animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                 transition={{ duration: 2, repeat: Infinity }}
                                 className="w-16 h-16 rounded-3xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30"
                               >
                                  <Cpu className="text-purple-400" size={32} />
                               </motion.div>
                               <div className="h-[2px] w-20 bg-gradient-to-r from-purple-500/30 via-white/20 to-blue-500/30 relative">
                                  <motion.div 
                                    animate={{ left: ['0%', '100%', '0%'] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white blur-sm shadow-[0_0_10px_white]"
                                  />
                               </div>
                               <motion.div 
                                 animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 1, 0.5] }}
                                 transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                                 className="w-16 h-16 rounded-3xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30"
                               >
                                  <Zap className="text-blue-400" size={32} />
                               </motion.div>
                            </div>
                            
                            <div className="space-y-2">
                               <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter">Склейка <span className="text-purple-400">А-Ролла</span></h3>
                               <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.4em] animate-pulse">Mastering Audio + Visual Identity</p>
                            </div>

                            <div className="w-64 h-2 bg-white/5 rounded-full overflow-hidden">
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
                         <p className="text-white/40 text-[11px] leading-relaxed italic">
                            "Мы объединяем ваш уникальный тембр голоса с визуальным аватаром. ИИ анализирует каждую фонему для создания идеальной мимики и синхронизации губ."
                         </p>
                         <div className="flex items-center justify-center gap-4">
                            <span className="flex items-center gap-2 text-[9px] font-black uppercase text-purple-400"><Activity size={12} /> Neural Analysis</span>
                            <span className="flex items-center gap-2 text-[9px] font-black uppercase text-blue-400"><Sparkles size={12} /> Lip Sync</span>
                         </div>
                      </div>
                   </div>
                ) : (
                   <div className="space-y-10">
                      {/* Upload Section */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                         <button 
                           onClick={() => fileInputRef.current?.click()}
                           className="aspect-square rounded-3xl border-2 border-dashed border-white/10 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all flex flex-col items-center justify-center gap-3 group"
                         >
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-purple-400 transition-colors">
                               <Upload size={24} />
                            </div>
                            <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Upload Photo</span>
                         </button>

                         {/* Default Avatars */}
                         {defaultAvatars.map((avatar) => (
                            <button 
                              key={avatar.id}
                              onClick={() => setSelectedId(avatar.id)}
                              className={`relative aspect-square rounded-3xl overflow-hidden border-2 transition-all ${
                                selectedId === avatar.id ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-white/5 hover:border-white/20'
                              }`}
                            >
                               <img src={avatar.url} className="w-full h-full object-cover" alt={avatar.label} />
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
                                  <button 
                                    key={asset.id}
                                    onClick={() => setSelectedId(asset.id)}
                                    className={`relative aspect-square rounded-3xl overflow-hidden border-2 transition-all ${
                                      selectedId === asset.id ? 'border-purple-500' : 'border-white/5'
                                    }`}
                                  >
                                     <img src={asset.url} className="w-full h-full object-cover" alt="User asset" />
                                     {selectedId === asset.id && (
                                        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white">
                                           <Check size={14} strokeWidth={4} />
                                        </div>
                                     )}
                                  </button>
                               ))}
                            </div>
                         </div>
                      )}
                   </div>
                )}
             </div>

             {/* Footer */}
             {!isGenerating && (
                <div className="p-8 bg-black/40 border-t border-white/5 flex items-center justify-end gap-4">
                   <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest mr-auto flex items-center gap-2">
                      <AlertCircle size={12} /> Потребуется ~1-2 минуты для рендера
                   </p>
                   <button 
                     onClick={handleConfirm}
                     disabled={!selectedId}
                     className={`px-10 py-5 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all ${
                        selectedId 
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20 active:scale-95' 
                          : 'bg-white/5 text-white/10 cursor-not-allowed'
                     }`}
                   >
                      Оживить Фото <ChevronRight size={16} className="inline ml-1" />
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
