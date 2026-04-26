'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Lightbulb, FolderKanban, User, CreditCard, Archive, Monitor, Sparkles, Library } from 'lucide-react';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function BottomNav() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('nav');

  const navItems = [
    { key: 'home', href: `/${locale}/app/dashboard`, icon: LayoutDashboard }, 
    { key: 'studio', href: `/${locale}/app/projects`, icon: Sparkles, isCentral: true },
    { key: 'library', href: `/${locale}/app/archive`, icon: Library },
    { key: 'profile', href: `/${locale}/app/profile`, icon: User },
  ];

  const hideNav = pathname.includes('/auth') || pathname.includes('/onboarding');

  if (hideNav) return null;

  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-[440px] z-50">
      {/* Glow backdrop */}
      <div className="absolute inset-x-4 -inset-y-2 rounded-[2.5rem] blur-2xl opacity-20 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, #00FFCC, #4D9EFF)' }}
      />

      <div
        className="relative rounded-[2rem] p-1.5"
        style={{
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(8, 12, 28, 0.95) 100%)',
          backdropFilter: 'blur(32px) saturate(200%)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.05)',
        }}
      >
        <ul className="flex items-center justify-between px-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 py-3 rounded-2xl transition-all duration-300 relative mx-0.5",
                    isActive
                      ? "text-black"
                      : "text-white/40 hover:text-white/70"
                  )}
                >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 rounded-2xl z-0"
                        style={{
                          background: item.key === 'studio' 
                            ? 'linear-gradient(135deg, #A855F7, #D8B4FE)' 
                            : item.key === 'profile'
                            ? 'linear-gradient(135deg, #FACC15, #FDE047)'
                            : 'linear-gradient(135deg, #06B6D4, #22D3EE)',
                          boxShadow: `0 4px 15px ${
                            item.key === 'studio' ? 'rgba(168,85,247,0.4)' : 
                            item.key === 'profile' ? 'rgba(234,179,8,0.4)' : 
                            'rgba(6,182,212,0.4)'
                          }`,
                        }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  <div className="relative z-10 flex flex-col items-center gap-0.5">
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                    <span
                      className={cn(
                        "text-[8px] font-black tracking-widest uppercase text-center",
                        isActive ? "text-black" : "text-white/30"
                      )}
                    >
                      {t(item.key as any)}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}

        </ul>
      </div>
    </nav>
  );
}
