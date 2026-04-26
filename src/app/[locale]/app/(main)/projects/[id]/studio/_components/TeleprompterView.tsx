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
  onTextSizeChange?: (size: 'sm' | 'md' | 'lg') => void;
  onOpacityChange?: (opacity: number) => void;
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
  onTextSizeChange,
  onOpacityChange,
  isRecordingVideo,
  t,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedText, setEditedText] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const rotateTextSize = () => {
    if (!onTextSizeChange) return;
    const sizes: ('sm' | 'md' | 'lg')[] = ['sm', 'md', 'lg'];
    const currentIdx = sizes.indexOf(textSize);
    const nextIdx = (currentIdx + 1) % sizes.length;
    onTextSizeChange(sizes[nextIdx]);
  };

  const rotateOpacity = () => {
    if (!onOpacityChange) return;
    const steps = [0.4, 0.7, 1.0];
    const currentIdx = steps.indexOf(scriptOpacity);
    const nextIdx = (currentIdx + 1) % steps.length;
    onOpacityChange(steps[nextIdx]);
  };

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
      
      {/* ⏱️ Production Countdown Overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div 
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <span className="text-[200px] font-black italic text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.5)]">
              {countdown}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 🔮 Top HUD - Reference Style */}
      <div className="absolute top-12 left-0 right-0 px-8 flex items-center justify-between z-40">
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

      {/* 📜 Scrolling Text Canvas with Focus Zone Effect */}
      <div 
        ref={prompterRef}
        className={`w-full h-full overflow-y-auto scrollbar-none transition-transform duration-700 relative z-10 ${isMirrored ? 'scale-x-[-1]' : ''}`}
        style={{
          paddingTop: '25vh',
          paddingBottom: '60vh',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 40%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 40%, transparent 100%)'
        }}
      >
        <div 
          className="mx-auto space-y-32 transition-all duration-700 ease-out px-8 text-left"
          style={{ maxWidth: `${prompterWidth}px` }}
        >
          <div className="space-y-12">
            <p className={`font-black uppercase leading-[1.3] transition-all duration-500 tracking-tight ${
              textSize === 'sm' ? 'text-3xl' : textSize === 'lg' ? 'text-7xl' : 'text-5xl'
            }`} style={{ 
              color: 'white',
              opacity: isReading ? 1 : 0.7,
              textShadow: '0 4px 15px rgba(0,0,0,1)'
            }}>
              {useCustomScript ? customScript : manifest?.segments.map((s: any) => s.scriptText).filter(Boolean).join('\n\n')}
            </p>
          </div>
        </div>
      </div>

      {/* 🔴 Primary Action Bar */}
      <div className="absolute bottom-32 left-0 right-0 px-12 flex items-center justify-center gap-10 z-30">
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="text-white/40 hover:text-white transition-all flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10">
            <Library size={24} />
          </div>
        </button>

        <div className="flex items-center gap-6">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={onToggleRecording}
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center relative bg-black/20 backdrop-blur-sm"
          >
            <div className={`rounded-full transition-all duration-300 ${isRecordingVideo ? 'w-10 h-10 bg-red-600 rounded-md animate-pulse' : 'w-16 h-16 bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.5)]'}`} />
          </motion.button>
          
          <div className="flex flex-col gap-6">
            <button 
              onClick={() => {
                if (isRecordingVideo) onToggleRecording?.();
              }}
              className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:bg-emerald-500 hover:text-white transition-all active:scale-90"
              title="Finish Recording"
            >
              <Check size={36} strokeWidth={3} />
            </button>
            <button 
              onClick={onFlipCamera}
              className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:text-blue-400 transition-all active:scale-90"
            >
               <RotateCw size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* 🛠️ Floating Settings Toolbar */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40">
         <div className="flex items-center gap-8 bg-black/60 backdrop-blur-3xl px-8 py-5 rounded-[2rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <button onClick={onBack} className="text-white/40 hover:text-white transition-all"><X size={24} /></button>
            <button onClick={rotateOpacity} className="text-white/40 hover:text-white transition-all active:scale-90" title="Opacity"><Palette size={24} /></button>
            <button className="text-white/40 hover:text-white transition-all"><Mic2 size={24} /></button>
            <div className="px-4 py-2 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 border border-blue-400/20 shadow-[0_0_15px_rgba(96,165,250,0.2)]">Floating</div>
            <button onClick={rotateTextSize} className="text-white/40 hover:text-white transition-all active:scale-90" title="Text Size"><Type size={24} /></button>
            <button className="text-white/40 hover:text-white transition-all"><Settings size={24} /></button>
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
