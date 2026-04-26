import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ArrowLeft, Library, Square, 
  Settings, Type, Timer, Palette, Mic2, Camera,
  MoreVertical, Edit3, Check, RotateCw
} from 'lucide-react';
import { useRouter } from '@/navigation';
import { useLocale } from 'next-intl';

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
  scrollSpeed: number;
  onSpeedChange: (speed: number) => void;
  isRecordingVideo?: boolean;
  onFinish?: () => void;
  t: (key: string, data?: any) => string;
}

export const TeleprompterView = React.memo(({
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
  onFinish,
  scrollSpeed,
  onSpeedChange,
  t,
}: TeleprompterViewProps) => {
  const router = useRouter();
  const locale = useLocale();
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedText, setEditedText] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 📹 Critical: Bind camera stream to video element
  React.useEffect(() => {
    if (cameraStream && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, videoPreviewRef]);

  const scriptText = React.useMemo(() => {
    return (useCustomScript ? customScript : manifest?.segments?.map((s: any) => s.scriptText).filter(Boolean).join('\n\n')) || "Put your text here!";
  }, [useCustomScript, customScript, manifest]);

  // Auto-scroll logic with dynamic speed
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isReading && prompterRef.current && !isEditing) {
        interval = setInterval(() => {
            if (prompterRef.current) {
                prompterRef.current.scrollTop += (scrollSpeed / 10) * 1.5; 
            }
        }, 16); // 60fps for buttery smooth scroll
    }
    return () => clearInterval(interval);
  }, [isReading, prompterRef, scrollSpeed, isEditing]);

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
    setEditedText(scriptText);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    onScriptUpdate(editedText);
    setIsEditing(false);
  };

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center overflow-hidden bg-black rounded-[3rem] border border-white/10 shadow-2xl">
      {/* 📹 Video Foundation - Full Opacity per request */}
      <div className="absolute inset-0 z-0 bg-neutral-900">
        {cameraStream ? (
          <video 
            ref={videoPreviewRef}
            autoPlay 
            muted 
            playsInline
            className={`w-full h-full object-cover opacity-100 transition-transform duration-1000 ${isVideoMirrored ? 'scale-x-[-1]' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
             <Camera className="w-20 h-20 text-white/10 animate-pulse" />
          </div>
        )}
      </div>
      
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
      
      {/* 🔮 Top HUD - Reading Zone Marker */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black via-black/80 to-transparent z-40" />
      
      <div className="absolute top-8 left-0 right-0 px-6 flex items-center justify-between z-[45]">
        <button 
          onClick={onBack}
          className="w-12 h-12 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 transition-all active:scale-95"
        >
          <X size={24} />
        </button>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleStartEdit}
            className="w-12 h-12 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 transition-all active:scale-95"
          >
            <Edit3 size={20} />
          </button>
          <button 
            onClick={onFinish}
            className="px-6 h-12 rounded-2xl bg-purple-600 text-white font-black uppercase tracking-widest text-[10px] shadow-[0_0_30px_rgba(168,85,247,0.4)] border border-purple-500/30 flex items-center gap-2 transition-all active:scale-95 leading-none"
          >
            {locale === 'ru' ? 'В МОНТАЖ' : 'TO MONTAGE'}
            <ArrowLeft className="w-3 h-3 rotate-180" />
          </button>
        </div>
      </div>

      {/* 📜 Scrolling Text Canvas - Reading Zone at Lens (Top) */}
      <div 
        ref={prompterRef}
        className={`w-full h-full overflow-y-auto scrollbar-none relative z-10 ${isMirrored ? 'scale-x-[-1]' : ''}`}
        style={{ scrollBehavior: 'auto' }}
      >
        <div 
          id="scrolling-content"
          className="w-full space-y-12 transition-all duration-700 ease-out px-10 text-center flex flex-col pt-[18vh] pb-[100vh]"
        >
          {/* Eye Contact Guide (Optional/Subtle) */}
          <div className="absolute top-[18vh] inset-x-10 h-32 border-y border-white/5 pointer-events-none z-0" />
          
          <p className={`font-black uppercase leading-[1.2] transition-all duration-500 tracking-tighter text-white drop-shadow-[0_4px_30px_rgba(0,0,0,1)] ${
            textSize === 'sm' ? 'text-4xl' : textSize === 'lg' ? 'text-8xl' : 'text-6xl'
          }`}>
            {scriptText}
          </p>
        </div>
      </div>

      {/* 🛠️ Side Control Bar - Restored and Optimized */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-40">
        
        {/* Speed Controller: [ - ] SPEED [ + ] */}
        <div className="flex flex-col items-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-full py-3 px-1 gap-4 mb-4">
           <button 
             onClick={() => onSpeedChange(Math.max(1, scrollSpeed - 1))}
             className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-75 transition-all"
           >
              <span className="text-xl font-bold leading-none">-</span>
           </button>
           <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-purple-400 leading-none">{scrollSpeed}</span>
              <span className="text-[6px] font-black uppercase text-white/30 tracking-tighter mt-1">SPD</span>
           </div>
           <button 
             onClick={() => onSpeedChange(Math.min(20, scrollSpeed + 1))}
             className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-75 transition-all"
           >
              <span className="text-xl font-bold leading-none">+</span>
           </button>
        </div>

        <button 
          onClick={rotateTextSize}
          className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center text-white/80 transition-all active:scale-90"
        >
          <Type size={18} />
          <span className="text-[7px] font-black uppercase mt-0.5">{textSize}</span>
        </button>
        <button 
          onClick={rotateOpacity}
          className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center text-white/80 transition-all active:scale-90"
        >
          <Palette size={18} />
          <span className="text-[7px] font-black uppercase mt-0.5">{Math.round(scriptOpacity * 100)}%</span>
        </button>
        <button 
          onClick={onFlipCamera}
          className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center text-white/80 transition-all active:scale-90"
        >
          <RotateCw size={18} />
          <span className="text-[7px] font-black uppercase mt-0.5">Flip</span>
        </button>
      </div>

      {/* Recording Button - Center Bottom Fixed */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center z-50">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={onToggleRecording}
          className="w-24 h-24 rounded-full border-4 border-white flex items-center justify-center relative bg-black/20 backdrop-blur-md shadow-2xl"
        >
          <div className={`rounded-full transition-all duration-300 ${isRecordingVideo ? 'w-10 h-10 bg-red-600 rounded-lg animate-pulse shadow-[0_0_40px_rgba(239,68,68,0.8)]' : 'w-18 h-18 bg-red-600 shadow-[0_0_30px_rgba(239,68,68,0.5)]'}`} />
          
          {isRecordingVideo && (
            <div className="absolute -top-12 px-4 py-1.5 rounded-full bg-red-600 border border-red-400 text-white text-[9px] font-black tracking-widest uppercase flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
               Recording
            </div>
          )}
        </motion.button>
      </div>

      {/* Control elements removed per request */}

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
});
