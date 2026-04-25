import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ArrowLeft, Library, Square, 
  Settings, Type, Timer, Palette, Mic2, Camera,
  MoreVertical, Edit3, Check, RotateCw
} from 'lucide-react';

interface TeleprompterViewProps {
  cameraStream: MediaStream | null;
  videoPreviewRef: React.RefObject<HTMLVideoElement | null>;
  isVideoMirrored: boolean;
  prompterWidth: number;
  isReading: boolean;
  countdown: number | null;
  prompterRef: React.RefObject<HTMLDivElement | null>;
  isMirrored: boolean;
  useCustomScript: boolean;
  manifest: any;
  customScript: string;
  textSize: 'sm' | 'md' | 'lg';
  scriptOpacity: number;
  onScriptUpdate: (newText: string) => void;
  onBack?: () => void;
  onToggleRecording?: () => void;
  onFlipCamera?: () => void;
  isRecordingVideo?: boolean;
  t: (key: string, data?: any) => string;
}

export const TeleprompterView: React.FC<TeleprompterViewProps> = ({
  cameraStream,
  videoPreviewRef,
  isVideoMirrored,
  prompterWidth,
  isReading,
  countdown,
  prompterRef,
  isMirrored,
  useCustomScript,
  manifest,
  customScript,
  textSize,
  scriptOpacity,
  onScriptUpdate,
  onBack,
  onToggleRecording,
  onFlipCamera,
  isRecordingVideo,
  t,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedText, setEditedText] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleStartEdit = () => {
    const currentText = useCustomScript 
      ? customScript 
      : manifest?.segments.map((s: any) => s.scriptText).filter(Boolean).join('\n\n');
    setEditedText(currentText || '');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    onScriptUpdate(editedText);
    setIsEditing(false);
  };

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center overflow-hidden bg-black rounded-[3rem] border border-white/10 shadow-2xl">
      {/* 📹 Video Foundation */}
      {cameraStream && (
        <div className="absolute inset-0 z-0">
          <video 
            ref={videoPreviewRef}
            autoPlay 
            muted 
            playsInline
            className={`w-full h-full object-cover opacity-70 transition-transform duration-1000 ${isVideoMirrored ? 'scale-x-[-1]' : ''}`}
          />
        </div>
      )}
      
      {/* 🔮 Top HUD - Reference Style */}
      <div className="absolute top-8 left-0 right-0 px-8 flex items-center justify-between z-40">
        <button 
          onClick={onBack}
          className="text-white/80 hover:text-white transition-all active:scale-95"
        >
          <ArrowLeft size={32} />
        </button>
        
        <div className="flex items-center gap-6">
          <button onClick={handleStartEdit} className="text-white/80 hover:text-white transition-all">
            <Edit3 size={32} />
          </button>
          <button className="text-white/80 hover:text-white transition-all">
            <MoreVertical size={32} />
          </button>
        </div>
      </div>

      {/* 🔵 Reading Guide - The Blue Line + Triangle */}
      <div className="absolute top-[30%] left-0 right-0 z-20 pointer-events-none flex items-center">
         {/* Triangle Marker */}
         <div className="absolute left-0 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[12px] border-l-white ml-1" />
         {/* The Blue Line */}
         <div className="w-full h-[2px] bg-sky-500/80 shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
      </div>

      {/* 📜 Scrolling Text Canvas */}
      <div 
        ref={prompterRef}
        className={`w-full h-full overflow-y-auto scrollbar-none transition-transform duration-700 relative z-10 ${isMirrored ? 'scale-x-[-1]' : ''}`}
        style={{
          paddingTop: '30vh',
          paddingBottom: '50vh'
        }}
      >
        <div 
          className="mx-auto space-y-32 transition-all duration-700 ease-out px-8 text-left"
          style={{ maxWidth: `${prompterWidth}px` }}
        >
          <div className="space-y-12">
            <p className={`font-black uppercase leading-[1.2] transition-all duration-500 tracking-tight ${
              textSize === 'sm' ? 'text-3xl' : textSize === 'lg' ? 'text-7xl' : 'text-5xl'
            }`} style={{ 
              color: `rgba(255, 255, 255, ${isReading ? scriptOpacity : 0.8})`,
              textShadow: '0 4px 10px rgba(0,0,0,0.8)'
            }}>
              {useCustomScript ? customScript : manifest?.segments.map((s: any) => s.scriptText).filter(Boolean).join('\n\n')}
            </p>
          </div>
        </div>
      </div>

      {/* 🔴 Primary Action Bar */}
      <div className="absolute bottom-28 left-0 right-0 px-12 flex items-center justify-center gap-10 z-30">
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="text-white/40 hover:text-white transition-all flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center">
            <Library size={24} />
          </div>
        </button>

        <div className="flex items-center gap-6">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={onToggleRecording}
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center"
          >
            <div className={`rounded-full transition-all duration-300 ${isRecordingVideo ? 'w-10 h-10 bg-red-600 rounded-md' : 'w-16 h-16 bg-red-600'}`} />
          </motion.button>
          
          <div className="flex flex-col gap-4">
            <button className="text-white/80 hover:text-white transition-all">
              <Check size={28} />
            </button>
            <button onClick={onFlipCamera} className="text-white/80 hover:text-white transition-all">
               <RotateCw size={28} />
            </button>
          </div>
        </div>
      </div>

      {/* 🛠️ Floating Settings Toolbar */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40">
         <div className="flex items-center gap-8 bg-black/40 backdrop-blur-3xl px-8 py-4 rounded-3xl border border-white/10 shadow-2xl">
            <button className="text-white/60 hover:text-white transition-all"><X size={24} /></button>
            <button className="text-white/60 hover:text-white transition-all"><Palette size={24} /></button>
            <button className="text-white/60 hover:text-white transition-all"><Mic2 size={24} /></button>
            <button className="text-white/40 hover:text-white transition-all px-4 py-1.5 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest">Floating</button>
            <button className="text-white/60 hover:text-white transition-all"><Type size={24} /></button>
            <button className="text-white/60 hover:text-white transition-all"><Settings size={24} /></button>
         </div>
      </div>

      {/* Countdown Overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div 
            initial={{ opacity: 0, scale: 2 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-2xl"
          >
            <span className="text-[15rem] font-black italic text-white drop-shadow-[0_0_80px_rgba(168,85,247,0.5)]">
              {countdown}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Editor Modal Overlay */}
      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[110] bg-black/95 backdrop-blur-3xl p-10 flex flex-col gap-10"
          >
            <div className="flex items-center justify-between text-white">
              <h3 className="text-2xl font-black italic uppercase">Edit Script</h3>
              <div className="flex gap-4">
                <button onClick={() => setIsEditing(false)} className="p-4 rounded-2xl bg-white/5 border border-white/10"><X size={24} /></button>
                <button onClick={handleSaveEdit} className="px-10 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs flex items-center gap-3"><Check size={18} /> Apply</button>
              </div>
            </div>
            <textarea
              autoFocus
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="flex-1 bg-transparent border border-white/5 rounded-[2rem] p-8 text-2xl font-bold text-white focus:outline-none focus:border-purple-500/30 transition-all resize-none shadow-inner leading-relaxed"
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      <input ref={fileInputRef} type="file" accept="video/*" className="hidden" />
    </div>
  );
};
