'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { ChevronRight, LogOut } from 'lucide-react';
import { CreditBadge } from '@/components/ui/CreditBadge';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const commonT = useTranslations('common');
  const locale = useLocale();

  const SETTINGS_SECTIONS = [
    {
      title: t('sectionProfile'),
      items: [
        { icon: '🎭', label: t('dnaLabel'), sub: t('dnaSub'), href: `/${locale}/app/profile/dna`, accent: '#D4AF37' },
        { icon: '👤', label: t('avatarLabel'), sub: t('avatarSub'), href: `/${locale}/app/profile/avatar`, accent: '#00FFCC' },
        { icon: '✈️', label: t('telegramLabel'), sub: t('telegramSub'), href: `/${locale}/app/profile/telegram`, accent: '#4D9EFF' },
      ],
    },
    {
      title: t('sectionSettings'),
      items: [
        { icon: '🔔', label: t('notifLabel'), sub: t('notifSub'), href: `/${locale}/app/profile/notifications`, accent: '#9B5FFF' },
        { icon: '🌙', label: t('themeLabel'), sub: t('themeSub'), href: `/${locale}/app/profile/theme`, accent: '#4D9EFF' },
        { icon: '🌍', label: t('langLabel'), sub: locale === 'ru' ? 'Русский' : 'English', href: `/${locale}/app/profile/language`, accent: '#00FFCC' },
      ],
    },
    {
      title: t('sectionPro'),
      items: [
        { icon: '🔑', label: t('byokLabel'), sub: t('byokSub'), href: `/${locale}/app/profile/byok`, accent: '#D4AF37' },
        { icon: '🔒', label: t('securityLabel'), sub: t('securitySub'), href: `/${locale}/app/profile/security`, accent: '#FF4D6D' },
      ],
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Profile header */}
      <div
        className="rounded-3xl p-5 space-y-4"
        style={{
          background: 'linear-gradient(135deg, rgba(155,95,255,0.08) 0%, rgba(11,18,41,0.6) 100%)',
          border: '1px solid rgba(155,95,255,0.15)',
        }}
      >
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(155,95,255,0.2))',
              border: '2px solid rgba(212,175,55,0.3)',
            }}
          >
            🧑‍💻
            <div
              className="absolute bottom-0 right-0 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: '#00FFCC' }}
            >
              <span className="text-[8px] text-black font-black">✓</span>
            </div>
          </div>

          <div className="flex-1">
            <h1 className="font-black text-lg text-white">
              {locale === 'ru' ? 'Авто Эксперт' : 'Car Expert'}
            </h1>
            <p className="text-[11px] text-white/40">expert@auto.io</p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{
                  background: 'rgba(0,255,204,0.12)',
                  border: '1px solid rgba(0,255,204,0.25)',
                  color: '#00FFCC',
                }}
              >
                ⚡ Pro
              </span>
              <CreditBadge credits={840} packs={8} />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: t('statVideos'), value: '12', color: '#9B5FFF' },
            { label: t('statFollowers'), value: '24K', color: '#D4AF37' },
            { label: t('statReach'), value: '180K', color: '#00FFCC' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center p-2 rounded-xl"
              style={{
                background: `${stat.color}08`,
                border: `1px solid ${stat.color}15`,
              }}
            >
              <div className="font-black text-sm" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-[8px] text-white/25 uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Settings sections */}
      {SETTINGS_SECTIONS.map((section) => (
        <div key={section.title} className="space-y-2">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25 ml-1">
            {section.title}
          </p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(11,18,41,0.5)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {section.items.map((item, i) => (
              <Link key={item.label} href={item.href}>
                <div
                  className="flex items-center gap-3 p-4 transition-all hover:bg-white/5 cursor-pointer"
                  style={{
                    borderBottom: i < section.items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : undefined,
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{
                      background: `${item.accent}12`,
                      border: `1px solid ${item.accent}20`,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white/80">{item.label}</p>
                    <p className="text-[10px] text-white/30 truncate">{item.sub}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* Logout */}
      <button
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all hover:scale-[1.01]"
        style={{
          background: 'rgba(255,77,109,0.08)',
          border: '1px solid rgba(255,77,109,0.2)',
          color: '#FF4D6D',
        }}
      >
        <LogOut className="w-4 h-4" />
        {commonT('logout')}
      </button>

      <p className="text-center text-[9px] text-white/15 uppercase tracking-[0.2em] pb-2">
        {t('version')}
      </p>
    </div>
  );
}
