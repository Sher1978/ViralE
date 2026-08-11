'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/navigation';
import { 
  ChevronLeft, 
  RefreshCw, 
  Trash2, 
  Fingerprint, 
  Save, 
  Sparkles, 
  AlertTriangle,
  Zap,
  Activity,
  Cpu,
  Crown,
  Leaf,
  Scale,
  Rocket,
  Palette
} from 'lucide-react';

import { Link } from '@/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface DnaAnswers {
  sphere: string;
  audience: string;
  painPoint: string;
  approach: string;
  goal: string;
  tone: string;
  advantage: string;
}

export default function DnaManagementPage() {
  const t = useTranslations('profileDna');
  const locale = useLocale();
  const router = useRouter();
  
  const [dna, setDna] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('startup_valley');

  const [answers, setAnswers] = useState<DnaAnswers>({
    sphere: '',
    audience: '',
    painPoint: '',
    approach: '',
    goal: '',
    tone: '',
    advantage: '',
  });

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [regeneratingAll, setRegeneratingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questions: { id: keyof DnaAnswers, label: string, placeholder: string, hint: string }[] = [
    { 
       id: 'sphere', 
       label: locale === 'ru' ? '1. Ниша и Сфера' : '1. Niche & Sphere', 
       placeholder: locale === 'ru' ? 'Напр: Технологии, Лайфстайл, Бизнес...' : 'e.g. Tech, Lifestyle, Business...',
       hint: locale === 'ru' ? 'О чем ваш контент в двух словах?' : 'What is your content about in a few words?'
    },
    { 
       id: 'audience', 
       label: locale === 'ru' ? '2. Ваша Аудитория' : '2. Your Audience', 
       placeholder: locale === 'ru' ? 'Кто ваши идеальные зрители?' : 'Who are your ideal viewers?',
       hint: locale === 'ru' ? 'Опишите их боли и желания.' : 'Describe their pains and desires.'
    },
    { 
       id: 'painPoint', 
       label: locale === 'ru' ? '3. Главная Проблема' : '3. Main Problem', 
       placeholder: locale === 'ru' ? 'Какую проблему вы решаете?' : 'What problem do you solve?',
       hint: locale === 'ru' ? 'Почему они должны вас смотреть?' : 'Why should they watch you?'
    },
    { 
       id: 'approach', 
       label: locale === 'ru' ? '4. Секретный Соус' : '4. Secret Sauce', 
       placeholder: locale === 'ru' ? 'В чем ваша уникальность?' : 'What makes you unique?',
       hint: locale === 'ru' ? 'Ваш авторский стиль или метод.' : 'Your author style or method.'
    },
    { 
       id: 'goal', 
       label: locale === 'ru' ? '5. Цель Контента' : '5. Content Goal', 
       placeholder: locale === 'ru' ? 'Продажи, лояльность или охват?' : 'Sales, loyalty, or reach?',
       hint: locale === 'ru' ? 'Какой результат вы ждете от видео?' : 'What result do you expect?'
    },
    { 
       id: 'tone', 
       label: locale === 'ru' ? '6. Тон Голоса' : '6. Tone of Voice', 
       placeholder: locale === 'ru' ? 'Ирония, экспертность, драйв?' : 'Irony, expert, drive?',
       hint: locale === 'ru' ? 'Как вы общаетесь со зрителем?' : 'How do you communicate?'
    },
    { 
       id: 'advantage', 
       label: locale === 'ru' ? '7. Финальный Оффер' : '7. Final Offer', 
       placeholder: locale === 'ru' ? 'Почему клиент выберет вас?' : 'Why choose you?',
       hint: locale === 'ru' ? 'Ваше главное конкурентное преимущество.' : 'Your main competitive advantage.'
    },
  ];

  useEffect(() => {
    async function loadData() {
      await Promise.all([fetchDna(), fetchAnswers()]);
    }
    loadData();
  }, []);

  async function fetchDna() {
    try {
      const res = await fetch('/api/profile/dna');
      const data = await res.json();
      if (data.dna) setDna(data.dna);
      if (data.visualStyle) setSelectedStyle(data.visualStyle);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAnswers() {
    try {
      const res = await fetch('/api/profile/dna/answers');
      if (res.ok) {
        const data = await res.json();
        if (data && data.answers && typeof data.answers === 'object') {
          setAnswers(prev => ({ ...prev, ...data.answers }));
        }
      }
    } catch (e) {
      console.error('Failed to fetch DNA answers:', e);
    }
  }

  async function handleUpdateStyle(style: string) {
    setSelectedStyle(style);
    try {
      await fetch('/api/profile/dna', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visualStyle: style })
      });
    } catch (e) {
      console.error('Style update failed', e);
    }
  }

  async function handleUpdate() {
    setUpdating(true);
    setError(null);
    try {
      // 1. Save the 7 DNA Answers
      const answersRes = await fetch('/api/profile/dna/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, locale })
      });
      if (!answersRes.ok) {
        const errData = await answersRes.json();
        throw new Error(errData.error || 'Failed to save DNA answers');
      }

      // 2. Clear old ideas feed to trigger matrix regeneration
      const resetRes = await fetch('/api/ideas/reset', {
        method: 'DELETE'
      });
      if (!resetRes.ok) {
        throw new Error('Failed to reset ideas matrix');
      }

      // 3. Update the digital shadow prompt based on updated answers
      const compiledAnswers = Object.entries(answers)
        .map(([key, val]) => `${key.toUpperCase()}: ${val}`)
        .join('. ');
      
      const dnaRes = await fetch('/api/profile/dna', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newData: compiledAnswers, locale, resetPrompt: true })
      });

      if (dnaRes.ok) {
        const dnaData = await dnaRes.json();
        if (dnaData.dna) setDna(dnaData.dna);
      }

      // 4. Redirect to matrix scroller page to trigger rebuild
      router.push(`/app/ideas`);
    } catch (e: any) {
      console.error('[DnaLab] Regeneration error:', e);
      setError(e.message || 'Regeneration failed');
    } finally {
      setUpdating(false);
    }
  }

  async function handleReset() {
    const glob = typeof globalThis !== 'undefined' ? (globalThis as any) : null;
    if (glob && glob.confirm && !glob.confirm(t('resetWarning'))) return;
    setResetting(true);
    setError(null);
    try {
      const res = await fetch('/api/profile/dna', { method: 'DELETE' });
      if (!res.ok) throw new Error('Reset failed');
      router.push(`/app/onboarding`);
    } catch (e: any) {
      console.error('[DnaLab] Reset error:', e);
      setError(e.message || 'Reset failed');
    } finally {
      setResetting(false);
    }
  }

  async function handleForceRegenerateAll() {
    const msg = locale === 'ru' 
      ? 'Вы уверены, что хотите полностью стереть текущую матрицу и запустить новую генерацию идей на основе вашего ДНК?' 
      : 'Are you sure you want to completely erase the current matrix and start a new idea generation based on your DNA?';
    const glob = typeof globalThis !== 'undefined' ? (globalThis as any) : null;
    if (glob && glob.confirm && !glob.confirm(msg)) return;

    setRegeneratingAll(true);
    setError(null);
    try {
      // 1. Save the 7 DNA Answers
      const answersRes = await fetch('/api/profile/dna/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, locale })
      });
      if (!answersRes.ok) {
        const errData = await answersRes.json();
        throw new Error(errData.error || 'Failed to save DNA answers');
      }

      // 2. Clear old ideas feed to trigger matrix regeneration
      const resetRes = await fetch('/api/ideas/reset', {
        method: 'DELETE'
      });
      if (!resetRes.ok) {
        throw new Error('Failed to reset ideas matrix');
      }

      // 3. Update and force rebuild of digital shadow prompt from scratch
      const compiledAnswers = Object.entries(answers)
        .map(([key, val]) => `${key.toUpperCase()}: ${val}`)
        .join('. ');
      
      const dnaRes = await fetch('/api/profile/dna', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newData: compiledAnswers, locale, resetPrompt: true })
      });

      if (!dnaRes.ok) {
        throw new Error('Failed to rebuild brand DNA prompt');
      }

      const dnaData = await dnaRes.json();
      if (dnaData.dna) setDna(dnaData.dna);

      // 4. Redirect to matrix scroller page
      router.push(`/app/ideas`);
    } catch (e: any) {
      console.error('[DnaLab] Rebuild error:', e);
      setError(e.message || 'Rebuild failed');
    } finally {
      setRegeneratingAll(false);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in pb-24">
      {/* Premium Header */}
      <div className="relative">
        <Link 
          href={`/app/profile`}
          className="inline-flex items-center gap-2 text-white/30 hover:text-white transition-all group mb-6"
        >
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{locale === 'ru' ? 'НАЗАД В ПРОФИЛЬ' : 'BACK TO PROFILE'}</span>
        </Link>

        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-[#9B5FFF]/20 to-[#D4AF37]/20 border border-white/10 flex items-center justify-center shadow-2xl relative z-10">
              <Fingerprint size={32} className="text-[#D4AF37]" strokeWidth={1.5} />
            </div>
            <div className="absolute inset-0 bg-[#D4AF37]/20 blur-2xl rounded-full animate-pulse z-0" />
          </div>
          
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-2">
              DNA LAB
            </h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest leading-none">
                {t('sub')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout: Grid or Staggered */}
      <div className="grid gap-6">
        {/* Current Identity View */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2.5rem] p-6 glass-premium border border-white/[0.08]"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                <Activity size={14} className="text-[#D4AF37]" />
              </div>
              <h2 className="text-[10px] font-black tracking-[0.3em] text-[#D4AF37] uppercase">
                {t('currentPersona')}
              </h2>
            </div>
            <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-1.5">
              <Cpu size={10} className="text-white/40" />
              <span className="text-[9px] font-bold text-white/40 uppercase">V-ID: S-771</span>
            </div>
          </div>
          
          <div className="relative group">
            <div className="absolute -inset-1 blur-lg bg-gradient-to-r from-purple-500/10 to-cyan-500/10 opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-6 rounded-2xl bg-black/40 border border-white/5 font-medium text-xs leading-relaxed text-white/60 min-h-[160px] max-h-[400px] overflow-y-auto custom-scrollbar italic backdrop-blur-md">
              {loading ? (
                <div className="space-y-3">
                  <div className="h-2 bg-white/5 rounded w-full animate-pulse" />
                  <div className="h-2 bg-white/5 rounded w-[90%] animate-pulse" />
                  <div className="h-2 bg-white/5 rounded w-[95%] animate-pulse" />
                </div>
              ) : (
                <div className="relative">
                  <span className="text-2xl text-[#D4AF37]/20 absolute -top-4 -left-2 select-none font-serif">"</span>
                  {dna || 'Neural field empty...'}
                  <span className="text-2xl text-[#D4AF37]/20 absolute -bottom-4 ml-1 select-none font-serif">"</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Visual Identity / Golden Styles */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-[2.5rem] p-8 glass-premium border border-white/[0.08]"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <Palette size={14} className="text-purple-400" />
              </div>
              <div>
                <h2 className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase">
                  {locale === 'ru' ? 'ВИЗУАЛЬНЫЙ КОД' : 'VISUAL IDENTITY'}
                </h2>
                <p className="text-[9px] text-[#D4AF37] font-bold uppercase tracking-widest mt-1">
                  {locale === 'ru' ? '7 Экспертных Пресетов Монтажа ИИ' : '7 Expert AI Motion Presets'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { id: 'hormozi_bold', label: 'Hormozi High Energy', sub: locale === 'ru' ? 'Продажи & Мотивация' : 'High Retention & Sales', icon: <Zap size={18} />, color: 'from-amber-400 to-yellow-600' },
              { id: 'minimal_expert', label: 'Минимализм & Эксперт', sub: locale === 'ru' ? 'Бизнес & Консалтинг' : 'Business & Analytics', icon: <Scale size={18} />, color: 'from-sky-400 to-indigo-600' },
              { id: 'warm_empathic', label: 'Теплый Эмпатичный', sub: locale === 'ru' ? 'Психология & Коучинг' : 'Psychology & Coaching', icon: <Leaf size={18} />, color: 'from-rose-400 to-orange-500' },
              { id: 'editorial_luxury', label: 'Премиум & Глянец', sub: locale === 'ru' ? 'Люкс & Недвижимость' : 'Luxury & Real Estate', icon: <Crown size={18} />, color: 'from-[#D4AF37] to-[#8B7355]' },
              { id: 'cyberpunk_neon', label: 'Неоновый Киберпанк', sub: locale === 'ru' ? 'AI, Крипта & Web3' : 'AI, Web3 & Crypto', icon: <Cpu size={18} />, color: 'from-cyan-400 to-pink-600' },
              { id: 'vibrant_creator', label: 'Поп-Креатор', sub: locale === 'ru' ? 'TikTok & Reels Влоги' : 'TikTok & Reels Vlog', icon: <Rocket size={18} />, color: 'from-rose-500 to-emerald-400' },
              { id: 'tech_futuristic', label: 'Tech & High Arch', sub: locale === 'ru' ? 'IT-Продукты & Гаджеты' : 'IT Products & Tech', icon: <Activity size={18} />, color: 'from-purple-500 to-blue-600' },
            ].map((style) => (
              <button
                key={style.id}
                onClick={() => handleUpdateStyle(style.id)}
                className={`relative group p-4 rounded-3xl border transition-all duration-500 text-left overflow-hidden active:scale-95 ${
                  selectedStyle === style.id 
                    ? 'bg-white/15 border-purple-500/50 shadow-2xl scale-[1.02] shadow-purple-500/20' 
                    : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/[0.08]'
                }`}
              >
                {selectedStyle === style.id && (
                  <motion.div 
                    layoutId="activeGlow"
                    className={`absolute inset-0 bg-gradient-to-br ${style.color} opacity-20 blur-xl`}
                  />
                )}
                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${style.color} flex items-center justify-center mb-3 shadow-lg transform transition-transform group-hover:scale-110 group-hover:rotate-3 text-white`}>
                  {style.icon}
                </div>
                <h4 className="text-[11px] font-black text-white uppercase tracking-tighter leading-none mb-1">{style.label}</h4>
                <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">{style.sub}</p>
                
                {selectedStyle === style.id && (
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <span className="text-[7px] font-black uppercase tracking-widest text-purple-300">АКТИВЕН</span>
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,1)]" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </motion.div>


        {/* Calibration Protocols */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-[2.5rem] p-6 bg-gradient-to-b from-white/[0.05] to-transparent border border-white/[0.06]"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <Zap size={14} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-tight">
                {locale === 'ru' ? 'КАЛИБРОВКА СМЫСЛОВ (7 ВОПРОСОВ)' : 'SEMANTIC CALIBRATION (7 QUESTIONS)'}
              </h2>
              <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold">
                {locale === 'ru' ? 'Настройте ДНК бренда для точных рекомендаций ИИ' : 'Fine-tune your brand DNA for precise AI suggestions'}
              </p>
            </div>
          </div>

          {/* Lock notice */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[#D4AF37] text-xs font-bold flex items-center gap-2 mb-6">
            <AlertTriangle size={14} className="shrink-0" />
            <span>
              {locale === 'ru'
                ? 'Редактирование ДНК заблокировано. Чтобы изменить ответы, сбросьте профиль креатора внизу страницы.'
                : 'DNA editing is locked. To change answers, reset your creator profile at the bottom of the page.'}
            </span>
          </div>

          <div className="space-y-5 mb-6">
             {questions.map((q) => (
               <div key={q.id} className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase text-purple-400/50 tracking-wider flex items-center gap-1.5">
                   <span>{q.label}</span>
                   <span className="text-[9px] font-bold text-white/20 normal-case">({q.hint})</span>
                 </label>
                 <textarea
                   value={answers[q.id] || ''}
                   readOnly
                   placeholder={q.placeholder}
                   className="w-full h-20 bg-white/[0.01] border border-white/[0.04] rounded-xl p-3 text-xs text-white/40 resize-none placeholder:text-white/5 outline-none leading-relaxed font-medium cursor-not-allowed"
                 />
               </div>
             ))}
          </div>

          {error && (
            <div className="mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest text-center animate-shake">
              ⚠️ {error}
            </div>
          )}
        </motion.div>

        {/* Force Rebuild & Regenerate Matrix Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-[2.5rem] bg-purple-500/5 border border-purple-500/10 flex flex-col items-center text-center gap-1.5"
        >
          <Sparkles size={24} className="text-purple-400 mb-2 animate-pulse" />
          <h3 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em]">
            {locale === 'ru' ? 'РЕГЕНЕРИРОВАТЬ МАТРИЦУ' : 'REGENERATE MATRIX'}
          </h3>
          <p className="text-[9px] text-white/30 uppercase tracking-widest font-black">
            {locale === 'ru' ? 'Генерация новой матрицы без условий' : 'Generate new matrix from scratch'}
          </p>
          <p className="text-[11px] text-white/40 max-w-[280px] leading-relaxed my-3 font-medium">
            {locale === 'ru' 
              ? 'ИИ сотрет ВСЕ старые автомобильные идеи и создаст новые темы исключительно про психологию и ваш коучинг.' 
              : 'AI will erase ALL old car ideas and construct new themes strictly on psychology and coaching.'}
          </p>
          <button
            onClick={handleForceRegenerateAll}
            disabled={regeneratingAll || Object.values(answers).every(v => !v || !v.trim())}
            className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl transition-all font-black uppercase text-xs tracking-[0.2em] disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed text-white shadow-[0_10px_30px_rgba(168,85,247,0.15)] bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 hover:scale-[1.02] active:scale-95"
          >
            {regeneratingAll ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Sparkles size={16} />
                <span>{locale === 'ru' ? 'РЕГЕНЕРИРОВАТЬ КОНТЕНТ' : 'REGENERATE CONTENT'}</span>
              </>
            )}
          </button>
        </motion.div>

        {/* Terminal Options / Danger Zone */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-[2.5rem] bg-[#FF4D6D]/05 border border-[#FF4D6D]/10 flex flex-col items-center text-center opacity-60 hover:opacity-100 transition-opacity"
        >
          <AlertTriangle size={24} className="text-[#FF4D6D] mb-3 opacity-50" />
          <h3 className="text-[10px] font-black text-[#FF4D6D] uppercase tracking-[0.4em] mb-4">
            {t('resetTitle')}
          </h3>
          <p className="text-[11px] text-white/30 lowercase max-w-[240px] mb-6">
            {t('resetWarning')}
          </p>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="px-8 py-3 rounded-xl border border-[#FF4D6D]/20 text-[#FF4D6D] hover:bg-[#FF4D6D] hover:text-white transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
          >
            {resetting ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
            {t('resetBtn')}
          </button>
        </motion.div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.01);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(212, 175, 55, 0.3);
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
}
