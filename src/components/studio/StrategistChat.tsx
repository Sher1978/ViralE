'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Send, X, Sparkles, Lock, 
  ChevronRight, ChevronDown, RefreshCw, CheckCircle, Zap,
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
  role: 'user' | 'assistant' | 'system';
  content: string;
  isError?: boolean;
  isHidden?: boolean;
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

const getQuickReplies = (content: string, locale: string = 'ru'): string[] => {
  if (!content) return [];
  
  const isRu = locale === 'ru';
  const hasBack = /назад|вернуться к выбору|go back|back to selection/i.test(content);
  
  const regex = /(?:^|\n)\s*(\d+)[.)]\s+/g;
  const matches = [...content.matchAll(regex)];
  
  const replies: string[] = [];
  if (matches.length > 0) {
    const nums = Array.from(new Set(matches.map(m => parseInt(m[1], 10)))).sort((a, b) => a - b);
    if (nums[0] === 1 && nums.every((n, i) => n === i + 1)) {
      nums.forEach(n => replies.push(String(n)));
    }
  }
  
  if (hasBack) {
    replies.push(isRu ? 'Назад' : 'Back');
  }
  
  return replies;
};

const extractFoundFact = (messages: Message[]): string | null => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === 'assistant') {
      const regex = /(?:🎯 ФАКТ|🎯 FOUND FACT|Нашел повод|Нашел новость|Found fact|Found news|Инфоповод):\s*([\s\S]*?)(?=\n\s*\d+\.|\n\n\s*\d+\.|\n\n\s*\[|\n\s*\[|$)/i;
      const match = m.content.match(regex);
      if (match && match[1].trim()) {
        return match[1].trim().replace(/^\*\*|\*\*$/g, '').replace(/^«|»$/g, '').trim();
      }
    }
  }
  return null;
};


const parseNumberedList = (content: string) => {
  const regex = /(?:^|\n)\s*(\d+)[.)]\s+/g;
  const matches = [...content.matchAll(regex)];
  if (matches.length === 0) {
    return { intro: content, items: [], outro: '' };
  }

  const items: string[] = [];
  const intro = content.substring(0, matches[0].index).trim();

  for (let i = 0; i < matches.length - 1; i++) {
    const start = matches[i].index + matches[i][0].length;
    const end = matches[i + 1].index;
    const num = matches[i][1];
    const text = content.substring(start, end).trim();
    items.push(`${num}. ${text}`);
  }

  // Handle last item and potential outro
  const lastIndex = matches.length - 1;
  const start = matches[lastIndex].index + matches[lastIndex][0].length;
  const fullText = content.substring(start);
  
  const outroRegex = /\n\n(?!\s*\d+[.)])([\s\S]+)$/;
  const outroMatch = fullText.match(outroRegex);
  
  let text = fullText;
  let outro = '';
  if (outroMatch) {
    text = fullText.substring(0, outroMatch.index).trim();
    outro = outroMatch[1].trim();
  }
  const num = matches[lastIndex][1];
  items.push(`${num}. ${text}`);

  return { intro, items, outro };
};

interface ParsedScenario {
  id: string;
  label: string;
  content: string;
}

