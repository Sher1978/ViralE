'use client';

import { useState, useEffect } from 'react';
import { Dna, CheckCircle2, Circle, Mic, Sparkles, ChevronRight, ChevronDown, Info } from 'lucide-react';
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

export default function DNABlock({ onComplete, initialAnswers }: DNABlockProps) {
  const t = useTranslations('ideas');
  const locale = useLocale();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [answers, setAnswers] = useState<DnaAnswers>({
    sphere: initialAnswers?.sphere || '',
    audience: initialAnswers?.audience || '',
    painPoint: initialAnswers?.painPoint || '',
    approach: initialAnswers?.approach || '',
    goal: initialAnswers?.goal || '',
    tone: initialAnswers?.tone || '',
    advantage: initialAnswers?.advantage || '',
  });

  const [activeQuestion, setActiveQuestion] = useState<keyof DnaAnswers>('sphere');
  const [saving, setSaving] = useState(false);

  const questions: { id: keyof DnaAnswers, label: string, placeholder: string }[] = [
    { id: 'sphere', label: locale === 'ru' ? 'Сфера деятельности' : 'Sphere of Activity', placeholder: locale === 'ru' ? 'Напр: Автоподбор, Психология...' : 'e.g. Car Selection, Psychology...' },
    { id: 'audience', label: locale === 'ru' ? 'Целевая аудитория' : 'Target Audience', placeholder: locale === 'ru' ? 'Кто ваши идеальные клиенты?' : 'Who are your ideal clients?' },
    { id: 'painPoint', label: locale === 'ru' ? 'Основная боль' : 'Primary Pain Point', placeholder: locale === 'ru' ? 'Какую проблему вы решаете?' : 'What problem do you solve?' },
    { id: 'approach', label: locale === 'ru' ? 'Уникальный подход' : 'Unique Approach', placeholder: locale === 'ru' ? 'В чем ваш "секретный соус"?' : 'What is your "secret sauce"?' },
    { id: 'goal', label: locale === 'ru' ? 'Цель контента' : 'Content Goal', placeholder: locale === 'ru' ? 'Продажи, доверие или охваты?' : 'Sales, trust, or reach?' },
    { id: 'tone', label: locale === 'ru' ? 'Тон голоса' : 'Tone of Voice', placeholder: locale === 'ru' ? 'Юмор, экспертность, провокация?' : 'Humor, expert, provocative?' },
    { id: 'advantage', label: locale === 'ru' ? 'Главное преимущество' : 'Competitive Advantage', placeholder: locale === 'ru' ? 'Почему выбирают именно вас?' : 'Why choose you?' },
  ];

  const completedCount = Object.values(answers).filter(v => v.length > 2).length;
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
        setIsExpanded(false);
      }
    } catch (err) {
      console.error('Failed to save DNA answers:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] backdrop-blur-xl">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 blur-[100px] rounded-full" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 blur-[100px] rounded-full" />

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${isComplete ? 'bg-green-500/10 border-green-500/20' : 'bg-purple-500/10 border-purple-500/20'} border`}>
              <Dna className={`w-5 h-5 ${isComplete ? 'text-green-400' : 'text-purple-400'}`} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tighter text-white">
                {locale === 'ru' ? 'ДНК Стратегия' : 'DNA Strategy'}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1 h-1 rounded-full ${isComplete ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">
                  {isComplete 
                    ? (locale === 'ru' ? 'Калибровка завершена' : 'Calibration Complete')
                    : (locale === 'ru' ? `Заполнено: ${completedCount}/7` : `Progress: ${completedCount}/7`)}
                </p>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4 text-white/50" /> : <ChevronRight className="w-4 h-4 text-white/50" />}
          </button>
        </div>

        {!isExpanded && !isComplete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10 flex items-center gap-3"
          >
            <Info className="w-4 h-4 text-yellow-500/50 shrink-0" />
            <p className="text-[10px] text-white/40 leading-relaxed uppercase tracking-wider font-medium">
              {locale === 'ru' 
                ? 'Заполните ДНК для активации Матрицы Бена Ханта' 
                : 'Fill DNA to activate Ben Hunt Matrix distribution'}
            </p>
          </motion.div>
        )}

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-6 space-y-6 overflow-hidden"
            >
              {/* Question Navigation */}
              <div className="flex gap-1 overflow-x-auto pb-2 no-scrollbar">
                {questions.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => setActiveQuestion(q.id)}
                    className={`shrink-0 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                      activeQuestion === q.id 
                        ? 'bg-white/10 text-white border border-white/10' 
                        : answers[q.id].length > 2 
                          ? 'text-green-400/50' 
                          : 'text-white/20'
                    }`}
                  >
                    {answers[q.id].length > 2 && <CheckCircle2 className="w-3 h-3 inline mr-1 mb-0.5" />}
                    {questions.indexOf(q) + 1}
                  </button>
                ))}
              </div>

              {/* Active Question Input */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">
                    {questions.find(q => q.id === activeQuestion)?.label}
                  </label>
                  <div className="relative group">
                    <textarea
                      value={answers[activeQuestion]}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [activeQuestion]: e.target.value }))}
                      placeholder={questions.find(q => q.id === activeQuestion)?.placeholder}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-purple-500/50 transition-all min-h-[100px] resize-none"
                    />
                    <button className="absolute right-4 bottom-4 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group-hover:scale-110">
                      <Mic className="w-3 h-3 text-white/30" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-2">
                  <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
                      style={{ width: `${(completedCount / 7) * 100}%` }}
                    />
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="shrink-0 px-6 py-3 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                  >
                    {saving ? <Sparkles className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {locale === 'ru' ? 'Калибровать' : 'Calibrate'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
