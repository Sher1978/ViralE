'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileVideo, ChevronRight } from 'lucide-react';

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
  return (
    <AnimatePresence>
      {showRecordingReview && lastRecordingUrl && (
        <motion.div 
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[60] bg-black/80 flex items-center justify-center p-8"
        >
           <div className="max-w-4xl w-full flex flex-col md:flex-row gap-12 items-center">
              <div className="relative aspect-[9/16] h-[70vh] rounded-[3rem] border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-black">
                 <video src={lastRecordingUrl} controls className="w-full h-full object-cover" />
                 <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
                    <div className="px-4 py-2 rounded-xl bg-purple-500 text-[10px] font-black uppercase tracking-widest shadow-lg">Review Take</div>
                    <div className="px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-[8px] font-black uppercase text-green-400 tracking-tighter">
                       {currentProfile?.tier === 'premium' ? '4K ULTRA HD' : '1080p FULL HD'}
                    </div>
                 </div>
              </div>
              
              <div className="flex-1 flex flex-col gap-8 max-w-sm">
                 <div>
                    <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">Perfect <br/> <span className="text-purple-400">Capture</span></h3>
                    <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mt-2 italic">Ready for high-fidelity export</p>
                 </div>

                 <div className="space-y-3">
                    <button 
                      onClick={downloadRawVideo}
                      className="w-full py-5 rounded-[2rem] bg-white text-black text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                    >
                       <Download size={18} /> Save to Phone (4K)
                    </button>
                    <button 
                      onClick={sendRawToTelegram}
                      className="w-full py-5 rounded-[2rem] bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white/10 transition-all font-sans"
                    >
                       <FileVideo size={18} /> Send to Telegram
                    </button>
                 </div>
                 
                 <div className="h-[1px] w-full bg-white/5" />

                 <div className="space-y-3">
                    <button 
                      onClick={() => {
                         // Ingest the recording into the storyboard
                         const segmentId = selectedSegmentId || manifest?.segments[0].id || '';
                         updateSegmentField(segmentId, 'assetUrl', lastRecordingUrl);
                         updateSegmentField(segmentId, 'type', 'user_recording');
                         setShowRecordingReview(false);
                         setActiveTab('assembly');
                      }}
                      className="w-full py-6 rounded-[2.5rem] bg-purple-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-purple-400 shadow-2xl shadow-purple-500/20 transition-all flex items-center justify-center gap-3"
                    >
                       Continue to Montage <ChevronRight size={18} />
                    </button>
                    <button 
                      onClick={() => { setShowRecordingReview(false); setLastRecordingUrl(null); }}
                      className="w-full py-3 text-white/20 text-[9px] font-black uppercase tracking-[0.3em] hover:text-red-500 transition-colors"
                    >
                       Discard & Retake
                    </button>
                 </div>
              </div>
           </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
