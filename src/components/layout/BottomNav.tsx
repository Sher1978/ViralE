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
    { key: 'home', href: `/${locale}/app/ideas`, icon: Lightbulb }, // Ideas/Discover
    { key: 'studio', href: `/${locale}/app/projects`, icon: Sparkles },
    { key: 'library', href: `/${locale}/app/archive`, icon: Library },
    { key: 'profile', href: `/${locale}/app/profile`, icon: User },
  ];

  const getActiveColor = (key: string) => {
    switch (key) {
      case 'home': return '#10b981'; // Emerald
      case 'studio': return '#a855f7'; // Purple
      case 'library': return '#06b6d4'; // Cyan
      case 'profile': return '#facc15'; // Amber
      default: return '#ffffff';
    }
  };

  const hideNav = pathname.includes('/auth') || pathname.includes('/onboarding');

  if (hideNav) return null;

  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-[440px] z-50">
      <div
        className="relative rounded-[2rem] p-1.5"
        style={{
          background: 'rgba(10, 10, 16, 0.85)',
          backdropFilter: 'blur(32px) saturate(200%)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)',
        }}
      >
        <ul className="flex items-center justify-between px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            const activeColor = getActiveColor(item.key);

            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 py-3 transition-all duration-300 relative",
                    isActive ? "" : "text-white/20 hover:text-white/50"
                  )}
                  style={{ color: isActive ? activeColor : undefined }}
                >
                  <div className="relative flex flex-col items-center gap-1">
                    <Icon 
                      className="w-6 h-6 transition-all duration-500" 
                      strokeWidth={isActive ? 2.5 : 2}
                      style={{
                        filter: isActive ? `drop-shadow(0 0 8px ${activeColor})` : 'none'
                      }}
                    />
                    <span
                      className={cn(
                        "text-[7px] font-black tracking-[0.2em] uppercase text-center transition-all duration-500",
                        isActive ? "opacity-100" : "opacity-40"
                      )}
                      style={{
                         textShadow: isActive ? `0 0 10px ${activeColor}80` : 'none'
                      }}
                    >
                      {t(item.key as any)}
                    </span>
                    
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute -bottom-2 w-1 h-1 rounded-full"
                        style={{ backgroundColor: activeColor, boxShadow: `0 0 10px ${activeColor}` }}
                      />
                    )}
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
