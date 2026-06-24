'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Send, X, Sparkles, Lock, 
  ChevronRight, RefreshCw, CheckCircle, Zap,
  Mic, MicOff, Copy, Volume2, VolumeX, Terminal
} from 'lucide-react';
import { strategistService, AccessStatus } from '@/lib/services/strategistService';
import { profileService, Profile } from '@/lib/services/profileService';
import { ProductionManifest, SceneSegment } from '@/lib/types/studio';
import { parseScriptTextToPayload } from '@/lib/studio-utils';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { VoiceVisualizer } from './VoiceVisualizer';
import { PremiumLimitModal } from '@/components/ui/PremiumLimitModal';
import { ScriptRotor } from '@/app/[locale]/app/(main)/projects/[id]/studio/_components/ScriptRotor';
import { v4 as uuidv4 } from 'uuid';


interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const parseMessageContent = (content: string) => {
  const scriptRegex = /<FINAL_SCRIPT>([\s\S]*?)(?:<\/FINAL_SCRIPT>|$)/i;
  const match = content.match(scriptRegex);
  if (match) {
    const textBefore = content.split(/<FINAL_SCRIPT>/i)[0].trim();
    const scriptText = match[1].replace(/<\/FINAL_SCRIPT>/i, '').trim();
    return { textBefore, scriptText };
  }
  return { textBefore: content, scriptText: null };
};

