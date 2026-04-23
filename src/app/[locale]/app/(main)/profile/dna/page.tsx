'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ChevronLeft, RefreshCw, Trash2, Brain, Save, Sparkles, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function DnaManagementPage() {
  const t = useTranslations('profileDna');
  const locale = useLocale();
  const router = useRouter();
  
  const [dna, setDna] = useState('');
  const [newData, setNewData] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetchDna();
  }, []);

  async function fetchDna() {
    try {
      const res = await fetch('/api/profile/dna');
      const data = await res.json();
      if (data.dna) setDna(data.dna);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate() {
    if (!newData.trim()) return;
    setUpdating(true);
    try {
      const res = await fetch('/api/profile/dna', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newData, locale })
      });
      const data = await res.json();
      if (data.dna) {
        setDna(data.dna);
        setNewData('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  }

  async function handleReset() {
    if (!confirm(t('resetWarning'))) return;
    setResetting(true);
    try {
      const res = await fetch('/api/profile/dna', { method: 'DELETE' });
      if (res.ok) {
        router.push(`/${locale}/app/onboarding`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link 
          href={`/${locale}/app/profile`}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group text-[11px] font-black uppercase tracking-widest"
        >
          <ChevronLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
          <span>Profile</span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div 
          className="p-3 rounded-2xl flex items-center justify-center border"
          style={{
            background: 'linear-gradient(135deg, rgba(155,95,255,0.2), rgba(0,255,204,0.1))',
            border: '1px solid rgba(155,95,255,0.2)'
          }}
        >
          <Brain className="w-6 h-6 text-[#9B5FFF]" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white leading-tight uppercase tracking-tight">
            {t('title')}
          </h1>
          <p className="text-[10px] text-white/40 uppercase tracking-[0.2em]">{t('sub')}</p>
        </div>
      </div>

      {/* Current DNA Block */}
      <div 
        className="rounded-3xl p-6 space-y-4"
        style={{
          background: 'rgba(11,18,41,0.6)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-[#D4AF37]" />
            <h2 className="text-[10px] font-black tracking-widest text-white/50 uppercase">
              {t('currentPersona')}
            </h2>
          </div>
          {loading && <RefreshCw className="w-3 h-3 text-white/20 animate-spin" />}
        </div>
        
        <div className="p-4 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px] leading-relaxed text-white/70 min-h-[120px] max-h-[300px] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="space-y-2">
              <div className="h-3 bg-white/5 rounded w-3/4 animate-pulse" />
              <div className="h-3 bg-white/5 rounded w-1/2 animate-pulse" />
            </div>
          ) : dna || 'No DNA found. Initializing your shadow...'}
        </div>
      </div>

      {/* Update DNA Block */}
      <div 
        className="rounded-3xl p-6 space-y-4 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(11,18,41,0.8), rgba(155,95,255,0.05))',
          border: '1px solid rgba(155,95,255,0.1)',
        }}
      >
        <div>
          <h2 className="text-sm font-black text-white uppercase tracking-tight mb-1">{t('updateTitle')}</h2>
          <p className="text-[10px] text-white/40 uppercase tracking-widest">{t('updateSub')}</p>
        </div>

        <textarea
          value={newData}
          onChange={(e) => setNewData(e.target.value)}
          placeholder={t('placeholder')}
          className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-[12px] text-white focus:outline-none focus:ring-1 focus:ring-[#9B5FFF]/30 transition-all resize-none placeholder:text-white/10 outline-none"
        />

        <button
          onClick={handleUpdate}
          disabled={updating || !newData.trim()}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl transition-all font-black uppercase text-[11px] tracking-widest disabled:opacity-30 disabled:cursor-not-allowed group relative overflow-hidden text-white"
          style={{
            background: 'linear-gradient(90deg, #9B5FFF, #6C38FF)',
            boxShadow: '0 4px 20px rgba(155,95,255,0.3)'
          }}
        >
          {updating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>{t('updateBtn')}</span>
            </>
          )}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="p-6 rounded-3xl border border-red-500/10 bg-red-500/5 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3 h-3 text-red-500/50" />
          <h2 className="text-[10px] font-black text-red-500/50 uppercase tracking-widest">{t('resetTitle')}</h2>
        </div>
        <p className="text-[10px] text-white/30 lowercase">{t('resetWarning')}</p>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/20 text-red-500/50 hover:bg-red-500 hover:text-white transition-all text-[11px] font-black uppercase"
        >
          {resetting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          {t('resetBtn')}
        </button>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(155, 95, 255, 0.2);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
