'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
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
  Cpu
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

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
    <div className="space-y-8 animate-fade-in pb-24">
      {/* Premium Header */}
      <div className="relative">
        <Link 
          href={`/${locale}/app/profile`}
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
              <h2 className="text-sm font-black text-white uppercase tracking-tight">{t('updateTitle')}</h2>
              <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold">{t('updateSub')}</p>
            </div>
          </div>

          <textarea
            value={newData}
            onChange={(e) => setNewData(e.target.value)}
            placeholder={t('placeholder')}
            className="w-full h-40 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 text-sm text-white/80 focus:outline-none focus:border-purple-500/50 transition-all resize-none placeholder:text-white/10 outline-none leading-relaxed font-medium mb-6"
          />

          <button
            onClick={handleUpdate}
            disabled={updating || !newData.trim()}
            className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl transition-all font-black uppercase text-xs tracking-[0.2em] disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed group relative overflow-hidden text-white shadow-[0_10px_30px_rgba(168,85,247,0.2)]"
            style={{
              background: 'linear-gradient(135deg, #A855F7, #7C3AED)'
            }}
          >
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            {updating ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                <span>{t('updateBtn')}</span>
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
  );
}
