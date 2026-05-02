import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ArrowLeft, Library, Square, 
  Settings, Type, Timer, Palette, Mic2, Camera,
  MoreVertical, Edit3, Check, RotateCw, Sparkles
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
  scriptColor: string;
  onScriptUpdate: (newText: string) => void;
  onColorChange?: (color: string) => void;
  onBack?: () => void;
  onToggleRecording?: () => void;
  onFlipCamera?: () => void;
  onTextSizeChange?: (size: 'sm' | 'md' | 'lg') => void;
  onOpacityChange?: (opacity: number) => void;
  scrollSpeed: number;
  onSpeedChange: (speed: number) => void;
  isRecordingVideo?: boolean;
  onFinish?: () => void;
  recordingTime?: number;
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
  scriptColor,
  onColorChange,
  recordingTime = 0,
  t,
}: TeleprompterViewProps) => {
  const router = useRouter();
  const locale = useLocale();
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedText, setEditedText] = React.useState('');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [suggestion, setSuggestion] = React.useState<string | null>(null);
  const [isUserInteracting, setIsUserInteracting] = React.useState(false);
  const interactionTimeout = React.useRef<NodeJS.Timeout | null>(null);
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

  // Auto-scroll logic with precision frequency for smoothness
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isReading && prompterRef.current && !isEditing) {
        interval = setInterval(() => {
            if (prompterRef.current) {
                // Smoother formula: base 0.4px + (speed * 0.15px) per 8ms
                // This targets 120fps-like smoothness
                prompterRef.current.scrollTop += (scrollSpeed * 0.08); 
                
                // Keep scrollPosRef synced to avoid jumps
                if (prompterRef.current.scrollTop >= prompterRef.current.scrollHeight - prompterRef.current.clientHeight) {
                  // End of script reached - auto stop or loop
                   // onFinish?.(); 
                }
            }
        }, 8); 
    }
    return () => clearInterval(interval);
  }, [isReading, prompterRef, scrollSpeed, isEditing]);

  const handleInteraction = () => {
    setIsUserInteracting(true);
    if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
    interactionTimeout.current = setTimeout(() => setIsUserInteracting(false), 1500);
  };

  const rotateTextSize = () => {
    if (!onTextSizeChange) return;
    const steps: ('sm' | 'md' | 'lg')[] = ['sm', 'md', 'lg'];
    const currentIdx = steps.indexOf(textSize);
    const nextIdx = (currentIdx + 1) % steps.length;
    onTextSizeChange(steps[nextIdx]);
  };

  const rotateColor = () => {
    if (!onColorChange) return;
    const colors = ['#ffffff', '#000000', '#FACC15', '#22C55E', '#3B82F6', '#A855F7', '#EF4444'];
    const currentIdx = colors.indexOf(scriptColor);
    const nextIdx = (currentIdx + 1) % colors.length;
    onColorChange(colors[nextIdx]);
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
    setSuggestion(null);
  };

  const handleAIRewrite = async (style: string) => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/script-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editedText, style, locale })
      });
      const data = await res.json();
      if (data.text) setSuggestion(data.text);
    } catch (err) {
      console.error('AI Rewrite failed:', err);
    } finally {
      setIsGenerating(false);
    }
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
      <AnimatePresence mode="wait">
        {countdown !== null && (
          <motion.div 
            key={countdown}
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none"
          >
            <span className="text-[200px] font-black italic text-white drop-shadow-[0_0_50px_rgba(0,0,0,0.8)]">
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
        onScroll={handleInteraction}
        onTouchStart={handleInteraction}
        className={`w-full h-full overflow-y-auto overflow-x-hidden scrollbar-none relative z-10 touch-pan-y ${isMirrored ? 'scale-x-[-1]' : ''}`}
        style={{ scrollBehavior: 'auto' }}
      >
        <div 
          id="scrolling-content"
          className="w-full space-y-12 transition-all duration-700 ease-out px-10 text-center flex flex-col pt-[18vh] pb-[100vh]"
        >
          {/* Eye Contact Guide (Optional/Subtle) */}
          <div className="absolute top-[18vh] inset-x-10 h-32 border-y border-white/5 pointer-events-none z-0" />
          
          <p 
            className={`font-medium leading-[1.3] transition-all duration-500 tracking-normal drop-shadow-[0_4px_40px_rgba(0,0,0,1)] ${
              textSize === 'sm' ? 'text-3xl' : textSize === 'lg' ? 'text-7xl sm:text-8xl' : 'text-5xl sm:text-6xl'
            }`}
            style={{ 
              fontFamily: "'Roboto', 'Inter', sans-serif",
              wordSpacing: '0.05em',
              color: scriptColor 
            }}
          >
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
          <span className="text-[6px] font-black uppercase mt-0.5">{textSize}</span>
        </button>

        <button 
          onClick={rotateColor}
          className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center text-white/80 transition-all active:scale-90"
        >
          <Palette size={18} style={{ color: scriptColor === '#000000' ? '#ffffff' : scriptColor }} />
          <span className="text-[6px] font-black uppercase mt-0.5" style={{ color: scriptColor === '#000000' ? '#ffffff' : scriptColor }}>COLOR</span>
        </button>

        <button 
          onClick={rotateOpacity}
          className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center text-white/80 transition-all active:scale-90"
        >
          <div className="w-4 h-4 rounded-full border border-white/40 overflow-hidden flex flex-col">
             <div className="flex-1 bg-white" style={{ opacity: scriptOpacity }} />
          </div>
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
          <div className={`transition-all duration-300 ${
            isRecordingVideo 
              ? 'w-10 h-10 bg-red-600 rounded-xl animate-pulse shadow-[0_0_40px_rgba(239,68,68,0.8)]' 
              : 'w-20 h-20 bg-red-600 rounded-full shadow-[0_0_30px_rgba(239,68,68,0.5)]'
          }`} />
          
          {isRecordingVideo && (
            <div className="absolute -top-12 px-4 py-1.5 rounded-full bg-red-600 border border-red-400 text-white text-[9px] font-black tracking-widest uppercase flex items-center gap-2 shadow-[0_0_30px_rgba(220,38,38,0.5)]">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>REC {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
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
            className="absolute inset-0 z-[110] bg-black/60 backdrop-blur-md p-10 flex flex-col gap-10"
          >
            <div className="flex items-center justify-between text-white">
              <h3 className="text-2xl font-black italic uppercase">Edit Script</h3>
              <div className="flex gap-4">
                <button onClick={() => setIsEditing(false)} className="p-4 rounded-2xl bg-white/5 border border-white/10"><X size={24} /></button>
                <button onClick={handleSaveEdit} className="px-10 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs flex items-center gap-3"><Check size={18} /> Apply</button>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
              <div className="flex-1 relative">
                <textarea
                  autoFocus
                  value={editedText}
                  onChange={(e) => {
                    setEditedText(e.target.value);
                    if (suggestion) setSuggestion(null);
                  }}
                  className="w-full h-full bg-transparent border border-white/5 rounded-[2rem] p-8 text-2xl font-bold text-white focus:outline-none focus:border-purple-500/30 transition-all resize-none shadow-inner leading-relaxed"
                />
                
                {isGenerating && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-10">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">AI Thinking...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Suggestion Box */}
              <AnimatePresence>
                {suggestion && (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    className="p-6 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex flex-col gap-4 shadow-xl"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-purple-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">Suggestion</span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setSuggestion(null)}
                          className="px-4 py-1.5 rounded-full bg-white/5 text-white/40 text-[9px] font-black uppercase tracking-tighter"
                        >
                          Discard
                        </button>
                        <button 
                          onClick={() => { setEditedText(suggestion); setSuggestion(null); }}
                          className="px-4 py-1.5 rounded-full bg-purple-600 text-white text-[9px] font-black uppercase tracking-tighter shadow-lg shadow-purple-900/40"
                        >
                          Use This Version
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-white/90 leading-relaxed italic">"{suggestion}"</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* AI Style Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[9px] font-black uppercase text-white/30 tracking-widest mr-2">Refine with AI:</span>
                {[
                  { id: 'shorter', label: 'Shorter', icon: Square },
                  { id: 'specific', label: 'Concrete', icon: Check },
                  { id: 'warmer', label: 'Warm', icon: Palette },
                  { id: 'humor', label: 'Funny', icon: Timer },
                ].map((style) => (
                  <button
                    key={style.id}
                    onClick={() => handleAIRewrite(style.id)}
                    disabled={isGenerating}
                    className="px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2 text-[10px] font-black uppercase text-white/60 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 disabled:opacity-30"
                  >
                    <style.icon size={12} className="text-purple-400" />
                    {style.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <input ref={fileInputRef} type="file" accept="video/*" className="hidden" />
    </div>
  );
});
