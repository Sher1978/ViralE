'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronLeft, RefreshCw, Save, Key, Brain, ExternalLink, Zap, User, Sparkles } from 'lucide-react';
import { Link } from '@/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LateDevInstructionModal } from '@/components/modals/LateDevInstructionModal';

export default function ByokSettingsPage() {
  const t = useTranslations('profile');
  const locale = useLocale();
  
  const [keys, setKeys] = useState<{
    heygen: { hasKey: boolean; maskedKey: string | null };
    anthropic: { hasKey: boolean; maskedKey: string | null };
    groq: { hasKey: boolean; maskedKey: string | null };
    gemini: { hasKey: boolean; maskedKey: string | null };
    elevenlabs: { hasKey: boolean; maskedKey: string | null };
    latedev?: { hasKey: boolean; maskedKey: string | null };
  }>({
    heygen: { hasKey: false, maskedKey: null },
    anthropic: { hasKey: false, maskedKey: null },
    groq: { hasKey: false, maskedKey: null },
    gemini: { hasKey: false, maskedKey: null },
    elevenlabs: { hasKey: false, maskedKey: null },
    latedev: { hasKey: false, maskedKey: null }
  });

  const [form, setForm] = useState({
    heygenKey: '',
    anthropicKey: '',
    groqKey: '',
    geminiKey: '',
    elevenlabsKey: '',
    latedevKey: ''
  });

  const [lateModalOpen, setLateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  async function fetchKeys() {
    try {
      const res = await fetch('/api/profile/byok');
      const data = await res.json();
      if (!data.error) {
        setKeys(data);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/profile/byok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heygenKey: form.heygenKey || undefined,
          anthropicKey: form.anthropicKey || undefined,
          groqKey: form.groqKey || undefined,
          geminiKey: form.geminiKey || undefined,
          elevenlabsKey: form.elevenlabsKey || undefined,
          latedevKey: form.latedevKey || undefined
        })
      });
      if (res.ok) {
        await fetchKeys();
        setForm({ heygenKey: '', anthropicKey: '', groqKey: '', geminiKey: '', elevenlabsKey: '', latedevKey: '' });
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 animate-fade-in pb-32"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link 
          href="/app/profile"
          className="flex items-center gap-2 text-white/40 hover:text-white transition-all group text-[11px] font-black uppercase tracking-[0.2em]"
        >
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-white/10 group-hover:scale-105 transition-all">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </div>
          <span>{t('title')}</span>
        </Link>
      </div>

      <div className="flex items-center gap-6">
        <div 
          className="w-16 h-16 rounded-[2rem] flex items-center justify-center border shadow-2xl relative overflow-hidden group"
          style={{
            background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(0,255,204,0.1))',
            border: '1px solid rgba(212,175,55,0.2)'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <Key className="w-8 h-8 text-[#D4AF37] relative z-10" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white leading-tight uppercase tracking-tight">
            Digital Connectors
          </h1>
          <p className="text-[11px] text-white/40 uppercase tracking-[0.3em] mt-1 font-medium">Link your production engines</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw className="w-8 h-8 text-[#D4AF37] animate-spin" />
          <p className="text-[10px] text-white/20 uppercase tracking-widest">Syncing protocols...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <KeySection
            icon={<User className="w-4 h-4" />}
            title={t('heygenKeyLabel')}
            hint={t('heygenKeyHint')}
            placeholder={t('heygenKeyPlaceholder')}
            status={keys.heygen}
            value={form.heygenKey}
            onChange={(val: string) => setForm({ ...form, heygenKey: val })}
            accent="#00FFCC"
            link="https://app.heygen.com/settings?nav=API"
            delay={0.1}
          />

          <KeySection
            icon={<Brain className="w-4 h-4" />}
            title={t('anthropicKeyLabel')}
            hint={t('anthropicKeyHint')}
            placeholder={t('anthropicKeyPlaceholder')}
            status={keys.anthropic}
            value={form.anthropicKey}
            onChange={(val: string) => setForm({ ...form, anthropicKey: val })}
            accent="#9B5FFF"
            link="https://console.anthropic.com/settings/keys"
            delay={0.2}
          />

          <KeySection
            icon={<Zap className="w-4 h-4" />}
            title="Groq Intelligence"
            hint="Used for ultra-fast script generation pipelines."
            placeholder="Enter your gsk-..."
            status={keys.groq}
            value={form.groqKey}
            onChange={(val: string) => setForm({ ...form, groqKey: val })}
            accent="#F55036"
            link="https://console.groq.com/keys"
            delay={0.3}
          />

          <KeySection
            icon={<Sparkles className="w-4 h-4" />}
            title="Gemini AI Studio (Google)"
            hint="Used for strategic TRIZ marketing matrices and fast scenarios."
            placeholder="Enter your AIzaSy..."
            status={keys.gemini}
            value={form.geminiKey}
            onChange={(val: string) => setForm({ ...form, geminiKey: val })}
            accent="#00C8FF"
            link="https://aistudio.google.com/app/apikey"
            delay={0.4}
          />

          <KeySection
            icon={<User className="w-4 h-4" />}
            title="ElevenLabs Voice (Speech Synthesis)"
            hint="Used to generate human-like synthetic voice narration."
            placeholder="Enter your ElevenLabs API Key..."
            status={keys.elevenlabs}
            value={form.elevenlabsKey}
            onChange={(val: string) => setForm({ ...form, elevenlabsKey: val })}
            accent="#00FF9F"
            link="https://elevenlabs.io/app/settings/api-keys"
            delay={0.5}
          />

          <div className="relative">
            <KeySection
              icon={<Zap className="w-4 h-4" />}
              title="Late.dev / Zernio (1-Click Auto-Posting)"
              hint="Каждый юзер привязывает свой API Ключ для автопостинга в YouTube, Instagram, TikTok & Telegram."
              placeholder="Enter your Late.dev sk_... API key"
              status={keys.latedev || { hasKey: false, maskedKey: null }}
              value={form.latedevKey}
              onChange={(val: string) => setForm({ ...form, latedevKey: val })}
              accent="#A855F7"
              link="https://late.dev"
              delay={0.6}
            />

            <button
              type="button"
              onClick={() => setLateModalOpen(true)}
              className="mt-2 text-[10px] font-bold text-purple-300 hover:text-purple-200 underline flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-xl"
            >
              <span>❓ Как получить персональный API Ключ Late.dev / Zernio? (Инструкция)</span>
            </button>
          </div>
        </div>
      )}

      {/* Late.dev Step-by-Step Instructions Modal */}
      <LateDevInstructionModal
        isOpen={lateModalOpen}
        onClose={() => setLateModalOpen(false)}
        onSavedSuccess={() => fetchKeys()}
      />

      {/* Floating Action Button */}
      <AnimatePresence>
        {(form.heygenKey || form.anthropicKey || form.groqKey || form.geminiKey || form.elevenlabsKey || form.latedevKey) && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-32 left-6 right-6 flex justify-center z-50 pointer-events-none"
          >
            <button
              onClick={handleSave}
              disabled={saving}
              className="pointer-events-auto flex items-center justify-center gap-3 py-4 px-12 rounded-[1.5rem] transition-all font-black uppercase text-[12px] tracking-[0.2em] shadow-[0_20px_50px_rgba(212,175,55,0.4)] group overflow-hidden relative"
              style={{
                background: 'linear-gradient(135deg, #D4AF37 0%, #FFD700 100%)',
                color: '#000'
              }}
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
              {saving ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Execute Sync</span>
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface KeySectionProps {
  icon: React.ReactNode;
  title: string;
  hint: string;
  placeholder: string;
  status: { hasKey: boolean; maskedKey: string | null };
  value: string;
  onChange: (val: string) => void;
  accent: string;
  link?: string;
  delay?: number;
}

function KeySection({ 
  icon, 
  title, 
  hint, 
  placeholder, 
  status, 
  value, 
  onChange, 
  accent,
  link,
  delay = 0
}: KeySectionProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="glass-premium rounded-[2rem] p-6 space-y-6 relative group overflow-hidden"
    >
      {/* Background Glow */}
      <div 
        className="absolute -top-24 -right-24 w-48 h-48 blur-[100px] opacity-0 group-hover:opacity-10 transition-opacity duration-1000 pointer-events-none"
        style={{ background: accent }}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div 
            className="w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-500 group-hover:scale-110"
            style={{ 
              background: `${accent}10`, 
              borderColor: `${accent}20`,
              color: accent,
              boxShadow: `0 0 20px ${accent}05`
            }}
          >
            {icon}
          </div>
          <div>
            <h2 className="text-[13px] font-black text-white uppercase tracking-tight">{title}</h2>
            {status.hasKey && (
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: accent }} />
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: accent }}>
                  Sync Established
                </span>
              </div>
            )}
          </div>
        </div>
        
        {link && (
          <a 
            href={link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-white/20 hover:text-white hover:bg-white/10 hover:scale-110 transition-all cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <label className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-bold">{hint}</label>
          {!status.hasKey && (
            <span className="text-[9px] text-white/20 italic">Offline</span>
          )}
        </div>
        <div className="relative group/input">
          <input
            type="password"
            autoComplete="new-password"
            value={value}
            onChange={(e) => onChange((e.target as any).value)}
            placeholder={status.hasKey ? status.maskedKey || placeholder : placeholder}
            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-[12px] text-white focus:outline-none focus:ring-2 focus:bg-white/[0.05] transition-all placeholder:text-white/10 outline-none pr-12 font-mono tracking-widest"
            style={{ 
              borderColor: value ? `${accent}40` : 'rgba(255,255,255,0.05)',
              boxShadow: value ? `0 0 30px ${accent}10` : 'none'
            }}
          />
          {value && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Sparkles className="w-4 h-4 animate-pulse" style={{ color: accent }} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
