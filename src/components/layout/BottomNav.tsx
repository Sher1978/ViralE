'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Sparkles, Library, User } from 'lucide-react';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function BottomNav() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('nav');

  const navItems = [
    { key: 'home', href: '/app/ideas', icon: Lightbulb },
    { key: 'studio', href: '/app/projects', icon: Sparkles },
    { key: 'library', href: '/app/archive', icon: Library },
    { key: 'profile', href: '/app/profile', icon: User },
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
                   pathname.includes('/studio');

  if (hideNav) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 w-full z-50 bg-[#080811]/95 backdrop-blur-2xl border-t border-white/10 pb-[max(0.5rem,calc(env(safe-area-inset-bottom,0px)+0.25rem))] shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
      <div className="max-w-md mx-auto px-4 py-2">
        <ul className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
                             pathname.startsWith(item.href + '/');
            
            const Icon = item.icon;
            const activeColor = getActiveColor(item.key);

            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  prefetch={true}
                  className={cn(
                    "flex flex-col items-center justify-center py-1.5 transition-all duration-150 relative select-none touch-manipulation group",
                    isActive ? "text-white" : "text-white/30 hover:text-white/60"
                  )}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  {/* Top active indicator line */}
                  {isActive && (
                    <div
                      className="absolute -top-2 h-[2.5px] w-8 rounded-full shadow-lg transition-all duration-200"
                      style={{ 
                        backgroundColor: activeColor,
                        boxShadow: `0 0 10px ${activeColor}` 
                      }}
                    />
                  )}

                  <div className="relative flex flex-col items-center pt-1">
                    <Icon 
                      className="w-5 h-5 transition-transform duration-150 group-active:scale-90" 
                      strokeWidth={isActive ? 2.5 : 1.8}
                      style={{
                        color: isActive ? activeColor : 'currentColor',
                        filter: isActive ? `drop-shadow(0 0 8px ${activeColor}80)` : 'none'
                      }}
                    />
                    
                    <span 
                      className="text-[9px] font-bold uppercase tracking-wider mt-1 transition-colors"
                      style={{ 
                        color: isActive ? activeColor : undefined,
                        opacity: isActive ? 1 : 0.6
                      }}
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
