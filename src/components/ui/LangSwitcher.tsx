'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { supabase } from '@/lib/supabase';

export function LangSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const toggleLocale = () => {
    const nextLocale = locale === 'ru' ? 'en' : 'ru';
    
    // Add dynamic bilingual confirmation dialog
    const globalObj = typeof globalThis !== 'undefined' ? (globalThis as any) : null;
    const confirmMsg = locale === 'ru'
      ? 'Вы действительно хотите переключить язык интерфейса?'
      : 'Are you sure you want to switch the interface language?';
      
    if (globalObj && globalObj.window && !globalObj.window.confirm(confirmMsg)) {
      return; // Cancel transition if user clicked Cancel (No)
    }

    // Persist the selection in cookie (which next-intl middleware reads) and localStorage
    if (globalObj && typeof globalObj.document !== 'undefined') {
      globalObj.document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    }
    if (globalObj && typeof globalObj.window !== 'undefined') {
      globalObj.window.localStorage.setItem('NEXT_LOCALE', nextLocale);
    }

    // Persist to Supabase if logged in
    supabase.auth.getUser().then((res: any) => {
      const user = res?.data?.user;
      if (user) {
        supabase.from('profiles').update({ preferred_language: nextLocale }).eq('id', user.id).then();
      }
    });

    // Mathematically correct path switcher for next-intl's 'as-needed' localePrefix mode
    let newPath = pathname;
    if (nextLocale === 'ru') {
      if (!pathname.startsWith('/ru')) {
        // Prepend /ru (e.g. /app/ideas -> /ru/app/ideas)
        newPath = `/ru${pathname}`;
      }
    } else {
      if (pathname.startsWith('/ru')) {
        // Remove /ru prefix (e.g. /ru/app/ideas -> /app/ideas)
        newPath = pathname.replace(/^\/ru/, '') || '/';
      }
    }

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
