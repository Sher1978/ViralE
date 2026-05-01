'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Camera, Mic, Square, Play, Upload, Settings, RefreshCw, X, Check, Volume2, Mic2, Sparkles, ShieldCheck, Headphones, Bluetooth } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Teleprompter from './Teleprompter';
import { useVoiceFollowing } from '@/hooks/useVoiceFollowing';
import { supabase } from '@/lib/supabase';
import { renderService } from '@/lib/services/renderService';

interface StudioRecorderProps {
  projectId: string;
  script: {
    hook: string;
    story: string;
    cta: string;
  };
  onComplete: (assetId: string, url: string) => void;
  onCancel: () => void;
}

export default function StudioRecorder({ projectId, script, onComplete, onCancel }: StudioRecorderProps) {
  const t = useTranslations('production');
  const [mode, setMode] = useState<'voice' | 'video'>('video');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [prompterSpeed, setPrompterSpeed] = useState(15);
  const [fontSize, setFontSize] = useState(48);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [themeColor, setThemeColor] = useState('text-white');
  const [isMirrored, setIsMirrored] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isVoiceFollowing, setIsVoiceFollowing] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [scriptSource, setScriptSource] = useState<'ai' | 'custom'>('ai');
  const [customScript, setCustomScript] = useState<string>('');
  // Audio device selection
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Enumerate audio input devices (works on Android, best-effort on iOS)
  const refreshAudioDevices = useCallback(async () => {
    try {
      // Must request permission first for labels to appear
      await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop()));
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter(d => d.kind === 'audioinput');
      setAudioDevices(inputs);
      // Auto-select first device if none selected
      if (!selectedAudioDeviceId && inputs.length > 0) {
        setSelectedAudioDeviceId(inputs[0].deviceId);
      }
    } catch (err) {
      console.warn('[Audio Devices] Could not enumerate:', err);
    }
  }, [selectedAudioDeviceId]);

  // Initialize Media Stream
  useEffect(() => {
    async function startStream() {
      try {
        const audioConstraints: MediaTrackConstraints = selectedAudioDeviceId
          ? { deviceId: { exact: selectedAudioDeviceId } }
          : true as any;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: mode === 'video',
          audio: audioConstraints
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setPermissionError(null);
      } catch (err: any) {
        setPermissionError(mode === 'video' ? t('camAccessError') : t('micAccessError'));
        console.error('Media Access Error:', err);
      }
    }

    startStream();
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [mode, t, selectedAudioDeviceId]);

  const startRecording = () => {
    if (!streamRef.current) return;
    
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, {
      mimeType: mode === 'video' ? 'video/webm' : 'audio/webm'
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordingUrl(url);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleUpload = async () => {
    if (!recordedBlob) return;
    setIsUploading(true);

    try {
      const { assetId, publicUrl } = await renderService.uploadMedia(
        projectId, 
        recordedBlob, 
        mode === 'video' ? 'video' : 'audio'
      );

      onComplete(assetId, publicUrl);
    } catch (err: any) {
      console.error('Upload Error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setCustomScript(text);
      setScriptSource('custom');
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  const activeScript = scriptSource === 'ai' ? script : customScript;
  const scriptText = typeof activeScript === 'string' 
    ? activeScript 
    : `${activeScript.hook}\n${activeScript.story}\n${activeScript.cta}`;

  const { currentLineIndex, isListening } = useVoiceFollowing({
    script: scriptText,
    isActive: isVoiceFollowing && isRecording
  });

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-center p-4">
      {/* HUD Header */}
      <div className="absolute top-8 left-8 right-8 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-white/40" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">
              {t('recordingStudioTitle')}
            </h2>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">
              {t('recordingStudioSub')}
            </p>
          </div>
        </div>

        <button 
          onClick={onCancel}
          className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/20 group transition-all pointer-events-auto"
        >
          <X className="w-6 h-6 text-white/40 group-hover:text-red-500" />
        </button>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch pt-20">
        {/* Mirror / Preview Panel */}
        <div className="relative aspect-[9/16] lg:aspect-auto bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
          {mode === 'video' ? (
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              className="w-full h-full object-cover grayscale opacity-50 scale-x-[-1]" 
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <Volume2 className={`w-12 h-12 ${isRecording ? 'text-cyan-400 animate-pulse' : 'text-white/20'}`} />
              </div>
              <p className="text-xs text-white/20 uppercase tracking-[0.2em] font-bold">Recording Room</p>
            </div>
          )}

          {/* Recording Status Overlay */}
          {isRecording && (
            <>
              <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.5)] z-20 animate-scan pointer-events-none" />
              <div className="absolute top-8 right-8 flex flex-col items-end gap-2 z-30">
                <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/40 rounded-full">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-400">REC</span>
                </div>
                {isVoiceFollowing && (
                  <motion.div 
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-colors ${isListening ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-white/5 border-white/10 text-white/20'}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-cyan-400 animate-bounce' : 'bg-white/20'}`} />
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      {isListening ? t('listening') : t('voiceFollowing')}
                    </span>
                  </motion.div>
                )}
              </div>
            </>
          )}

          {/* Permission Error */}
          {permissionError && (
            <div className="absolute inset-0 flex items-center justify-center p-12 text-center">
              <div className="space-y-4">
                <ShieldCheck className="w-12 h-12 text-red-500/40 mx-auto" />
                <p className="text-sm font-bold text-red-400 uppercase tracking-tighter italic leading-tight">
                  {permissionError}
                </p>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-white/10 border border-white/10 rounded-full text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-all text-white"
                >
                  Retry Permissions
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Teleprompter Panel */}
        <div className="flex flex-col gap-6">
          <div className="flex-1 min-h-[400px]">
              <Teleprompter 
                script={activeScript} 
                isPlaying={isRecording} 
                speed={prompterSpeed}
                fontSize={fontSize}
                themeColor={themeColor}
                letterSpacing={letterSpacing}
                isMirrored={isMirrored}
                currentLineIndex={currentLineIndex}
                isVoiceFollowing={isVoiceFollowing}
              />
          </div>

          {/* Studio Controls */}
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex p-1 bg-black/40 border border-white/10 rounded-2xl flex-1 max-w-[300px]">
                <button 
                  onClick={() => setMode('video')}
                  className={`flex-1 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${mode === 'video' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
                >
                  <Camera className="w-3 h-3" /> {t('modeVideo')}
                </button>
                <button 
                  onClick={() => setMode('voice')}
                  className={`flex-1 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${mode === 'voice' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
                >
                  <Mic className="w-3 h-3" /> {t('modeVoice')}
                </button>
              </div>

              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${showSettings ? 'bg-cyan-500 border-cyan-500 text-black' : 'bg-black/40 border-white/10 text-white/40 hover:text-white'}`}
              >
                <Settings className={`w-5 h-5 ${showSettings ? 'animate-spin-slow' : ''}`} />
              </button>

              <div className="flex items-center gap-4 bg-black/40 border border-white/10 p-2 rounded-2xl flex-1">
                 <span className="text-[10px] font-black uppercase tracking-widest text-white/20 italic pl-2">SPEED</span>
                 <input 
                   type="range" 
                   min="5" 
                   max="40" 
                   value={prompterSpeed}
                   onChange={(e) => setPrompterSpeed(Number(e.target.value))}
                   className="flex-1 accent-white opacity-40 hover:opacity-100 transition-opacity"
                 />
                 <button 
                 onClick={() => setIsVoiceFollowing(!isVoiceFollowing)}
                 className={`px-4 py-2 rounded-2xl border flex items-center gap-2 transition-all ${isVoiceFollowing ? 'bg-cyan-500 border-cyan-500 text-black' : 'bg-black/40 border-white/10 text-white/40 hover:text-white'}`}
               >
                 <Sparkles className={`w-3 h-3 ${isVoiceFollowing && isRecording ? 'animate-pulse' : ''}`} />
                 <span className="text-[10px] font-black uppercase tracking-widest">{t('aiFollowToggle')}</span>
               </button>
            </div>
            </div>

            {/* Script Source Toggle & Custom Input */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setScriptSource('ai')}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${scriptSource === 'ai' ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-white/5 border-white/10 text-white/40'}`}
                  >
                    {t('aiScript')}
                  </button>
                  <button 
                    onClick={() => setScriptSource('custom')}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${scriptSource === 'custom' ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-white/5 border-white/10 text-white/40'}`}
                  >
                    {t('customScript')}
                  </button>
                </div>
                
                {scriptSource === 'custom' && (
                  <button 
                    onClick={pasteFromClipboard}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/60 hover:bg-white/10 transition-all"
                  >
                    <Upload className="w-3 h-3" /> {t('pasteFromClipboard')}
                  </button>
                )}
              </div>

              {scriptSource === 'custom' && (
                <motion.textarea
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  value={customScript}
                  onChange={(e) => setCustomScript(e.target.value)}
                  placeholder={t('pastePlaceholder')}
                  className="w-full h-32 bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 transition-all resize-none font-mono"
                />
              )}
            </div>

            <div className="flex items-center gap-4">
              {!isRecording ? (
                <button 
                  onClick={startRecording}
                  className="flex-1 h-20 bg-white text-black rounded-[2rem] flex items-center justify-center gap-4 group transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="w-6 h-6 rounded-full bg-red-500 animate-pulse group-hover:scale-125 transition-transform" />
                  <span className="text-xl font-black uppercase italic tracking-tighter">{t('startRecording')}</span>
                </button>
              ) : (
                <button 
                  onClick={stopRecording}
                  className="flex-1 h-20 bg-red-500 text-white rounded-[2rem] flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Square className="w-6 h-6 fill-white" />
                  <span className="text-xl font-black uppercase italic tracking-tighter">{t('stopRecording')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Post-Recording Review Footer */}
      <AnimatePresence>
        {recordedBlob && !isRecording && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-12 left-12 right-12 z-[110] p-8 bg-white text-black rounded-[3rem] shadow-[0_40px_80px_rgba(255,255,255,0.1)] flex items-center justify-between"
          >
            <div className="flex items-center gap-8">
               <div className="space-y-1">
                 <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none">Review Your Take</h3>
                 <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Ready for studio processing</p>
               </div>
               
               <div className="h-12 w-[1px] bg-black/10" />

               <button 
                 onClick={() => recordingUrl && window.open(recordingUrl)}
                 className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-black/5 hover:bg-black/10 transition-all text-xs font-black uppercase tracking-widest"
               >
                 <Play className="w-4 h-4" /> {t('reviewRecording')}
               </button>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => { setRecordedBlob(null); setRecordingUrl(null); }}
                className="px-8 py-4 rounded-2xl border border-black/10 text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
              >
                Retake
              </button>
              <button 
                onClick={handleUpload}
                disabled={isUploading}
                className="px-12 py-4 rounded-2xl bg-black text-white text-xs font-black uppercase tracking-widest hover:scale-[1.05] transition-all flex items-center gap-3 disabled:opacity-50"
              >
                {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {isUploading ? 'Uploading...' : t('saveAndContinue')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* iOS 26 Style Settings Overlay */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed bottom-32 right-8 w-80 z-[150] bg-black/60 backdrop-blur-[40px] rounded-[3rem] border border-white/20 shadow-[0_40px_80px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            <div className="p-8 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/40 italic">{t('settingsTitle')}</h3>
                <Settings className="w-4 h-4 text-white/20" />
              </div>

              {/* 🎙 Audio Source Selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60 flex items-center gap-2">
                    <Mic2 className="w-3 h-3 text-cyan-400" /> Источник звука
                  </span>
                  <button
                    onClick={refreshAudioDevices}
                    className="text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-cyan-400 transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Обновить
                  </button>
                </div>
                {audioDevices.length === 0 ? (
                  <button
                    onClick={refreshAudioDevices}
                    className="w-full py-3 rounded-2xl bg-white/5 border border-dashed border-white/10 text-[9px] font-black uppercase tracking-widest text-white/30 hover:border-cyan-500/40 hover:text-cyan-400 transition-all"
                  >
                    Нажмите для сканирования устройств
                  </button>
                ) : (
                  <div className="space-y-2">
                    {audioDevices.map((device) => {
                      const isSelected = selectedAudioDeviceId === device.deviceId;
                      const label = device.label || `Микрофон ${audioDevices.indexOf(device) + 1}`;
                      const isBluetooth = label.toLowerCase().includes('bluetooth') || label.toLowerCase().includes('airpod') || label.toLowerCase().includes('earpod');
                      const isHeadset = label.toLowerCase().includes('headset') || label.toLowerCase().includes('wired') || label.toLowerCase().includes('наушник');
                      const Icon = isBluetooth ? Bluetooth : isHeadset ? Headphones : Mic2;
                      return (
                        <button
                          key={device.deviceId}
                          onClick={() => setSelectedAudioDeviceId(device.deviceId)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                              : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/20'
                          }`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-left truncate flex-1">{label}</span>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="text-[8px] text-white/20 px-1 leading-relaxed">
                  На iOS выбор устройства определяется системой. Подключённые наушники или BT-гарнитура имеют приоритет.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{t('fontSize')}</span>
                  <span className="text-[10px] font-mono text-cyan-400">{fontSize}px</span>
                </div>
                <input 
                  type="range" min="32" max="120" step="4"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-white h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                />
              </div>

              {/* Letter Spacing */}
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{t('fontSpacing')}</span>
                  <span className="text-[10px] font-mono text-cyan-400">{letterSpacing}px</span>
                </div>
                <input 
                  type="range" min="-5" max="20" step="1"
                  value={letterSpacing}
                  onChange={(e) => setLetterSpacing(Number(e.target.value))}
                  className="w-full accent-white h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                />
              </div>

              {/* Color Themes */}
              <div className="space-y-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60 px-1">{t('fontColor')}</span>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { color: 'text-white', bg: 'bg-white' },
                    { color: 'text-cyan-400', bg: 'bg-cyan-400' },
                    { color: 'text-yellow-400', bg: 'bg-yellow-400' },
                    { color: 'text-green-400', bg: 'bg-green-400' }
                  ].map((theme, idx) => (
                    <button
                      key={idx}
                      onClick={() => setThemeColor(theme.color)}
                      className={`h-10 rounded-2xl border-2 transition-all ${theme.bg} ${themeColor === theme.color ? 'border-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.4)]' : 'border-transparent opacity-40 hover:opacity-100'}`}
                    />
                  ))}
                </div>
              </div>

              {/* Mirror Mode Toggle */}
              <button
                onClick={() => setIsMirrored(!isMirrored)}
                className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${isMirrored ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-white/5 border-white/10 text-white/40'}`}
              >
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">{t('mirrorMode')}</span>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${isMirrored ? 'bg-cyan-500' : 'bg-white/10'}`}>
                  <motion.div 
                    animate={{ x: isMirrored ? 20 : 0 }}
                    className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow-sm"
                  />
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
