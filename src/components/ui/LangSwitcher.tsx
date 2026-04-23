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
      className="flex items-center gap-1 rounded-full px-2 py-1.5 transition-all hover:bg-white/10 active:scale-95 group/lang shrink-0"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        opacity: isPending ? 0.5 : 1,
      }}
      title="Switch language"
    >
      <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${locale === 'ru' ? 'text-purple-400' : 'text-white/20 group-hover/lang:text-white/40'}`}>
        RU
      </span>
      <div className="w-[1px] h-2 bg-white/10" />
      <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${locale === 'en' ? 'text-emerald-400' : 'text-white/20 group-hover/lang:text-white/40'}`}>
        EN
      </span>
    </button>
  );
}