interface StrategistChatProps {
  projectId: string;
  manifest?: ProductionManifest;
  setManifest?: (manifest: ProductionManifest | ((prev: ProductionManifest | null) => ProductionManifest | null)) => void;
  userId: string;
  activeSegmentId?: string;
  locale?: string;
  context?: 'script' | 'storyboard' | 'studio' | 'production';
  onApplySuggestion?: (text: string) => void;
  onMatrixUpdate?: (matrix: any) => void;
  onUseScript?: (text: string) => void;
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
  onMatrixUpdate,
  onUseScript,
  containerClassName
}: StrategistChatProps & { containerClassName?: string }) {
  const t = useTranslations('Strategist');
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [access, setAccess] = useState<AccessStatus | null>(null);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAIPointing, setIsAIPointing] = useState(false);
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(0));
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [scriptMatrix, setScriptMatrix] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        { 
          role: 'assistant', 
          content: locale === 'ru' 
            ? "Привет! Я твой ИИ-Стратег 🧠 Чем займемся сегодня? Можем побрейнштормить новые идеи, обсудить любые вопросы или сразу написать сценарий для вирусного рилса. Какие мысли?" 
            : "Hi! I'm your AI Strategist 🧠 What are we doing today? We can brainstorm new ideas, discuss strategy questions, or jump straight into writing a script for a viral reel. What's on your mind?" 
        }
      ]);
    }
  }, [locale, messages.length]);

  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<any | null>(null);
  const analyserRef = useRef<any | null>(null);
  const mediaRecorderRef = useRef<any | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<any | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (!userId) return;
      try {
        const [status, prof] = await Promise.all([
          strategistService.getAccessStatus(userId),
          profileService.getProfile(userId)
        ]);
        setAccess(status);
        setProfile(prof);
      } catch (err: any) {
        console.error('[StrategistChat] Access & Profile Check Failed:', err);
      }
    };
    checkAccess();
  }, [userId]);

  useEffect(() => {
    (messagesEndRef.current as any)?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isVoiceMode, isRecording, isStreaming, isAIPointing]);

  const initAudio = () => {
    if (!audioContextRef.current) {
      const win = (globalThis as any).window; audioContextRef.current = win ? new (win.AudioContext || win.webkitAudioContext)() : null;
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
      const nav = (globalThis as any).navigator; 
      const stream = nav ? await nav.mediaDevices.getUserMedia({ audio: true }) : null;
      if (!stream) return;

      const source = audioContextRef.current!.createMediaStreamSource(stream);
      source.connect(analyserRef.current!);

      const mr_class = (globalThis as any).MediaRecorder; 
      const recorder = mr_class ? new mr_class(stream) : null;
      if (!recorder) return;
      
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e: any) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        handleSend(audioBlob);
        stream.getTracks().forEach((track: any) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setIsVoiceMode(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error('Error stopping recorder:', err);
      }
    }
    setIsRecording(false);
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
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
        
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = assistantMessage;
          return newMessages;
        });
      }

      // --- JSON DETECTOR ---
      // Try to parse the assistant message for the 5x4 matrix or structured plan
      try {
        // Look for the last JSON block in case there's multiple or partial ones
        const matches = assistantMessage.match(/\{[\s\S]*\}/g);
        if (matches) {
          const lastMatch = matches[matches.length - 1];
          // Clean up potential markdown code block markers
          const cleanJson = lastMatch.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          
          if ((parsed.styles && Array.isArray(parsed.styles)) || (parsed.evergreen && parsed.trend)) {
            setScriptMatrix(parsed);
            if (onMatrixUpdate) onMatrixUpdate(parsed);
          }
        }
      } catch (e) {
        // Silently ignore parsing errors for non-matrix messages
      }

      // If in voice mode, speak the final response
      if (isVoiceMode) {
        speakResponse(assistantMessage);
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = locale === 'ru'
        ? "Извини, произошла техническая ошибка. Пожалуйста, попробуй еще раз."
        : "Sorry, I lost my train of thought. Please try again.";
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
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
      
      const audio_class = (globalThis as any).Audio; const audio = audio_class ? new audio_class(url) : null;
      if (!audio) return;
      audioPlayerRef.current = audio;
      
      const source = audioContextRef.current!.createMediaElementSource(audio);
      source.connect(analyserRef.current!);
      analyserRef.current!.connect(audioContextRef.current!.destination);

      audio.onended = () => {
        setIsAIPointing(false);
        URL.revokeObjectURL(url);
      };

      await audio.play();
    } catch (err) {
      console.error('TTS Playback error:', err);
      setIsAIPointing(false);
    }
  };

  const copyToClipboard = (text: string, id: number) => {
    const nav = (globalThis as any).navigator; if (nav && nav.clipboard) nav.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const applySuggestion = (newText: string) => {
    // 1. If custom callback provided, use it
    if (onApplySuggestion) {
      onApplySuggestion(newText);
      setMessages(curr => [...curr, { 
        role: 'assistant', 
        content: "Applied! Your strategy is now part of the creative canvas." 
      }]);
      return;
    }

    // 2. Fallback to intelligent manifest update
    if (setManifest && manifest) {
      const newManifest = { ...manifest };
      
      // Attempt to parse structured script (Hook/Body/CTA/TRIZ)
      const hasStructure = /hook:|body:|cta:|intro:|outro:|хук:|тело:|призыв:|триз:|перевертыш:/i.test(newText);
      
      if (hasStructure) {
        // Smart distribution
        const segments = [...newManifest.segments];
        const parsed = parseScriptTextToPayload(newText);

        if (parsed.hook && segments[0]) segments[0].scriptText = parsed.hook;
        if (parsed.body && segments[1]) segments[1].scriptText = parsed.body;
        if (parsed.triz_inversion && segments[2]) segments[2].scriptText = parsed.triz_inversion;
        if (parsed.cta && segments[segments.length - 1]) segments[segments.length - 1].scriptText = parsed.cta;
        
        newManifest.segments = segments;
      } else if (activeSegmentId) {
        // Single segment update
        const segmentIndex = newManifest.segments.findIndex(s => s.id === activeSegmentId);
        if (segmentIndex !== -1) {
          const segment = newManifest.segments[segmentIndex];
          if (segment.type === 'animated_still' || segment.type === 'broll') {
            newManifest.segments[segmentIndex].prompt = newText;
          } else {
            newManifest.segments[segmentIndex].scriptText = newText;
          }
        }
      } else {
        // No active segment, but structured text not found - update first empty or first segment
        if (newManifest.segments[0]) newManifest.segments[0].scriptText = newText;
      }
      
      setManifest(newManifest);
      setMessages(curr => [...curr, { 
        role: 'assistant', 
        content: "Matrix updated. The new narrative structure is now live in your production pipeline." 
      }]);
    } else {
      // 3. Just copy to clipboard if no target action
      copyToClipboard(newText, messages.length);
    }
  };

  const handleToggleClick = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    // Refresh access and profile dynamically on click to catch plan upgrades immediately!
    if (userId) {
      try {
        const [status, prof] = await Promise.all([
          strategistService.getAccessStatus(userId),
          profileService.getProfile(userId)
        ]);
        setAccess(status);
        setProfile(prof);
        
        if (prof?.tier === 'pro' || status?.hasAccess) {
          setIsOpen(true);
        } else {
          setShowUpgradeModal(true);
        }
      } catch (err) {
        console.error('[StrategistChat] Failed to refresh access on toggle click:', err);
        // fallback to existing loaded state
        if (profile?.tier === 'pro' || access?.hasAccess) {
          setIsOpen(true);
        } else {
          setShowUpgradeModal(true);
        }
      }
    } else {
      if (profile?.tier === 'pro' || access?.hasAccess) {
        setIsOpen(true);
      } else {
        setShowUpgradeModal(true);
      }
    }
  };

  return (
    <>
      {/* Floating Toggle Button Container */}
      <div 
        className={containerClassName || "fixed right-6 z-[100] flex flex-col items-end"}
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 24px)'
        }}
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleToggleClick}
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
      </div>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150]" 
            onClick={() => setIsOpen(false)} 
          />
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed inset-x-4 top-[calc(env(safe-area-inset-top,0px)+80px)] bottom-[calc(env(safe-area-inset-bottom,0px)+100px)] md:inset-auto md:top-24 md:right-6 md:w-[450px] md:h-[70vh] bg-black/90 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-[160]"
          >
            {/* Background Visualizer */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar z-10 relative">
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
                    {(() => {
                      const { textBefore, scriptText } = parseMessageContent(m.content);
                      return (
                        <div className="space-y-3">
                          {textBefore && <p className="leading-relaxed whitespace-pre-wrap">{textBefore}</p>}
                          {scriptText && (
                            <div className="mt-2 p-3 bg-black/50 border border-purple-500/30 rounded-xl font-mono text-xs text-purple-200 select-text relative overflow-hidden shadow-inner leading-relaxed">
                              <div className="absolute top-0 right-0 bg-purple-500/20 px-2 py-0.5 text-[8px] font-black uppercase text-purple-300 border-l border-b border-purple-500/20">
                                Сценарий
                              </div>
                              <p className="whitespace-pre-wrap">{scriptText}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    
                    {/* Copy to Clipboard - More visible on hover */}
                    {m.role === 'assistant' && !isStreaming && (
                      <button 
                        onClick={() => {
                          const { scriptText } = parseMessageContent(m.content);
                          copyToClipboard(scriptText || m.content, i);
                        }}
                        className="absolute -right-10 top-0 p-2 opacity-0 group-hover/message:opacity-100 text-slate-500 hover:text-white transition-all bg-white/5 rounded-xl border border-white/10"
                        title="Copy to Clipboard"
                      >
                        {copiedId === i ? <CheckCircle className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                  {/* Action suggesting for assistant messages */}
                  {m.role === 'assistant' && i === messages.length - 1 && !isStreaming && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(() => {
                        const { scriptText } = parseMessageContent(m.content);
                        if (scriptText) {
                          return (
                            <button 
                               onClick={() => {
                                 // 1. Copy scriptText to clipboard
                                 const nav = (globalThis as any).navigator; if (nav && nav.clipboard) nav.clipboard.writeText(scriptText);
                                 setCopiedId(i);
                                 setTimeout(() => setCopiedId(null), 2000);
                                 // 2. Close panel
                                 setIsOpen(false);
                                 // 3. Callback
                                 if (onUseScript) onUseScript(scriptText);
                                 else applySuggestion(scriptText);
                               }}
                               className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] active:scale-95 group/use"
                            >
                              <Zap className="h-3.5 w-3.5 text-yellow-300 group-hover/use:animate-pulse" /> 
                              {locale === 'ru' ? 'Экспорт в Готовый Рилс' : 'Export to Ready Reel'}
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              ))}
              {/* Voice Status Indicator */}
              {isVoiceMode && (isRecording || isStreaming || isAIPointing) && (
                <div className="flex justify-center my-2 sticky bottom-0 pointer-events-none z-20">
                  <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-2xl pointer-events-auto">
                    {isRecording && (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                          {locale === 'ru' ? 'Слушаю...' : 'Listening...'}
                        </span>
                      </>
                    )}
                    {!isRecording && isStreaming && (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                          {locale === 'ru' ? 'Думаю...' : 'Strategizing...'}
                        </span>
                      </>
                    )}
                    {!isRecording && !isStreaming && isAIPointing && (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-green-400 animate-pulse" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                          {locale === 'ru' ? 'Говорю...' : 'Speaking...'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>



            {/* Input Area */}
            <div className="p-4 bg-slate-900/60 border-t border-white/5 z-30 relative">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <textarea
                    value={input}
                    onChange={(e) => setInput((e.target as any).value)}
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
                  onClick={handleMicClick}
                  className={cn(
                    "h-12 w-12 flex items-center justify-center rounded-xl transition-all duration-300",
                    isRecording 
                      ? "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-110" 
                      : "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white"
                  )}
                  title={locale === 'ru' ? (isRecording ? "Остановить и отправить" : "Записать сообщение") : (isRecording ? "Stop and Send" : "Record Voice Message")}
                >
                  {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
              </div>
              <p className="mt-2 text-[10px] text-slate-500 text-center">
                {locale === 'ru' 
                  ? (isRecording ? "Идет запись... Нажмите на микрофон повторно для отправки" : "Нажмите микрофон для записи • Удерживайте Пробел для быстрой надиктовки")
                  : (isRecording ? "Recording... Click microphone again to stop and send" : "Click mic to record • Hold Space for voice shorthand")}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PremiumLimitModal 
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        title={locale === 'ru' ? 'Доступ ограничен' : 'Access Restricted'}
        description={locale === 'ru' 
          ? 'Ваш доступ к Стратегу закончился. Перейдите на премиум-план, чтобы продолжить работу.' 
          : 'Your access to the Strategist has ended. Upgrade to a premium plan to continue.'}
        type="trial"
        locale={locale}
      />

      <PremiumLimitModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title={locale === 'ru' ? 'ИИ Стратег заблокирован' : 'AI Strategist Locked'}
        description={locale === 'ru' 
          ? 'Функция "ИИ Стратег" доступна только для пользователей с Pro-пакетом. Обновите ваш пакет для продолжения.' 
          : 'The AI Strategist feature is only available for users with the Pro package. Upgrade your package to continue.'}
        type="tier_upgrade"
        locale={locale}
      />

      {/* Structured Rotor View */}
      <AnimatePresence>
        {scriptMatrix && (
          <ScriptRotor 
            matrix={scriptMatrix}
            onClose={() => setScriptMatrix(null)}
            onApply={(finalScriptText) => {
              // Populate manifest with segments from the combined script
              if (setManifest && manifest) {
                const lines = finalScriptText.split('\n\n').filter(l => l.trim().length > 0);
                const newSegments = lines.map((text, i) => ({
                  id: uuidv4(),
                  type: 'user_recording' as const,
                  scriptText: text,
                  status: 'completed' as const,
                  prompt: `Visual for: ${text.substring(0, 40)}...`
                }));
                
                setManifest({
                  ...manifest,
                  segments: newSegments
                });

                // --- NEW: Pre-generate Distribution Assets in Background ---
                (async () => {
                  try {
                    const res = await fetch('/api/ai/distribution-assets', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ scriptText: finalScriptText, projectId, locale })
                    });
                    if (res.ok) {
                      const assetData = await res.json();
                      
                      // Save text assets first
                      setManifest((prev: ProductionManifest | null) => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          distributionAssets: {
                            ...assetData,
                            lastGenerated: Date.now()
                          }
                        };
                      });

                      // Start background image generation
                      const platforms = ['instagram', 'youtube'] as const;
                      for (const p of platforms) {
                        const prompts = p === 'instagram' ? assetData.instagram.carouselPrompts : [assetData.youtube.thumbnailPrompt];
                        const ar = p === 'instagram' ? '1:1' : '16:9';
                        
                        for (const prompt of prompts) {
                          const imgRes = await fetch('/api/ai/image-gen', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ prompt, aspect_ratio: ar })
                          });
                          if (imgRes.ok) {
                            const imgData = await imgRes.ok ? await imgRes.json() : null;
                            if (imgData?.url) {
                              setManifest((prev: ProductionManifest | null) => {
                                if (!prev) return prev;
                                const current = prev.distributionAssets || {};
                                if (p === 'instagram') {
                                  const ig = current.instagram || { caption: '', carouselPrompts: [] };
                                  const urls = [...(ig.carouselUrls || []), imgData.url];
                                  return { ...prev, distributionAssets: { ...current, instagram: { ...ig, carouselUrls: urls } } };
                                } else {
                                  const yt = current.youtube || { description: '', thumbnailPrompt: '' };
                                  return { ...prev, distributionAssets: { ...current, youtube: { ...yt, thumbnailUrl: imgData.url } } };
                                }
                              });
                            }
                          }
                        }
                      }
                    }
                  } catch (e) {
                    console.error('[Background Asset Gen Error]:', e);
                  }
                })();
                
                setMessages(prev => [...prev, { 
                  role: 'assistant', 
                  content: locale === 'ru' 
                    ? "Успех! Гибридная матрица создана. Я также начал генерацию постов и обложек для соцсетей в фоновом режиме." 
                    : "Success! The hybrid matrix is forged. I've also started generating social media posts and covers in the background." 
                }]);
              }
              setScriptMatrix(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
