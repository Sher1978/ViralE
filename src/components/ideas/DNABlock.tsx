'use client';

import { useState, useEffect } from 'react';
import { Dna, CheckCircle2, Circle, Mic, Sparkles, ChevronRight, ChevronDown, Info, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';

interface DnaAnswers {
  sphere: string;
  audience: string;
  painPoint: string;
  approach: string;
  goal: string;
  tone: string;
  advantage: string;
}

interface DNABlockProps {
  onComplete: (answers: DnaAnswers) => void;
  initialAnswers?: Partial<DnaAnswers>;
}

export default function DNABlock({ onComplete }: DNABlockProps) {
  const t = useTranslations('ideas');
  const locale = useLocale();
  
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<DnaAnswers>({
    sphere: '',
    audience: '',
    painPoint: '',
    approach: '',
    goal: '',
    tone: '',
    advantage: '',
  });

  const [activeQuestion, setActiveQuestion] = useState<keyof DnaAnswers>('sphere');
  const [saving, setSaving] = useState(false);

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
    async function fetchDna() {
      try {
        const res = await fetch('/api/profile/dna/answers');
        if (res.ok) {
          const data = await res.json();
          if (data && data.answers) {
             setAnswers(data.answers);
          }
        }
      } catch (e) {
        console.error('Failed to fetch DNA:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchDna();
  }, []);

  const completedCount = Object.values(answers).filter(v => v && v.length > 2).length;
  const isComplete = completedCount >= 7;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile/dna/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, locale }),
      });
      if (res.ok) {
        onComplete(answers);
        setIsOpen(false);
      }
    } catch (err) {
      console.error('Failed to save DNA answers:', err);
    } finally {
      setSaving(false);
    }
  };

  const activeIndex = questions.findIndex(q => q.id === activeQuestion);

  return (
    <>
    <motion.div 
      onClick={() => setIsOpen(true)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] backdrop-blur-xl cursor-pointer group"
    >
      {/* Background Glow */}
      <div className={`absolute -top-24 -right-24 w-48 h-48 ${isComplete ? 'bg-green-500/10' : 'bg-purple-500/10'} blur-[100px] rounded-full transition-colors duration-1000`} />
      
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${isComplete ? 'bg-green-500/20 border-green-500/30' : 'bg-purple-500/20 border-purple-500/30'} border transition-all group-hover:scale-110`}>
              <Dna className={`w-6 h-6 ${isComplete ? 'text-green-400' : 'text-purple-400'}`} />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tighter text-white">
                {locale === 'ru' ? 'ДНК Стратегия' : 'DNA Strategy'}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isComplete ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                  {isComplete 
                    ? (locale === 'ru' ? 'Калибровка: 100%' : 'Calibration: 100%')
                    : (locale === 'ru' ? `Прогресс: ${completedCount}/7` : `Progress: ${completedCount}/7`)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {!isComplete && (
                <span className="hidden sm:block text-[10px] font-black uppercase tracking-widest text-purple-400/60 animate-pulse">
                   {locale === 'ru' ? 'Активировать' : 'Activate now'}
                </span>
             )}
             <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-all">
                <ChevronRight className="w-5 h-5 text-white/50" />
             </div>
          </div>
        </div>

        {!isComplete && (
          <div className="mt-4 p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-purple-400/50 shrink-0" />
            <p className="text-[10px] text-white/30 leading-relaxed uppercase tracking-[0.15em] font-black">
              {locale === 'ru' 
                ? 'Заполни ДНК для доступа к бесконечной ленте идей' 
                : 'Fill DNA to unlock the infinite idea hub'}
            </p>
          </div>
        )}
      </div>
    </motion.div>

    <AnimatePresence>
      {isOpen && (
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-2xl flex flex-col"
        >
           {/* Header */}
           <div className="px-8 pt-10 pb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                    <Dna className="w-6 h-6 text-purple-400" />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-white">DNA <span className="text-purple-500">Calibration</span></h2>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">Step {activeIndex + 1} of 7</p>
                 </div>
              </div>
              <button 
                 onClick={() => setIsOpen(false)}
                 className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all"
              >
                 <X className="w-6 h-6 text-white/50" />
              </button>
           </div>

           {/* Progress Line */}
           <div className="px-8 pb-10">
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                 <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((activeIndex + 1) / 7) * 100}%` }}
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                 />
              </div>
           </div>

           {/* Questions Content */}
           <div className="flex-1 px-8 flex flex-col justify-center max-w-2xl mx-auto w-full">
              <AnimatePresence mode="wait">
                 <motion.div
                    key={activeQuestion}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    className="space-y-8"
                 >
                    <div className="space-y-2">
                       <span className="text-purple-500 font-black text-xs uppercase tracking-[0.3em]">{questions[activeIndex].hint}</span>
                       <h3 className="text-4xl font-black text-white leading-none tracking-tighter uppercase italic">{questions[activeIndex].label}</h3>
                    </div>

                    <div className="relative group">
                       <textarea
                          autoFocus
                          value={answers[activeQuestion]}
                          onChange={(e) => setAnswers(prev => ({ ...prev, [activeQuestion]: e.target.value }))}
                          placeholder={questions[activeIndex].placeholder}
                          className="w-full bg-white/[0.03] border-2 border-white/10 rounded-[2rem] p-8 text-xl font-medium text-white placeholder:text-white/10 focus:outline-none focus:border-purple-500 transition-all min-h-[200px] resize-none shadow-2xl"
                       />
                       <div className="absolute right-6 bottom-6 flex items-center gap-3">
                          <button className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                             <Mic className="w-5 h-5 text-purple-400" />
                          </button>
                       </div>
                    </div>
                 </motion.div>
              </AnimatePresence>
           </div>

           {/* Footer Controls */}
           <div className="p-8 pb-16 border-t border-white/5 bg-black/80 flex items-center justify-between gap-6 z-[10010] relative">
              <button
                 disabled={activeIndex === 0}
                 onClick={() => setActiveQuestion(questions[activeIndex - 1].id)}
                 className="px-6 py-4 rounded-[1.25rem] border border-white/10 text-white/50 font-black uppercase text-[10px] tracking-widest disabled:opacity-20 hover:bg-white/5 transition-all"
              >
                 {locale === 'ru' ? 'Назад' : 'Back'}
              </button>

              {activeIndex < 6 ? (
                 <button
                    disabled={!answers[activeQuestion] || answers[activeQuestion].length < 2}
                    onClick={() => setActiveQuestion(questions[activeIndex + 1].id)}
                    className="flex-1 py-4 rounded-[1.25rem] bg-white text-black font-black uppercase text-[10px] tracking-widest shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 flex items-center justify-center gap-3"
                 >
                    {locale === 'ru' ? 'След. вопрос' : 'Next Question'}
                    <ChevronRight className="w-4 h-4" />
                 </button>
              ) : (
                 <button
                    disabled={saving || !isComplete}
                    onClick={handleSave}
                    className="flex-1 py-4 rounded-[1.25rem] bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black uppercase text-[10px] tracking-widest shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 flex items-center justify-center gap-3"
                 >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {locale === 'ru' ? 'Активировать Матрицу' : 'Activate Matrix'}
                 </button>
              )}
           </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
