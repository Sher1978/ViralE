'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';

export function LangSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const toggleLocale = () => {
    const nextLocale = locale === 'ru' ? 'en' : 'ru';
    // Replace current locale prefix in the pathname
    const newPath = pathname.replace(`/${locale}`, `/${nextLocale}`);
    startTransition(() => {
      router.push(newPath);
    });
  };

  return (
    <button
      onClick={toggleLocale}
      disabled={isPending}
      className="flex items-center gap-1 rounded-full px-2.5 py-1 transition-all hover:scale-105 active:scale-95"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        opacity: isPending ? 0.5 : 1,
      }}
      title="Switch language"
    >
      <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: locale === 'ru' ? '#D4AF37' : 'rgba(255,255,255,0.3)' }}>
        RU
      </span>
      <span className="text-[9px] text-white/20">/</span>
      <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: locale === 'en' ? '#00FFCC' : 'rgba(255,255,255,0.3)' }}>
        EN
      </span>
    </button>
  );
}
