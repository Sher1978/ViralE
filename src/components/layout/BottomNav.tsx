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

  const hideNav = pathname.includes('/auth') || 
                   pathname.includes('/onboarding') || 
                   pathname.includes('/studio') || 
                   pathname.includes('/dna');

  if (hideNav) return null;

  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-[440px] z-50">
      <div
        className="relative rounded-[2.5rem] p-1.5"
        style={{
          background: 'rgba(5, 5, 10, 0.9)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 50px -15px rgba(0,0,0,0.8)',
        }}
      >
        <ul className="flex items-center justify-between px-3">
          {navItems.map((item) => {
            // Robust matching: strip locale from pathname or compare both versions
            const isActive = pathname === item.href || 
                             pathname.startsWith(item.href + '/') ||
                             pathname.replace(`/${locale}`, '') === item.href.replace(`/${locale}`, '');
            
            const Icon = item.icon;
            const activeColor = getActiveColor(item.key);

            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 transition-all duration-500 relative",
                    isActive ? "scale-110" : "text-white/20 hover:text-white/40"
                  )}
                  style={{ color: isActive ? activeColor : undefined }}
                >
                  <div className="relative flex flex-col items-center">
                    <Icon 
                      className="w-7 h-7 transition-all duration-500" 
                      strokeWidth={isActive ? 2.5 : 2}
                      style={{
                        filter: isActive ? `
                          drop-shadow(0 0 8px ${activeColor}) 
                          drop-shadow(0 0 2px ${activeColor})
                          drop-shadow(0 0 1px ${activeColor})
                        ` : 'none',
                        color: isActive ? activeColor : 'currentColor'
                      }}
                    />
                    <AnimatePresence>
                      {isActive && (
                        <motion.span
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="text-[7px] font-black tracking-[0.2em] uppercase text-center mt-2.5"
                          style={{
                             color: activeColor,
                             textShadow: `0 0 6px ${activeColor}`
                          }}
                        >
                          {t(item.key as any)}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute -top-1 w-1 h-1 rounded-full"
                        style={{ 
                          backgroundColor: activeColor, 
                          boxShadow: `0 0 8px 1px ${activeColor}`,
                          filter: `blur(0.5px)`
                        }}
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
