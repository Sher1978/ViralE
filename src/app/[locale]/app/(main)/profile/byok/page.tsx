'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronLeft, RefreshCw, Save, Key, Brain, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function ByokSettingsPage() {
  const t = useTranslations('profile');
  const locale = useLocale();
  
  const [keys, setKeys] = useState<{
    heygen: { hasKey: boolean; maskedKey: string | null };
    anthropic: { hasKey: boolean; maskedKey: string | null };
    groq: { hasKey: boolean; maskedKey: string | null };
  }>({
    heygen: { hasKey: false, maskedKey: null },
    anthropic: { hasKey: false, maskedKey: null },
    groq: { hasKey: false, maskedKey: null }
  });

  const [form, setForm] = useState({
    heygenKey: '',
    anthropicKey: '',
    groqKey: ''
  });

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
    } catch (e) {
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
          groqKey: form.groqKey || undefined
        })
      });
      if (res.ok) {
        await fetchKeys();
        setForm({ heygenKey: '', anthropicKey: '', groqKey: '' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
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
            background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(0,255,204,0.1))',
            border: '1px solid rgba(212,175,55,0.2)'
          }}
        >
          <Key className="w-6 h-6 text-[#D4AF37]" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white leading-tight uppercase tracking-tight">
            BYOK SETTINGS
          </h1>
          <p className="text-[10px] text-white/40 uppercase tracking-[0.2em]">Manage your own API keys</p>
        </div>
      </div>

      {/* HeyGen Key */}
      <KeySection
        icon="👤"
        title={t('heygenKeyLabel')}
        hint={t('heygenKeyHint')}
        placeholder={t('heygenKeyPlaceholder')}
        status={keys.heygen}
        value={form.heygenKey}
        onChange={(val) => setForm({ ...form, heygenKey: val })}
        accent="#00FFCC"
        link="https://app.heygen.com/settings?nav=API"
      />

      {/* Anthropic Key */}
      <KeySection
        icon={<Brain className="w-4 h-4" />}
        title={t('anthropicKeyLabel')}
        hint={t('anthropicKeyHint')}
        placeholder={t('anthropicKeyPlaceholder')}
        status={keys.anthropic}
        value={form.anthropicKey}
        onChange={(val) => setForm({ ...form, anthropicKey: val })}
        accent="#9B5FFF"
        link="https://console.anthropic.com/settings/keys"
      />

      {/* Groq Key */}
      <KeySection
        icon="⚡"
        title="Groq API Key"
        hint="Used for ultra-fast script generation."
        placeholder="Enter your gsk-..."
        status={keys.groq}
        value={form.groqKey}
        onChange={(val) => setForm({ ...form, groqKey: val })}
        accent="#F55036"
        link="https://console.groq.com/keys"
      />

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving || (!form.heygenKey && !form.anthropicKey && !form.groqKey)}
        className="fixed bottom-24 left-6 right-6 flex items-center justify-center gap-2 py-4 rounded-2xl transition-all font-black uppercase text-[11px] tracking-widest disabled:opacity-30 disabled:cursor-not-allowed group z-50 text-white"
        style={{
          background: 'linear-gradient(90deg, #D4AF37, #FFD700)',
          boxShadow: '0 4px 20px rgba(212,175,55,0.3)',
          maxWidth: '400px',
          margin: '0 auto'
        }}
      >
        {saving ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Save Keys</span>
          </>
        )}
      </button>
    </div>
  );
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
  link
}: any) {
  return (
    <div 
      className="rounded-3xl p-6 space-y-4"
      style={{
        background: 'rgba(11,18,41,0.6)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
            style={{ background: `${accent}15`, border: `1px solid ${accent}25`, color: accent }}
          >
            {icon}
          </div>
          <h2 className="text-[12px] font-black text-white uppercase tracking-tight">{title}</h2>
        </div>
        {status.hasKey && (
          <span 
            className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}
          >
            Active
          </span>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-white/40 uppercase tracking-widest block ml-1">{hint}</label>
        <div className="relative">
          <input
            type="password"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={status.hasKey ? status.maskedKey || placeholder : placeholder}
            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-[12px] text-white focus:outline-none focus:ring-1 transition-all placeholder:text-white/10 outline-none pr-12"
            style={{ focusRingColor: accent }}
          />
          {link && (
            <a 
              href={link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
