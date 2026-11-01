'use client';

import React from 'react';
import { 
  Type, ClosedCaption, Sliders, Sparkles, X, Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppData } from '@/components/providers/AppDataProvider';

interface EditorToolDrawerProps {
  onToolSelect: (tool: string) => void;
  activeTool: string | null;
  onClose: () => void;
  children?: React.ReactNode;
}

const CORE_TOOLS = [
  { id: 'captions', label: 'Субтитры CC', icon: ClosedCaption },
  { id: 'broll', label: 'B-Roll Вставки', icon: Sparkles },
  { id: 'filters', label: 'Скорость', icon: Sliders },
  { id: 'text', label: 'Текст слов', icon: Type },
];

const LAB_TOOLS = [
  { id: 'whiteboard', label: 'Скетчи 🧪', icon: Pencil },
];

export const EditorToolDrawer: React.FC<EditorToolDrawerProps> = ({
  onToolSelect,
  activeTool,
  onClose,
  children
}) => {
  let hasLabAccess = false;
  try {
    const appData = useAppData();
    hasLabAccess = appData.hasLabAccess;
  } catch (e) {}

  const tools = hasLabAccess ? [...CORE_TOOLS, ...LAB_TOOLS] : CORE_TOOLS;

  return (
    <div className="flex flex-col bg-black flex-shrink-0 z-50">
      {/* Slide-up Sheet */}
      <AnimatePresence>
        {activeTool && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60]"
            />
            
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed bottom-0 inset-x-0 bg-[#111] rounded-t-[32px] z-[70] shadow-2xl flex flex-col border-t border-white/5 ${
                activeTool === 'text' ? 'h-[92%]' : 'h-[48%]'
              }`}
            >
              <div className="w-10 h-1.5 rounded-full bg-white/20 mx-auto mt-3 mb-2" />
              
              <div className="flex items-center justify-between px-6 py-2">
                <h3 className="text-sm font-black uppercase tracking-widest text-white/40">
                  {tools.find(t => t.id === activeTool)?.label}
                </h3>
                <button 
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white"
                >
                    <X size={18} />
                </button>
              </div>

              <div className={
                activeTool === 'captions' || activeTool === 'text'
                  ? "flex-1 flex flex-col min-h-0 overflow-hidden"
                  : "flex-1 overflow-y-auto px-4 pb-8"
              }>
                {children}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <div className="h-20 bg-black border-t border-white/[0.06] px-4 flex items-center justify-around sm:justify-center overflow-x-auto no-scrollbar gap-2 sm:gap-6">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => onToolSelect(tool.id)}
              className={`flex flex-col items-center justify-center min-w-[76px] px-2 h-16 rounded-2xl transition-all active:scale-90 ${
                isActive ? 'bg-purple-600/20 border border-purple-500/30 text-white' : 'text-white/50 hover:text-white/80'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-purple-400' : ''} />
                {isActive && (
                    <motion.div 
                        layoutId="active-dot"
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-400" 
                    />
                )}
              </div>
              <span className="text-[10px] font-bold mt-2 tracking-tight whitespace-nowrap">
                {tool.label}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Safe Area Spacer for iOS */}
      <div className="h-[env(safe-area-inset-bottom)] bg-black" />
    </div>
  );
};
