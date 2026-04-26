'use client';

import { useState } from 'react';
import { Target, Rocket, Sparkles, Wand2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';

interface TopicInputProps {
  onLaunch: (topic: string) => void;
}

export default function TopicInput({ onLaunch }: TopicInputProps) {
  const [topic, setTopic] = useState('');
  const locale = useLocale();

  const handleLaunch = () => {
    if (topic.trim()) {
      onLaunch(topic);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative group p-[1px] rounded-[2.5rem] bg-gradient-to-br from-cyan-500 via-purple-500 to-blue-500 overflow-hidden shadow-2xl shadow-purple-500/20"
    >
      <div className="bg-[#020617] rounded-[2.5rem] p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Target size={16} className="text-cyan-400" />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">
                {locale === 'ru' ? 'БЫСТРЫЙ ЗАПУСК' : 'QUICK LAUNCH'}
            </h3>
        </div>

        <div className="relative">
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={locale === 'ru' ? 'Введите свою тему здесь...' : 'Enter your custom topic here...'}
            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-lg font-bold text-white placeholder:text-white/10 focus:outline-none focus:border-cyan-500/50 transition-all min-h-[120px] resize-none"
          />
          
          <div className="absolute right-4 bottom-4 flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 border border-white/5">
                <Sparkles size={12} className="text-purple-400" />
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">AI Matrix Enhanced</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLaunch}
          disabled={!topic.trim()}
          className="w-full h-16 bg-white text-black rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-[0.2em] text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-20 disabled:grayscale"
        >
          <Rocket size={18} />
          {locale === 'ru' ? 'ВЫБРАТЬ ТЕМУ' : 'SELECT TOPIC'}
          <Wand2 size={16} className="text-purple-500" />
        </button>
      </div>
    </motion.div>
  );
}
