'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { LayoutDashboard, Lightbulb, FolderKanban, User, CreditCard, Archive } from 'lucide-react';
import { LangSwitcher } from '@/components/ui/LangSwitcher';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function BottomNav() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('nav');

  const navItems = [
    { key: 'dash', href: `/${locale}/app/dashboard`, icon: LayoutDashboard },
    { key: 'ideas', href: `/${locale}/app/ideas`, icon: Lightbulb },
    { key: 'projects', href: `/${locale}/app/projects`, icon: FolderKanban },
    { key: 'archive', href: `/${locale}/app/archive`, icon: Archive },
    { key: 'billing', href: `/${locale}/app/billing`, icon: CreditCard },
    { key: 'profile', href: `/${locale}/app/profile`, icon: User },
  ];

  const hideNav = [
    `/${locale}`,
    `/${locale}/auth`,
    `/${locale}/app/onboarding`,
  ].some(p => pathname === p || pathname.startsWith(`/${locale}/app/onboarding`));

  if (hideNav) return null;

  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[88%] max-w-[420px] z-50">
      {/* Glow backdrop */}
      <div className="absolute inset-0 rounded-3xl blur-xl opacity-30"
        style={{ background: 'linear-gradient(90deg, rgba(212,175,55,0.3), rgba(0,255,204,0.3))' }}
      />

      <div
        className="relative rounded-3xl p-2"
        style={{
          background: 'rgba(8, 12, 28, 0.85)',
          backdropFilter: 'blur(32px) saturate(200%)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        <ul className="flex justify-around items-center">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl transition-all duration-300 relative",
                    isActive
                      ? "text-black"
                      : "text-white/40 hover:text-white/70"
                  )}
                >
                  {isActive && (
                    <div
                      className="absolute inset-0 rounded-2xl"
                      style={{
                        background: 'linear-gradient(135deg, #00FFCC, #4DFFD4)',
                        boxShadow: '0 0 20px rgba(0,255,204,0.4)',
                      }}
                    />
                  )}
                  <div className="relative z-10">
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.75} />
                  </div>
                  <span
                    className={cn(
                      "relative z-10 text-[9px] font-bold tracking-widest uppercase",
                      isActive ? "text-black" : "text-white/30"
                    )}
                  >
                    {t(item.key as 'dash' | 'ideas' | 'projects' | 'billing' | 'profile' | 'archive')}
                  </span>
                </Link>
              </li>
            );
          })}

          {/* Language switcher on the far right of nav */}
          <li className="pl-1">
            <LangSwitcher />
          </li>
        </ul>
      </div>
    </nav>
  );
}
