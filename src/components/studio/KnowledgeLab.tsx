'use client';

import { useState } from 'react';
import { Brain, Sparkles, RefreshCw, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { profileService, Profile } from '@/lib/services/profileService';

interface KnowledgeLabProps {
  profile: Profile;
  onProfileUpdate: (updated: Profile) => void;
  locale?: string;
}

export default function KnowledgeLab({ profile, onProfileUpdate, locale = 'en' }: KnowledgeLabProps) {
  const [trainingData, setTrainingData] = useState(profile.synthetic_training_data || '');
  const [isDistilling, setIsDistilling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await profileService.updateProfile(profile.id, {
        synthetic_training_data: trainingData
      });
      if (success) {
        onProfileUpdate({ ...profile, synthetic_training_data: trainingData });
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (err) {
      setStatus('error');
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const handleDistill = async () => {
    if (!trainingData) return;
    setIsDistilling(true);
    try {
      // Call the distillation API (which uses Gemini)
      const res = await fetch('/api/ai/distill-dna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, trainingData, locale })
      });
      
      if (!res.ok) throw new Error('Distillation failed');
      
      const data = await res.json();
      if (data.success) {
        onProfileUpdate(data.profile);
        setStatus('success');
      }
    } catch (err) {
      console.error('Distillation error:', err);
      setStatus('error');
    } finally {
      setIsDistilling(false);
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <aside className="w-80 border-r border-white/5 bg-[#0a0a14] flex flex-col p-6 animate-slide-in-left overflow-y-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
          <Brain className="text-purple-400" size={20} />
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-tight">Knowledge Lab</h3>
          <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Digital DNA Core</p>
        </div>
      </div>

      <div className="space-y-8 flex-1">
        {/* Synthetic Data Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between ml-1">
            <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Training Data</label>
            <span className="text-[8px] font-bold text-purple-400/60 uppercase">Mirroring Raw State</span>
          </div>
          <div className="relative group">
             <textarea 
               value={trainingData}
               onChange={(e) => setTrainingData(e.target.value)}
               placeholder="Paste your biography, style examples, philosophies, or raw text here..."
               className="w-full h-64 bg-white/5 border border-white/10 rounded-2xl p-5 text-xs text-white/80 leading-relaxed focus:outline-none focus:border-purple-500/50 resize-none transition-all scrollbar-thin scrollbar-thumb-white/10"
             />
             {!trainingData && (
               <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center p-8 opacity-20">
                 <Sparkles size={24} className="mb-2" />
                 <p className="text-[9px] font-bold uppercase tracking-widest">Empty DNA Sink</p>
               </div>
             )}
          </div>
          <p className="text-[8px] text-white/20 font-bold uppercase leading-relaxed px-1">
            Feed the engine with 500+ words for maximum author mirroring accuracy.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? 'Saving DNA...' : 'Save Raw Data'}
          </button>

          <button 
            onClick={handleDistill}
            disabled={isDistilling || !trainingData}
            className="w-full py-5 rounded-[2rem] bg-gradient-to-r from-purple-600 to-blue-600 text-white text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:shadow-[0_0_30px_rgba(147,51,234,0.4)] transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:grayscale"
          >
            {isDistilling ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {isDistilling ? 'Distilling...' : 'Distill Digital DNA'}
          </button>
        </div>

        {/* Status Indicator */}
        {status !== 'idle' && (
          <div className={`p-4 rounded-xl border flex items-center gap-3 animate-fade-in ${
            status === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {status === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span className="text-[10px] font-black uppercase tracking-widest">
              {status === 'success' ? 'DNA Matrix Stabilized' : 'Synaptic Link Error'}
            </span>
          </div>
        )}

        {/* Knowledge Fragments Preview */}
        {profile.knowledge_base_json && (
          <div className="pt-6 border-t border-white/5">
            <h4 className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-4 ml-1">Distilled Fragments</h4>
            <div className="space-y-2">
              {/* This would iterate over distilled fragments if we had them */}
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">Author Tone Profile</p>
                <div className="mt-2 flex flex-wrap gap-1">
                   <span className="text-[8px] px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold uppercase">Zen-Tech</span>
                   <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold uppercase">Philosophical</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