const parseScenariosFromText = (text: string) => {
  if (!text) return null;

  const styles = [
    { id: 'edutainment', label: 'Edutainment', keywords: ['edutainment', 'польза', 'фан + обучение', 'фан и обучение'] },
    { id: 'evergreen', label: 'Evergreen', keywords: ['evergreen', 'вечнозеленый', 'вечнозелёный'] },
    { id: 'trends', label: 'Trends', keywords: ['trends', 'тренды'] },
    { id: 'controversial', label: 'Controversial', keywords: ['controversial', 'противоречие', 'провокация'] },
    { id: 'detective', label: 'Detective', keywords: ['detective', 'детектив'] }
  ];
  
  const matches: { id: string; label: string; index: number; keywordUsed: string }[] = [];
  
  styles.forEach(style => {
    style.keywords.forEach(kw => {
      const escapeRegex = (s: string) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(?:^|\\n)[\\s*#-]*\\d*\\.?\\s*\\**${escapeRegex(kw)}\\**[\\s:(]*`, 'i');
      const match = text.match(regex);
      if (match && match.index !== undefined) {
        matches.push({
          id: style.id,
          label: style.label,
          index: match.index,
          keywordUsed: match[0]
        });
      }
    });
  });
  
  matches.sort((a, b) => a.index - b.index);
  
  const uniqueMatches: typeof matches = [];
  const seenIds = new Set<string>();
  for (const m of matches) {
    if (!seenIds.has(m.id)) {
      seenIds.add(m.id);
      uniqueMatches.push(m);
    }
  }
  
  if (uniqueMatches.length < 2) {
    return null;
  }
  
  const intro = text.substring(0, uniqueMatches[0].index).trim();
  const parsedScenarios: ParsedScenario[] = [];
  
  for (let k = 0; k < uniqueMatches.length; k++) {
    const start = uniqueMatches[k].index + uniqueMatches[k].keywordUsed.length;
    const end = k < uniqueMatches.length - 1 ? uniqueMatches[k + 1].index : text.length;
    let rawContent = text.substring(start, end).trim();
    
    if (rawContent.startsWith(')') || rawContent.startsWith(':')) {
      rawContent = rawContent.substring(1).trim();
    }
    
    parsedScenarios.push({
      id: uniqueMatches[k].id,
      label: uniqueMatches[k].label,
      content: rawContent
    });
  }
  
  return { intro, scenarios: parsedScenarios };
};

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 8000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

const renderColorizedText = (content: string) => {
  if (!content) return null;
  
  const lines = content.split('\n');
  return (
    <div className="space-y-1.5 font-sans select-text">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-2" />;

        // 1. Detect block title markers: e.g. [ХУК] (0-3 сек) or **Блок 1: Хук**
        const blockHeaderRegex = /^(\s*[\*#-]*\s*)(?:\[?(хук|hook|суть|body|context|тело|value|мясо|триз|triz|cta|call to action|призыв|аутро|intro|зацепка|введение|основная часть|контекст)\]?)(.*)$/i;
        const blockHeaderMatch = line.match(blockHeaderRegex);
        if (blockHeaderMatch) {
          const prefix = blockHeaderMatch[1];
          const keyword = blockHeaderMatch[2];
          const rest = blockHeaderMatch[3];
          return (
            <div key={idx} className="pt-3 pb-1 text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-white/5">
              {prefix}[{keyword.toUpperCase()}]{rest}
            </div>
          );
        }

        // 2. Check for Visual / Storyboard descriptions: e.g. "Визуал: ...", "Кадр: ...", "Visual: ..."
        const visualRegex = /^(\s*[\*#-]*\s*)(визуал|visual|кадр|описание действия|действие|раскадровка|картинка)(:?)(.*)$/i;
        const visualMatch = line.match(visualRegex);
        if (visualMatch) {
          const prefix = visualMatch[1];
          const label = visualMatch[2];
          const colon = visualMatch[3];
          const rest = visualMatch[4];
          return (
            <p key={idx} className="text-xs leading-relaxed text-slate-500 italic">
              {prefix}<span className="font-extrabold uppercase tracking-wide text-[10px]">{label}{colon}</span>
              <span> {rest}</span>
            </p>
          );
        }

        // 3. Check for screen text / captions / text on screen: e.g. "Текст на экране: ...", "Screen text: ..."
        const screenTextRegex = /^(\s*[\*#-]*\s*)(текст на экране|screen text|титры|надпись)(:?)(.*)$/i;
        const screenTextMatch = line.match(screenTextRegex);
        if (screenTextMatch) {
          const prefix = screenTextMatch[1];
          const label = screenTextMatch[2];
          const colon = screenTextMatch[3];
          const rest = screenTextMatch[4];
          return (
            <p key={idx} className="text-xs leading-relaxed text-slate-500 font-medium">
              {prefix}<span className="font-extrabold uppercase tracking-wide text-[10px]">{label}{colon}</span>
              <span> {rest}</span>
            </p>
          );
        }

        // 4. Check for spoken text/Speech labels: e.g. "Слова:", "Speech:", "Words:", "Текст:", "Голос:"
        const wordsRegex = /^(\s*[\*#-]*\s*)(слова|speech|words|текст|голос)(:?)(.*)$/i;
        const wordsMatch = line.match(wordsRegex);
        if (wordsMatch) {
          const prefix = wordsMatch[1];
          const label = wordsMatch[2];
          const colon = wordsMatch[3];
          const rest = wordsMatch[4];
          return (
            <p key={idx} className="text-sm leading-relaxed text-white">
              {prefix}<span className="text-slate-400 font-extrabold uppercase tracking-wide text-[10px]">{label}{colon}</span>
              <span className="font-semibold text-white"> {rest}</span>
            </p>
          );
        }

        // 5. Default line rendering:
        return (
          <p key={idx} className="text-sm leading-relaxed text-white font-medium whitespace-pre-wrap">
            {line}
          </p>
        );
      })}
    </div>
  );
};

const extractSentences = (text: string): string[] => {
  if (!text) return [];
  
  const lines = text.split('\n');
  const spokenLines: string[] = [];
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    
    if (/^(?:визуал|visual|кадр|описание|раскадровка|текст на экране|screen text|титры|надпись|\[.*\]|hook|body|triz|cta|хук|суть|тело|призыв|аутро|intro|outro|value)/i.test(trimmed)) {
      return;
    }
    
    const wordsMatch = trimmed.match(/^(?:слова|speech|words|текст|голос):\s*([\s\S]+)$/i);
    if (wordsMatch) {
      spokenLines.push(wordsMatch[1].trim());
    } else {
      spokenLines.push(trimmed);
    }
  });

  const cleanText = spokenLines.join(' ')
    .replace(/<\/?[A-Z0-9_-]+(?:>|\s[^>]*>)/gi, '')
    .replace(/\*\*|__/g, '')
    .trim();
    
  const sentenceRegex = /[^.!?\n]+(?:[.!?\n]+|$)/g;
  const matches = cleanText.match(sentenceRegex);
  if (!matches) return [];
  
  return matches
    .map(s => s.trim())
    .filter(s => s.length > 1 && !s.startsWith('[') && !s.endsWith(']'));
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
  onTransferScenario?: (text: string) => void;
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
  onTransferScenario,
  containerClassName
}: StrategistChatProps & { containerClassName?: string }) {
  const t = useTranslations('Strategist');
  const [isOpen, setIsOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const handleScroll = () => {
    const container = scrollContainerRef.current as any;
    if (!container) return;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShowScrollDown(!isAtBottom);
  };
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPhase, setSearchPhase] = useState<'formulating' | 'connecting' | 'extracting' | 'analyzing'>('formulating');
  
  useEffect(() => {
    if (!isSearching) {
      setSearchPhase('formulating');
      return;
    }
    const timer1 = setTimeout(() => setSearchPhase('connecting'), 2000);
    const timer2 = setTimeout(() => setSearchPhase('extracting'), 4500);
    const timer3 = setTimeout(() => setSearchPhase('analyzing'), 6500);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isSearching]);

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
  const [isPlayingId, setIsPlayingId] = useState<number | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [lastRequest, setLastRequest] = useState<{ audioBlob?: Blob; text?: string } | null>(null);
  const [messagePages, setMessagePages] = useState<Record<number, number>>({});
  const [activeScenarioTabs, setActiveScenarioTabs] = useState<Record<number, string>>({});

  const queueRef = useRef<{ text: string; audioUrl?: string; audio?: any; status: string }[]>([]);
  const queuedSentencesCountRef = useRef<number>(0);
  const isProcessingQueueRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(isMuted);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    if (typeof (globalThis as any).window !== 'undefined') {
      const stored = (globalThis as any).localStorage.getItem('strategist_muted');
      if (stored !== null) {
        setIsMuted(stored === 'true');
      }
    }
  }, []);

  useEffect(() => {
    if (typeof (globalThis as any).window !== 'undefined') {
      (globalThis as any).localStorage.setItem('strategist_muted', String(isMuted));
    }
    if (isMuted) {
      stopSpeaking();
    }
  }, [isMuted]);

  // Load messages from sessionStorage on initial mount
  useEffect(() => {
    if (typeof (globalThis as any).window !== 'undefined') {
      const stored = (globalThis as any).sessionStorage.getItem(`strategist_messages_${projectId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            return;
          }
        } catch (e) {
          console.warn('[StrategistChat] Failed to parse stored messages:', e);
        }
      } else if (projectId && projectId !== 'global') {
        // Fallback: check if we have a global session that we can copy over!
        const globalStored = (globalThis as any).sessionStorage.getItem('strategist_messages_global');
        if (globalStored) {
          try {
            const parsed = JSON.parse(globalStored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMessages(parsed);
              // Save it for the new project ID as well
              (globalThis as any).sessionStorage.setItem(`strategist_messages_${projectId}`, globalStored);
              return;
            }
          } catch (e) {
            console.warn('[StrategistChat] Failed to parse global stored messages:', e);
          }
        }
      }
    }
    
    // Welcome message if nothing stored
    setMessages([
      { 
        role: 'assistant', 
        content: locale === 'ru' 
          ? "Привет! Я твой ИИ-Стратег 🧠 Чем займемся сегодня? Можем побрейнштормить новые идеи, обсудить любые вопросы или сразу написать сценарий для вирусного рилса. Какие мысли?" 
          : "Hi! I'm your AI Strategist 🧠 What are we doing today? We can brainstorm new ideas, discuss strategy questions, or jump straight into writing a script for a viral reel. What's on your mind?" 
      }
    ]);
  }, [projectId]);

  // Save messages to sessionStorage whenever they change
  useEffect(() => {
    if (typeof (globalThis as any).window !== 'undefined' && messages.length > 0) {
      (globalThis as any).sessionStorage.setItem(`strategist_messages_${projectId}`, JSON.stringify(messages));
    }
  }, [messages, projectId]);

  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<any | null>(null);
  const analyserRef = useRef<any | null>(null);
  const mediaRecorderRef = useRef<any | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<any | null>(null);
  const playingMessageIdRef = useRef<number | null>(null);

  const stopSpeaking = () => {
    // Stop and clear queue items
    queueRef.current.forEach(item => {
      if (item.audio) {
        try {
          item.audio.pause();
        } catch (e) {}
      }
      if (item.audioUrl) {
        try {
          URL.revokeObjectURL(item.audioUrl);
        } catch (e) {}
      }
    });
    queueRef.current = [];
    queuedSentencesCountRef.current = 0;
    isProcessingQueueRef.current = false;

    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
      } catch (e) {
        console.warn('Error pausing audio:', e);
      }
      audioPlayerRef.current = null;
    }
    setIsAIPointing(false);
    setIsPlayingId(null);
    playingMessageIdRef.current = null;
  };

  const enqueueSentenceForTTS = (text: string) => {
    if (!text.trim() || isMutedRef.current) return;
    if (text.replace(/[.!?\s]/g, '').length < 2) return;
    
    const alreadyExists = queueRef.current.some(item => item.text === text);
    if (alreadyExists) return;

    console.log('[TTS Queue] Enqueuing sentence:', text);
    queueRef.current.push({ text, status: 'pending' });
    processQueue();
  };

  const processQueue = async () => {
    if (isProcessingQueueRef.current || isMutedRef.current) return;
    isProcessingQueueRef.current = true;
    
    try {
      while (true) {
        if (isMutedRef.current) {
          stopSpeaking();
          break;
        }

        const nextPlayIdx = queueRef.current.findIndex(item => item.status !== 'played' && item.status !== 'error');
        if (nextPlayIdx === -1) {
          break;
        }
        
        const item = queueRef.current[nextPlayIdx];
        
        if (item.status === 'pending') {
          item.status = 'loading';
          try {
            const response = await fetch('/api/ai/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                text: item.text,
                voice_id: 'TX3LPaxmHKxFdv7VOQHJ' // Male voice (Liam)
              }),
            });
            
            if (!response.ok) throw new Error('TTS failed');
            
            const audioBlob = await response.blob();
            item.audioUrl = URL.createObjectURL(audioBlob);
            
            const audio_class = (globalThis as any).Audio;
            item.audio = audio_class ? new audio_class(item.audioUrl) : undefined;
            
            if (item.audio) {
              item.status = 'ready';
            } else {
              item.status = 'error';
            }
          } catch (err) {
            console.error('[TTS Queue] Fetch failed for:', item.text, err);
            item.status = 'error';
          }
        }
        
        if (item.status === 'ready' && item.audio) {
          item.status = 'playing';
          setIsAIPointing(true);
          
          if (audioContextRef.current && analyserRef.current) {
            try {
              const source = audioContextRef.current.createMediaElementSource(item.audio);
              source.connect(analyserRef.current);
              analyserRef.current.connect(audioContextRef.current.destination);
            } catch (e) {
              // Ignore already connected
            }
          }
          
          await new Promise<void>((resolve) => {
            if (!item.audio) {
              resolve();
              return;
            }
            item.audio.onended = () => {
              resolve();
            };
            item.audio.onerror = () => {
              resolve();
            };
            item.audio.play().catch((err: any) => {
              console.warn('[TTS Queue] Play failed:', err);
              resolve();
            });
          });
          
          if (item.audioUrl) {
            URL.revokeObjectURL(item.audioUrl);
          }
          item.status = 'played';
        }
        
        if (item.status === 'error') {
          item.status = 'played';
        }
      }
    } finally {
      isProcessingQueueRef.current = false;
      const activePlaying = queueRef.current.some(item => item.status === 'playing');
      if (!activePlaying) {
        setIsAIPointing(false);
      }
    }
  };

  useEffect(() => {
    if (!isOpen) {
      if (audioPlayerRef.current && !audioPlayerRef.current.paused) {
        audioPlayerRef.current.pause();
        setIsAIPointing(false);
      }
    } else {
      if (audioPlayerRef.current && audioPlayerRef.current.paused) {
        const lastId = playingMessageIdRef.current;
        audioPlayerRef.current.play().then(() => {
          setIsAIPointing(true);
          if (lastId !== null) {
            setIsPlayingId(lastId);
          }
        }).catch((err: any) => {
          console.warn('[StrategistChat] Failed to resume audio on open:', err);
        });
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const checkAccess = async () => {
      let currentUserId = userId;
      try {
        if (!currentUserId) {
          const prof = await profileService.getOrCreateProfile();
          if (prof) {
            currentUserId = prof.id;
            setProfile(prof);
          }
        } else {
          const prof = await profileService.getProfile(currentUserId);
          setProfile(prof);
        }

        if (currentUserId) {
          const status = await strategistService.getAccessStatus(currentUserId);
          setAccess(status);
        }
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

  const handleSend = async (
    audioBlob?: Blob, 
    textOverride?: string, 
    customMessages?: Message[], 
    isRetry = false
  ) => {
    const textToSubmit = textOverride !== undefined ? textOverride : input;
    if (!textToSubmit.trim() && !audioBlob || isStreaming) return;

    stopSpeaking();

    const userMessage = textToSubmit || (audioBlob ? "🎙️ [Voice Message]" : "");
    if (!audioBlob) setInput('');
    
    if (!isRetry) {
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
      setLastRequest({ audioBlob, text: textToSubmit });
    }
    setIsStreaming(true);

    try {
      const formData = new FormData();
      const apiMessages = customMessages || [...messages, { role: 'user', content: userMessage }];
      formData.append('messages', JSON.stringify(apiMessages));
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

      if (!response.ok) {
        let errMessage = 'Failed to fetch strategy';
        try {
          const errData = await response.json();
          errMessage = errData.error || errData.message || errMessage;
        } catch (_) {}
        throw new Error(errMessage);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      queuedSentencesCountRef.current = 0;
      queueRef.current = [];

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

        if (!isMutedRef.current) {
          const sentences = extractSentences(assistantMessage);
          if (sentences.length > queuedSentencesCountRef.current) {
            for (let k = queuedSentencesCountRef.current; k < sentences.length; k++) {
              enqueueSentenceForTTS(sentences[k]);
            }
            queuedSentencesCountRef.current = sentences.length;
          }
        }
      }

      if (!isMutedRef.current) {
        const sentences = extractSentences(assistantMessage);
        const processedText = sentences.join(' ');
        const cleanText = assistantMessage.replace(/<\/?[A-Z0-9_-]+(?:>|\s[^>]*>)/gi, '').replace(/\*\*|__/g, '').trim();
        const remainingText = cleanText.substring(processedText.length).trim();
        if (remainingText.length > 2 && !remainingText.startsWith('[') && !remainingText.endsWith(']')) {
          enqueueSentenceForTTS(remainingText);
        }
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

      // --- SEARCH INTERCEPTOR ---
      const searchMatch = assistantMessage.match(/\[SEARCH:\s*([^\]]+)\]/i);
      if (searchMatch) {
        const searchQuery = searchMatch[1].trim();
        console.log('[Search Interceptor] Query:', searchQuery);
        
        setIsSearching(true);
        setIsStreaming(true);

        try {
          const searchRes = await fetchWithTimeout(`/api/search?q=${encodeURIComponent(searchQuery)}`, {}, 8000);
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            const resultsText = (searchData.results || [])
              .map((r: any) => `Source: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`)
              .join('\n\n');

            const hiddenMsg: Message = {
              role: 'user',
              content: `[SEARCH RESULTS FOR "${searchQuery}"]:\n${resultsText}\n\nNow, execute Step 3 (АКТУАЛИЗАЦИЯ И ПОИСК): output the "Нашел повод..." fact details, then offer 9 TRIZ angles with patterns, and prompt the user to choose.`,
              isHidden: true
            };

            const updatedHistory: Message[] = [
              ...apiMessages,
              { role: 'assistant', content: assistantMessage },
              hiddenMsg
            ];

            setMessages(updatedHistory);
            setIsStreaming(false);
            setIsSearching(false);
            await handleSend(undefined, "", updatedHistory, true);
            return;
          } else {
            throw new Error('Search API returned error response');
          }
        } catch (err) {
          console.error('[Search Interceptor] Failed to fetch:', err);
          const hiddenMsg: Message = {
            role: 'user',
            content: `[SEARCH FAILED]\nProceed to Step 3 (АКТУАЛИЗАЦИЯ И ПОИСК) using a realistic fact/myth from your training data, output the "Нашел повод..." details, then offer 9 TRIZ angles with patterns, and prompt the user to choose.`,
            isHidden: true
          };

          const updatedHistory: Message[] = [
            ...apiMessages,
            { role: 'assistant', content: assistantMessage },
            hiddenMsg
          ];

          setMessages(updatedHistory);
          setIsStreaming(false);
          setIsSearching(false);
          await handleSend(undefined, "", updatedHistory, true);
          return;
        }
      }

    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMsg = locale === 'ru'
        ? `Извини, произошла ошибка: ${error.message || 'попробуй еще раз'}`
        : `Sorry, an error occurred: ${error.message || 'please try again'}`;
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg, isError: true }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSendRef = useRef(handleSend);
  useEffect(() => {
    handleSendRef.current = handleSend;
  });

  useEffect(() => {
    const handleOpenEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsOpen(true);
      if (customEvent.detail?.message) {
        handleSendRef.current(undefined, customEvent.detail.message);
      }
    };

    const win = typeof globalThis !== 'undefined' ? (globalThis as any).window : null;
    if (win) {
      win.addEventListener('open-strategist', handleOpenEvent);
      return () => {
        win.removeEventListener('open-strategist', handleOpenEvent);
      };
    }
  }, []);

  const handleRetry = () => {
    if (!lastRequest || isStreaming) return;

    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex === -1) return;

    const messagesToKeep = messages.slice(0, lastUserIndex + 1);
    setMessages(messagesToKeep);

    handleSend(lastRequest.audioBlob, lastRequest.text, messagesToKeep, true);
  };

  const speakResponse = async (text: string) => {
    if (isMuted) return;
    try {
      setIsAIPointing(true);
      const response = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          voice_id: 'TX3LPaxmHKxFdv7VOQHJ' // Male voice (Liam)
        }),
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

  const playVoice = async (text: string, id: number) => {
    stopSpeaking();
    
    setIsPlayingId(id);
    playingMessageIdRef.current = id;

    if (isMuted) {
      setIsMuted(false);
      isMutedRef.current = false;
    }
    
    const sentences = extractSentences(text);
    sentences.forEach(s => enqueueSentenceForTTS(s));
    
    const processedText = sentences.join(' ');
    const cleanText = text.replace(/<\/?[A-Z0-9_-]+(?:>|\s[^>]*>)/gi, '').replace(/\*\*|__/g, '').trim();
    const remainingText = cleanText.substring(processedText.length).trim();
    if (remainingText.length > 2 && !remainingText.startsWith('[') && !remainingText.endsWith(']')) {
      enqueueSentenceForTTS(remainingText);
    }
  };

  const handlePlayVoiceClick = (text: string, id: number) => {
    if (isPlayingId === id) {
      stopSpeaking();
    } else {
      playVoice(text, id);
    }
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
    if (isCheckingAccess) return;

    setIsCheckingAccess(true);
    try {
      let activeUserId = userId;
      let activeProfile = profile;
      let activeAccess = access;

      if (!activeUserId) {
        const resolvedProf = await profileService.getOrCreateProfile();
        if (resolvedProf) {
          activeUserId = resolvedProf.id;
          activeProfile = resolvedProf;
          setProfile(resolvedProf);
        }
      }

      if (activeUserId) {
        const [status, prof] = await Promise.all([
          strategistService.getAccessStatus(activeUserId),
          profileService.getProfile(activeUserId)
        ]);
        setAccess(status);
        setProfile(prof);
        activeAccess = status;
        activeProfile = prof;
      }

      if (activeProfile?.tier === 'pro' || activeAccess?.hasAccess) {
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
    } finally {
      setIsCheckingAccess(false);
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
          disabled={isCheckingAccess}
          className={cn(
            "relative h-12 w-12 rounded-xl shadow-2xl flex items-center justify-center transition-all duration-500 overflow-hidden border-2",
            isOpen 
              ? "bg-red-500/80 backdrop-blur-md border-red-400/50" 
              : "bg-black/80 backdrop-blur-md border-white/20",
            isCheckingAccess && "opacity-80 cursor-wait"
          )}
        >
          {isCheckingAccess ? (
            <RefreshCw className="text-white h-5 w-5 animate-spin" />
          ) : isOpen ? (
            <X className="text-white h-6 w-6" />
          ) : (
            <img 
              src="/icon-512x512.png" 
              alt="Advisor" 
              className="w-full h-full object-cover scale-110"
            />
          )}
          {!isOpen && !isCheckingAccess && (
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
                isActive={true} 
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
                <button 
                  onClick={() => setIsMuted(prev => !prev)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                  title={isMuted ? (locale === 'ru' ? "Включить звук" : "Unmute strategist") : (locale === 'ru' ? "Выключить звук" : "Mute strategist")}
                >
                  {isMuted ? <VolumeX className="h-4 w-4 text-red-400 animate-pulse" /> : <Volume2 className="h-4 w-4 text-green-400" />}
                </button>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages Container Wrapper */}
            <div className="flex-1 relative min-h-0 z-10">
              {/* Messages Area */}
              <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="w-full h-full overflow-y-auto p-4 space-y-4 custom-scrollbar"
              >
              {(() => {
                const visibleMessages = messages.filter(m => !m.isHidden);
                return visibleMessages.map((m, i) => {
                  const displayContent = m.content.replace(/\[SEARCH:\s*[^\]]+\]/gi, '').trim();
                  
                  return (
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
                          : m.isError
                            ? "bg-red-500/10 text-red-200 rounded-tl-none border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]"
                            : "bg-white/5 text-slate-200 rounded-tl-none border border-white/5 hover:bg-white/10"
                      )}>
                        {(() => {
                          const scenarioObj = parseScenariosFromText(displayContent);
                          if (scenarioObj) {
                            const activeTab = activeScenarioTabs[i] || scenarioObj.scenarios[0].id;
                            const activeScenario = scenarioObj.scenarios.find(s => s.id === activeTab) || scenarioObj.scenarios[0];
                            
                            return (
                              <div className="space-y-4">
                                {scenarioObj.intro && <p className="leading-relaxed whitespace-pre-wrap text-slate-300 text-xs md:text-sm">{scenarioObj.intro}</p>}
                                
                                {/* Tabs Header */}
                                <div className="flex flex-wrap gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
                                  {scenarioObj.scenarios.map(s => {
                                    const isActive = s.id === activeTab;
                                    return (
                                      <button
                                        key={s.id}
                                        onClick={() => setActiveScenarioTabs(prev => ({ ...prev, [i]: s.id }))}
                                        className={cn(
                                          "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                                          isActive 
                                            ? "bg-purple-600 text-white shadow-md shadow-purple-900/30" 
                                            : "text-slate-400 hover:text-white hover:bg-white/5"
                                        )}
                                      >
                                        {s.label}
                                      </button>
                                    );
                                  })}
                                </div>
                                
                                {/* Tab Content (Colorized Scenario) */}
                                <div className="p-3 bg-black/35 border border-white/5 rounded-xl">
                                  {renderColorizedText(activeScenario.content)}
                                </div>
                                
                                {/* Action Button: Transfer Scenario */}
                                <div className="pt-1 flex justify-end">
                                  <button
                                    onClick={() => {
                                      setIsOpen(false);
                                      if (onTransferScenario) {
                                        onTransferScenario(activeScenario.content);
                                      } else if (onUseScript) {
                                        onUseScript(activeScenario.content);
                                      } else {
                                        applySuggestion(activeScenario.content);
                                      }
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                                  >
                                    <Zap className="h-3.5 w-3.5 text-yellow-300" />
                                    {locale === 'ru' ? 'Перенести этот сценарий' : 'Transfer this scenario'}
                                  </button>
                                </div>
                              </div>
                            );
                          }
 
                          const { textBefore, scriptText } = parseMessageContent(displayContent);
                          const parsedList = parseNumberedList(textBefore || '');
                          const shouldPaginate = parsedList.items.length > 3;
                          const currentPage = messagePages[i] || 0;
                          const itemsPerPage = 3;
                          const totalPages = Math.ceil(parsedList.items.length / itemsPerPage);
                          const startIndex = currentPage * itemsPerPage;
                          const visibleItems = shouldPaginate 
                            ? parsedList.items.slice(startIndex, startIndex + itemsPerPage) 
                            : parsedList.items;
 
                          return (
                            <div className="space-y-3">
                              {!shouldPaginate && textBefore && <p className="leading-relaxed whitespace-pre-wrap">{textBefore}</p>}
                              
                              {shouldPaginate && (
                                <div className="space-y-3">
                                  {parsedList.intro && <p className="leading-relaxed whitespace-pre-wrap">{parsedList.intro}</p>}
                                  
                                  <div className="space-y-2.5 border-l-2 border-purple-500/30 pl-3 my-2">
                                    {visibleItems.map((item, idx) => (
                                      <div key={idx} className="text-slate-300 leading-relaxed whitespace-pre-wrap text-xs md:text-sm">
                                        {item}
                                      </div>
                                    ))}
                                  </div>
                                  
                                  {parsedList.outro && <p className="leading-relaxed whitespace-pre-wrap text-xs text-slate-400 font-medium italic">{parsedList.outro}</p>}
                                  
                                  {/* Inline Pagination controls */}
                                  <div className="pt-2 flex items-center justify-between border-t border-white/5 mt-2">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                      {locale === 'ru' 
                                        ? `Стр. ${currentPage + 1} из ${totalPages}` 
                                        : `Page ${currentPage + 1} of ${totalPages}`}
                                    </span>
                                    <div className="flex gap-1.5">
                                      <button
                                        onClick={() => {
                                          const prevPage = (currentPage - 1 + totalPages) % totalPages;
                                          setMessagePages(prev => ({ ...prev, [i]: prevPage }));
                                        }}
                                        className="p-1 hover:bg-white/5 active:bg-white/10 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                                        title="Previous Page"
                                      >
                                        <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          const nextPage = (currentPage + 1) % totalPages;
                                          setMessagePages(prev => ({ ...prev, [i]: nextPage }));
                                        }}
                                        className="p-1 hover:bg-white/5 active:bg-white/10 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                                        title="Next Page"
                                      >
                                        <ChevronRight className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
 
                              {scriptText && (
                                <div className="mt-2 p-3 bg-black/50 border border-purple-500/30 rounded-xl font-mono text-xs text-purple-200 select-text relative overflow-hidden shadow-inner leading-relaxed">
                                  <div className="absolute top-0 right-0 bg-purple-500/20 px-2 py-0.5 text-[8px] font-black uppercase text-purple-300 border-l border-b border-purple-500/20">
                                    Сценарий
                                  </div>
                                  <p className="whitespace-pre-wrap">{scriptText}</p>
                                </div>
                              )}
                              {m.isError && (
                                <div className="pt-1">
                                  <motion.button
                                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(239, 68, 68, 0.25)' }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleRetry}
                                    className="group/retry flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-200 text-xs font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                                  >
                                    <RefreshCw className="h-3.5 w-3.5 transition-transform duration-500 group-hover/retry:rotate-180" />
                                    {locale === 'ru' ? 'Повторить попытку' : 'Retry Request'}
                                  </motion.button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        
                        {/* Copy to Clipboard & Play Voice - More visible on hover */}
                        {m.role === 'assistant' && !isStreaming && (
                          <div className="absolute -right-10 top-0 flex flex-col gap-2 opacity-0 group-hover/message:opacity-100 transition-all z-20">
                            <button 
                              onClick={() => {
                                const { scriptText } = parseMessageContent(displayContent);
                                copyToClipboard(scriptText || displayContent, i);
                              }}
                              className="p-2 text-slate-500 hover:text-white bg-[#0e0e16]/80 hover:bg-[#181824] backdrop-blur-md rounded-xl border border-white/10 transition-colors"
                              title="Copy to Clipboard"
                            >
                              {copiedId === i ? <CheckCircle className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                            </button>
                            
                            <button 
                              onClick={() => handlePlayVoiceClick(displayContent, i)}
                              className={cn(
                                "p-2 rounded-xl border transition-colors backdrop-blur-md",
                                isPlayingId === i 
                                  ? "text-red-400 bg-red-500/10 border-red-500/30" 
                                  : "text-slate-500 hover:text-white bg-[#0e0e16]/80 hover:bg-[#181824] border-white/10"
                              )}
                              title={isPlayingId === i ? "Stop speaking" : "Listen to answer"}
                            >
                              {isPlayingId === i ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                            </button>
                          </div>
                        )}
                      </div>
                      {/* Action suggesting for assistant messages */}
                      {m.role === 'assistant' && i === visibleMessages.length - 1 && !isStreaming && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(() => {
                            const { scriptText } = parseMessageContent(displayContent);
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
                                  {locale === 'ru' ? 'Сценарную' : 'Export to Script Lab'}
                                </button>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                      {/* Quick Replies (Numbers Only) & Pagination Shortcuts */}
                      {m.role === 'assistant' && i === visibleMessages.length - 1 && !isStreaming && (() => {
                        const { textBefore } = parseMessageContent(displayContent);
                        const parsedList = parseNumberedList(textBefore || '');
                        const shouldPaginate = parsedList.items.length > 3;
                        
                        if (shouldPaginate) {
                          const totalPages = Math.ceil(parsedList.items.length / 3);
                          const currentPage = messagePages[i] || 0;
                          
                          const visibleNums: number[] = [];
                          const itemsPerPage = 3;
                          const start = currentPage * itemsPerPage;
                          const end = Math.min(start + itemsPerPage, parsedList.items.length);
                          
                          for (let k = start; k < end; k++) {
                            const match = parsedList.items[k].match(/^\s*(\d+)/);
                            if (match) {
                              visibleNums.push(parseInt(match[1], 10));
                            }
                          }
                          
                          return (
                            <div className="mt-2.5 flex items-center gap-2 animate-fade-in pl-1">
                              {visibleNums.map((num) => (
                                <button
                                  key={num}
                                  onClick={() => {
                                    handleSend(undefined, String(num));
                                  }}
                                  className="h-8 w-8 rounded-lg bg-purple-500/10 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-xs font-black flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                                >
                                  {num}
                                </button>
                              ))}
                              
                              <button
                                onClick={() => {
                                  const nextPage = (currentPage + 1) % totalPages;
                                  setMessagePages(prev => ({ ...prev, [i]: nextPage }));
                                }}
                                className="h-8 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 border border-purple-500/30 text-white text-[10px] font-black uppercase tracking-wider flex items-center justify-center transition-all active:scale-95 shadow-md shadow-purple-900/20 cursor-pointer"
                              >
                                {currentPage === totalPages - 1
                                  ? (locale === 'ru' ? '← В начало' : '← Reset')
                                  : (locale === 'ru' ? 'Больше →' : 'More →')}
                              </button>
                            </div>
                          );
                        }
 
                        const replies = getQuickReplies(displayContent, locale);
                        if (replies.length > 0) {
                          const foundFact = extractFoundFact(messages);
 
                          return (
                            <div className="mt-2.5 space-y-3 animate-fade-in pl-1">
                              {foundFact && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-start gap-2.5 shadow-lg backdrop-blur-md max-w-[85%]"
                                >
                                  <div className="mt-0.5 bg-purple-500/20 p-1.5 rounded-lg text-purple-400 shrink-0 animate-pulse">
                                    <Sparkles className="h-4 w-4" />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-purple-300">
                                      {locale === 'ru' ? '🎯 АКТУАЛЬНЫЙ ФАКТ / ПОВОД' : '🎯 FOUND NEWS / MYTH'}
                                    </span>
                                    <p className="text-xs leading-relaxed text-slate-200 font-medium whitespace-pre-wrap">
                                      {foundFact}
                                    </p>
                                  </div>
                                </motion.div>
                              )}
                              <div className="flex flex-wrap gap-2">
                                {replies.map((num) => (
                                  <button
                                    key={num}
                                    onClick={() => {
                                      handleSend(undefined, String(num));
                                    }}
                                    className={cn(
                                      "h-8 rounded-lg bg-purple-500/10 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-xs font-black flex items-center justify-center transition-all active:scale-90 cursor-pointer",
                                      num.length > 2 ? "px-4" : "w-8"
                                    )}
                                  >
                                    {num}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  );
                });
              })()}
              
              {/* Web Search Loading indicator */}
              {isSearching && (
                <div className="flex items-center gap-3.5 text-xs text-slate-200 bg-gradient-to-r from-purple-900/10 to-indigo-900/10 border border-purple-500/20 p-3.5 rounded-2xl rounded-tl-none max-w-[85%] shadow-lg backdrop-blur-md relative overflow-hidden group">
                  {/* Pulsing Live Indicator */}
                  <div className="absolute top-2 right-2 w-2 h-2">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>

                  <div className="relative w-8 h-8 rounded-full border border-purple-500/30 flex items-center justify-center bg-purple-500/5 shrink-0">
                    <div className="absolute inset-0 rounded-full border-t-2 border-purple-500 animate-spin" />
                    <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  </div>

                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[9px] font-black uppercase tracking-widest text-purple-400">
                      {locale === 'ru' ? '🔍 LIVE: ПОИСК В СЕТИ' : '🔍 LIVE: WEB SEARCH'}
                    </span>
                    <span className="text-slate-300 font-medium leading-relaxed truncate">
                      {(() => {
                        const isRu = locale === 'ru';
                        switch (searchPhase) {
                          case 'formulating':
                            return isRu ? 'Формулирую поисковый запрос для Google...' : 'Formulating search query for Google...';
                          case 'connecting':
                            return isRu ? 'Подключаюсь к поисковому шлюзу и сканирую сеть...' : 'Connecting to search gateway and scanning the web...';
                          case 'extracting':
                            return isRu ? 'Извлекаю факты, исследования и статьи...' : 'Extracting facts, research papers, and articles...';
                          case 'analyzing':
                            return isRu ? 'Группирую результаты и перепроверяю цифры...' : 'Synthesizing results and double-checking statistics...';
                          default:
                            return isRu ? 'Ищу в сети...' : 'Searching the web...';
                        }
                      })()}
                    </span>
                  </div>
                </div>
              )}
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
                      <button
                        onClick={stopSpeaking}
                        className="flex items-center gap-2 group/stop transition-all cursor-pointer outline-none"
                        title={locale === 'ru' ? 'Остановить воспроизведение' : 'Stop speaking'}
                      >
                        <Volume2 className="w-3.5 h-3.5 text-green-400 animate-pulse group-hover/stop:hidden" />
                        <VolumeX className="w-3.5 h-3.5 text-red-400 hidden group-hover/stop:block" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider group-hover/stop:text-red-400 transition-colors">
                          <span className="group-hover/stop:hidden">
                            {locale === 'ru' ? 'Говорю...' : 'Speaking...'}
                          </span>
                          <span className="hidden group-hover/stop:inline">
                            {locale === 'ru' ? 'Остановить' : 'Stop'}
                          </span>
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Scroll to Bottom Button */}
            <AnimatePresence>
              {showScrollDown && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => {
                    (scrollContainerRef.current as any)?.scrollTo({
                      top: (scrollContainerRef.current as any).scrollHeight,
                      behavior: 'smooth'
                    });
                  }}
                  className="absolute bottom-4 right-4 p-2.5 bg-purple-600/90 hover:bg-purple-500 text-white rounded-full shadow-lg border border-purple-500/30 backdrop-blur-md transition-all active:scale-95 z-20 cursor-pointer flex items-center justify-center"
                  title={locale === 'ru' ? 'В самый конец' : 'Scroll to bottom'}
                >
                  <ChevronDown className="h-4.5 w-4.5" />
                </motion.button>
              )}
            </AnimatePresence>
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
