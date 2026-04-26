'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileVideo, ChevronRight, X } from 'lucide-react';
import { useLocale } from 'next-intl';

interface RecordingReviewProps {
  showRecordingReview: boolean;
  lastRecordingUrl: string | null;
  currentProfile: any;
  downloadRawVideo: () => void;
  sendRawToTelegram: () => Promise<void>;
  setShowRecordingReview: (show: boolean) => void;
  setLastRecordingUrl: (url: string | null) => void;
  updateSegmentField: (id: string, field: string, value: any) => void;
  setActiveTab: (tab: any) => void;
  manifest: any;
  selectedSegmentId: string | null;
}

export const RecordingReview: React.FC<RecordingReviewProps> = ({
  showRecordingReview,
  lastRecordingUrl,
  currentProfile,
  downloadRawVideo,
  sendRawToTelegram,
  setShowRecordingReview,
  setLastRecordingUrl,
  updateSegmentField,
  setActiveTab,
  manifest,
  selectedSegmentId,
}) => {
  const locale = useLocale();
  return (
    <AnimatePresence>
      {showRecordingReview && lastRecordingUrl && (
        <motion.div 
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-[100] bg-black flex flex-col pt-safe px-6 pb-12 overflow-y-auto"
        >
           {/* Top Header - Dismiss & Branding */}
           <div className="flex items-center justify-between py-6 shrink-0">
              <button 
                onClick={() => { setShowRecordingReview(false); setLastRecordingUrl(null); }}
                className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-red-500 transition-all active:scale-95"
              >
                 <X size={24} />
              </button>
              
              <div className="flex flex-col items-end">
                 <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black uppercase text-emerald-500 tracking-widest">
                    RECORDING SAVED
                 </div>
              </div>
           </div>

           {/* Content Grid */}
           <div className="flex-1 flex flex-col lg:flex-row gap-8 items-center justify-center py-4">
              {/* Video Preview */}
              <div className="relative w-full max-w-[320px] lg:max-w-md aspect-[9/16] rounded-[2.5rem] border border-white/10 overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] bg-neutral-900 shrink-0">
                 <video src={lastRecordingUrl} controls className="w-full h-full object-cover" />
                 <div className="absolute top-5 left-5 flex flex-col gap-1.5 z-10 pointer-events-none">
                    <div className="px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-[8px] font-black uppercase text-white/80 tracking-widest">
                       {currentProfile?.tier === 'premium' ? '4K QUALITY' : '1080p HD'}
                    </div>
                 </div>
              </div>
              
              {/* Actions Section */}
              <div className="w-full max-w-sm flex flex-col gap-6">
                 <div className="text-center lg:text-left">
                    <h3 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-[0.9]">
                       Take is <br/> <span className="text-purple-500">Mastered</span>
                    </h3>
                    <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.3em] mt-3 italic">READY FOR FINAL EDITING</p>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={downloadRawVideo}
                      className="flex flex-col items-center justify-center gap-3 p-5 rounded-[2rem] bg-white/5 border border-white/10 text-white/50 hover:bg-white hover:text-black transition-all group"
                    >
                       <Download size={20} className="group-hover:scale-110 transition-transform" /> 
                       <span className="text-[8px] font-black uppercase tracking-widest">Save</span>
                    </button>
                    <button 
                      onClick={sendRawToTelegram}
                      className="flex flex-col items-center justify-center gap-3 p-5 rounded-[2rem] bg-white/5 border border-white/10 text-white/50 hover:bg-white hover:text-black transition-all group"
                    >
                       <FileVideo size={20} className="group-hover:scale-110 transition-transform" />
                       <span className="text-[8px] font-black uppercase tracking-widest">Telegram</span>
                    </button>
                 </div>
                 
                 <div className="h-[1px] w-1/2 mx-auto lg:mx-0 bg-white/10" />

                 <button 
                    onClick={() => {
                       const segmentId = selectedSegmentId || manifest?.segments[0]?.id || '';
                       // Update root videoUrl for VideoEditor A-Roll Foundation
                       manifest.videoUrl = lastRecordingUrl;
                       updateSegmentField(segmentId, 'assetUrl', lastRecordingUrl);
                       updateSegmentField(segmentId, 'type', 'user_recording');
                       setShowRecordingReview(false);
                       setActiveTab('assembly');
                    }}
                    className="w-full py-6 rounded-[2.5rem] bg-purple-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-purple-500 shadow-[0_20px_40px_-10px_rgba(168,85,247,0.4)] border border-purple-500/30 transition-all flex items-center justify-center gap-3 active:scale-95"
                 >
                    {locale === 'ru' ? 'В МОНТАЖ' : 'GO TO MONTAGE'} <ChevronRight size={20} strokeWidth={3} />
                 </button>

                 <button 
                    onClick={() => { setShowRecordingReview(false); setLastRecordingUrl(null); }}
                    className="w-full py-4 rounded-[2rem] border border-white/5 text-white/20 text-[9px] font-black uppercase tracking-[0.4em] hover:text-red-500 hover:border-red-500/20 transition-all"
                 >
                    RETENTION FAIL / RETAKE
                 </button>
              </div>
           </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
