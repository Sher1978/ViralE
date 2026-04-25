'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Send, X, Sparkles, Lock, 
  ChevronRight, RefreshCw, CheckCircle, Zap,
  Mic, MicOff, Copy, Volume2, VolumeX, Terminal
} from 'lucide-react';
import { strategistService, AccessStatus } from '@/lib/services/strategistService';
import { ProductionManifest, SceneSegment } from '@/lib/types/studio';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { VoiceVisualizer } from './VoiceVisualizer';
import { PremiumLimitModal } from '@/components/ui/PremiumLimitModal';


interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface StrategistChatProps {
  projectId: string;
  manifest?: ProductionManifest;
  setManifest?: (manifest: ProductionManifest) => void;
  userId: string;
  activeSegmentId?: string;
  locale?: string;
  context?: 'script' | 'storyboard' | 'studio' | 'production';
  onApplySuggestion?: (text: string) => void;
}

export function StrategistChat({
  projectId,
  manifest,
  setManifest,
  userId,
  activeSegmentId,
  locale = 'en',
  context = 'studio',
  onApplySuggestion,
  containerClassName
}: StrategistChatProps & { containerClassName?: string }) {
  const t = useTranslations('Strategist');
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "I'm your Viral Strategist. How can I help you dominate the algorithm today?" }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [access, setAccess] = useState<AccessStatus | null>(null);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAIPointing, setIsAIPointing] = useState(false);
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(0));
  const [captions, setCaptions] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (!userId) return;
      try {
        const status = await strategistService.getAccessStatus(userId);
        setAccess(status);
      } catch (err) {
        console.error('Failed to check strategist access:', err);
      }
    };
    checkAccess();
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateFrequency = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          setFrequencyData(new Uint8Array(dataArray));
        }
        animationRef.current = requestAnimationFrame(updateFrequency);
      };
      updateFrequency();
    }
  };

  const startRecording = async () => {
    initAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContextRef.current!.createMediaStreamSource(stream);
      source.connect(analyserRef.current!);

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        handleSend(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setIsVoiceMode(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSend = async (audioBlob?: Blob) => {
    if (!input.trim() && !audioBlob || isStreaming) return;

    const userMessage = input || (audioBlob ? "🎙️ [Voice Message]" : "");
    if (!audioBlob) setInput('');
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsStreaming(true);

    try {
      const formData = new FormData();
      formData.append('messages', JSON.stringify([...messages, { role: 'user', content: userMessage }]));
      formData.append('projectId', projectId);
      formData.append('locale', locale);
      if (audioBlob) formData.append('audio', audioBlob);

      const response = await fetch('/api/ai/strategist', {
        method: 'POST',
        body: formData,
      });

      if (response.status === 403) {
        setShowLimitModal(true);
        setIsStreaming(false);
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch strategy');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        assistantMessage += chunk;
        setCaptions(assistantMessage);
        
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = assistantMessage;
          return newMessages;
        });
      }

      // If in voice mode, speak the final response
      if (isVoiceMode) {
        speakResponse(assistantMessage);
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I lost my train of thought. Please try again." }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const speakResponse = async (text: string) => {
    try {
      setIsAIPointing(true);
      const response = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error('TTS failed');

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(url);
      audioPlayerRef.current = audio;
      
      const source = audioContextRef.current!.createMediaElementSource(audio);
      source.connect(analyserRef.current!);
      analyserRef.current!.connect(audioContextRef.current!.destination);

      audio.onended = () => {
        setIsAIPointing(false);
        setCaptions('');
        URL.revokeObjectURL(url);
      };

      await audio.play();
    } catch (err) {
      console.error('TTS Playback error:', err);
      setIsAIPointing(false);
    }
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const applySuggestion = (newText: string) => {
    // 1. If custom callback provided, use it
    if (onApplySuggestion) {
      onApplySuggestion(newText);
      setMessages(curr => [...curr, { 
        role: 'assistant', 
        content: "Applied! Redirecting strategy to the creative canvas." 
      }]);
      return;
    }

    // 2. Fallback to active segment update if in studio and manifest exists
    if (context === 'studio' && activeSegmentId && setManifest && manifest) {
      const newManifest = { ...manifest };
      const segmentIndex = newManifest.segments.findIndex(s => s.id === activeSegmentId);
      
      if (segmentIndex !== -1) {
          const segment = newManifest.segments[segmentIndex];
          if (segment.type === 'animated_still' || segment.type === 'broll') {
            newManifest.segments[segmentIndex].prompt = newText;
          } else {
            newManifest.segments[segmentIndex].scriptText = newText;
            if (!segment.prompt || segment.prompt.length < 10) {
              newManifest.segments[segmentIndex].prompt = `Visual for: ${newText.substring(0, 50)}...`;
            }
          }
          
          setManifest(newManifest);
          setMessages(curr => [...curr, { 
            role: 'assistant', 
            content: "Done! I've updated the segment with the new strategy." 
          }]);
        }
    } else {
      // 3. Just copy to clipboard if no target action
      copyToClipboard(newText, messages.length);
    }
  };

  return (
    <div className={containerClassName || "fixed top-[28px] left-6 z-[100] flex flex-col items-start"}>
      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative h-12 w-12 rounded-xl shadow-2xl flex items-center justify-center transition-all duration-500 overflow-hidden border-2",
          isOpen 
            ? "bg-red-500/80 backdrop-blur-md border-red-400/50" 
            : "bg-black/80 backdrop-blur-md border-white/20"
        )}
      >
        {isOpen ? (
          <X className="text-white h-6 w-6" />
        ) : (
          <img 
            src="/icon-512x512.png" 
            alt="Advisor" 
            className="w-full h-full object-cover scale-110"
          />
        )}
        {!isOpen && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-1 -right-1 h-4 w-4 bg-yellow-400 rounded-full border-2 border-slate-900"
          />
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="mt-4 w-[380px] h-[600px] bg-black/80 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden relative"
          >
            {/* Background Visualizer */}
            <div className={cn(
              "absolute inset-0 z-0 pointer-events-none overflow-hidden transition-all duration-1000",
              isVoiceMode ? "h-[60%]" : "h-full"
            )}>
              <VoiceVisualizer 
                isActive={isVoiceMode} 
                isListening={isRecording} 
                isSpeaking={isAIPointing} 
                frequencyData={frequencyData}
              />
            </div>
            {/* Header */}
            <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between z-10 relative">
              <div className="flex items-center gap-3">
                <div className="bg-purple-500/20 p-2 rounded-lg">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Viral Strategist</h3>
                  <p className="text-[10px] text-purple-300 uppercase tracking-widest font-bold">Sherlock AI Engine</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isVoiceMode && (
                  <button 
                    onClick={() => setIsVoiceMode(false)}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                    title="Switch to Text Mode"
                  >
                    <Terminal className="h-4 w-4" />
                  </button>
                )}
                {access?.status === 'trial' && (
                  <div className="px-2 py-0.5 bg-yellow-400/10 border border-yellow-400/20 rounded text-[9px] text-yellow-400 font-medium">
                    24H TRIAL
                  </div>
                )}
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className={cn(
              "flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar z-10 relative transition-opacity duration-500",
              isVoiceMode ? "opacity-0 pointer-events-none" : "opacity-100"
            )}>
              {messages.map((m, i) => (
                <div key={i} className={cn("flex flex-col group", m.role === 'user' ? "items-end" : "items-start")}>
                  {m.role === 'assistant' && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-purple-400/60 mb-1 ml-1 flex items-center gap-1.5">
                      <Terminal className="w-2.5 h-2.5" /> {t('strategistIntelligence')}
                    </span>
                  )}
                  <div className={cn(
                    "max-w-[85%] p-3 rounded-2xl text-sm relative group/message transition-all",
                    m.role === 'user' 
                      ? "bg-purple-600/40 text-white rounded-tr-none border border-purple-500/30" 
                      : "bg-white/5 text-slate-200 rounded-tl-none border border-white/5 hover:bg-white/10"
                  )}>
                    {m.content}
                    
                    {/* Copy to Clipboard - More visible on hover */}
                    {m.role === 'assistant' && !isStreaming && (
                      <button 
                        onClick={() => copyToClipboard(m.content, i)}
                        className="absolute -right-10 top-0 p-2 opacity-0 group-hover/message:opacity-100 text-slate-500 hover:text-white transition-all bg-white/5 rounded-xl border border-white/10"
                        title="Copy to Clipboard"
                      >
                        {copiedId === i ? <CheckCircle className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                  {/* Action suggesting for assistant messages that look like advice */}
                  {m.role === 'assistant' && i === messages.length - 1 && !isStreaming && m.content.length > 20 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button 
                         onClick={() => applySuggestion(m.content)}
                         className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 hover:from-purple-600/40 hover:to-blue-600/40 border border-purple-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg active:scale-95 group/apply"
                      >
                        <Zap className="h-3 w-3 text-yellow-400 group-hover/apply:animate-pulse" /> 
                        {t('applyToScript')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Voice Mode Teleprompter Overlay */}
            <AnimatePresence>
              {isVoiceMode && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex flex-col pointer-events-none"
                >
                  {/* Top: Visualizer space */}
                  <div className="flex-1" />

                  {/* Bottom: Teleprompter */}
                  <div className="h-[45%] bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent p-4 flex flex-col justify-end overflow-hidden pb-8">
                    <div className="relative h-32 overflow-hidden mask-fade-edges">
                      <motion.div
                        animate={{ 
                          y: isAIPointing ? -Math.max(0, captions.split('\n').length - 2) * 22 : 0 
                        }}
                        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                        className="flex flex-col gap-1 items-center"
                      >
                        {isRecording ? (
                          <motion.div 
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="flex flex-col items-center gap-2"
                          >
                            <span className="text-[10px] font-black tracking-[0.3em] text-blue-400 uppercase leading-none">Scanning Voice</span>
                            <div className="h-[1px] w-12 bg-blue-500/50" />
                          </motion.div>
                        ) : !isAIPointing && isStreaming ? (
                          <div className="flex flex-col items-center gap-2">
                             <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
                             <span className="text-[9px] font-black tracking-widest text-purple-400/60 uppercase">Architecting...</span>
                          </div>
                        ) : (
                          captions.split('\n').map((line, idx) => (
                            <motion.p 
                              key={idx}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={cn(
                                "text-[12px] leading-relaxed text-center px-6 transition-all duration-700",
                                idx === captions.split('\n').length - 1 
                                  ? "text-white font-bold scale-100" 
                                  : "text-white/20 font-medium scale-95"
                              )}
                            >
                              {line}
                            </motion.p>
                          ))
                        )}
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Area */}
            <div className="p-4 bg-slate-900/60 border-t border-white/5 z-30 relative">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                      // Space shortcut for Voice Mode (if focused)
                      if (e.code === 'Space' && !input && !e.repeat) {
                        e.preventDefault();
                        if (!isRecording) startRecording();
                      }
                    }}
                    onKeyUp={(e) => {
                      if (e.code === 'Space' && !input && isRecording) {
                        e.preventDefault();
                        stopRecording();
                      }
                    }}
                    placeholder={isVoiceMode ? "I'm listening..." : "Ask for headlines, hooks, or strategy..."}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none h-12"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={(!input.trim() && !isRecording) || isStreaming}
                    className="absolute top-1/2 -translate-y-1/2 right-3 p-1.5 bg-purple-600 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-500 transition-colors"
                  >
                    {isStreaming ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
                
                {/* Voice Control Button */}
                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  className={cn(
                    "h-12 w-12 flex items-center justify-center rounded-xl transition-all duration-300",
                    isRecording 
                      ? "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-110" 
                      : "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white"
                  )}
                  title="Push to Talk"
                >
                  {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
              </div>
              <p className="mt-2 text-[10px] text-slate-500 text-center">
                {isVoiceMode ? "Press and Hold Mic to speak • Voice Mode: ON" : "Hold Space for voice shorthand • Context: Digital Shadow"}
              </p>
            </div>

      <PremiumLimitModal 
        isOpen={showLimitModal || access?.hasAccess === false}
        onClose={() => setShowLimitModal(false)}
        title={locale === 'ru' ? 'Доступ ограничен' : 'Access Restricted'}
        description={locale === 'ru' 
          ? 'Ваш доступ к Стратегу закончился. Перейдите на премиум-план, чтобы продолжить работу.' 
          : 'Your access to the Strategist has ended. Upgrade to a premium plan to continue.'}
        type="trial"
        locale={locale}
      />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
