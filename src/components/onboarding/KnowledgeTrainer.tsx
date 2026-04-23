'use client';

import { useState } from 'react';
import { Brain, Sparkles, Check, Loader2, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface KnowledgeTrainerProps {
  onTrainingComplete?: (newDna: string) => void;
}

export default function KnowledgeTrainer({ onTrainingComplete }: KnowledgeTrainerProps) {
  const [rawData, setRawData] = useState('');
  const [isTraining, setIsTraining] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleTrain = async () => {
    if (!rawData.trim()) return;

    setIsTraining(true);
    setStatus('idle');
    setError('');

    try {
      const response = await fetch('/api/profile/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawData })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Training failed');
      }

      const data = await response.json();
      setStatus('success');
      if (onTrainingComplete) onTrainingComplete(data.dna);
      setRawData('');
    } catch (err: any) {
      console.error('Training error:', err);
      setStatus('error');
      setError(err.message);
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="space-y-6 p-6 rounded-[2.5rem] bg-[#0a0a14] border border-white/5 shadow-2xl relative overflow-hidden group">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-600/10 blur-[80px] rounded-full group-hover:bg-purple-600/20 transition-all duration-700" />
      
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
          <Brain className="text-white w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-white">Knowledge Lab</h3>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">Feed synthetic data to your AI</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <label className="text-[10px] font-black uppercase text-white/40 tracking-widest leading-none">
            Synthetic Insight Source
          </label>
          <span className="text-[9px] font-bold text-purple-400/60 uppercase">Gemini / NotebookLM</span>
        </div>
        
        <textarea
          value={rawData}
          onChange={(e) => setRawData(e.target.value)}
          placeholder="Paste transcripts, synthetic notes, or AI analysis here... (Max 100k chars)"
          className="w-full bg-white/[0.03] border border-white/5 rounded-[1.5rem] p-5 text-sm text-white/70 min-h-[160px] focus:outline-none focus:border-purple-500/40 focus:bg-white/[0.05] transition-all leading-relaxed resize-none scrollbar-thin scrollbar-thumb-white/10"
        />
      </div>

      <button
        onClick={handleTrain}
        disabled={isTraining || !rawData.trim()}
        className="w-full py-4 rounded-[1.5rem] bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-white/90 hover:scale-[1.01] transition-all active:scale-95 disabled:opacity-20 disabled:grayscale"
      >
        {isTraining ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Distilling Essence...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Train Digital DNA
          </>
        )}
      </button>

      {status === 'success' && (
        <div className="flex items-center justify-center gap-2 animate-fade-in py-2">
          <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-green-500" />
          </div>
          <p className="text-[10px] font-black uppercase text-green-500/80 tracking-widest">DNA Successfully Updated</p>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center justify-center gap-2 animate-shake py-2">
          <AlertCircle className="w-3 h-3 text-red-500" />
          <p className="text-[10px] font-black uppercase text-red-500/80 tracking-widest">{error}</p>
        </div>
      )}

      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-3 items-start">
        <span className="text-sm">💡</span>
        <p className="text-[9px] font-bold text-white/30 leading-relaxed uppercase tracking-tight">
          Feeding high-fidelity synthetic data helps the AI Advisor understand your unique lexicon and strategic patterns better.
        </p>
      </div>
    </div>
  );
}
