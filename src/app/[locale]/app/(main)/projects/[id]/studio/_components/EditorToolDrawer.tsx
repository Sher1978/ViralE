'use client';

import React, { useState } from 'react';
import { 
  Music, Type, Mic, ClosedCaption, Sliders, Sparkles, X, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EditorToolDrawerProps {
  onToolSelect: (tool: string) => void;
  activeTool: string | null;
  onClose: () => void;
  children?: React.ReactNode;
}

const TOOLS = [
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'captions', label: 'Captions', icon: ClosedCaption },
  { id: 'filters', label: 'Filters', icon: Sliders },
  { id: 'broll', label: 'AI B-Roll', icon: Sparkles },
];

export const EditorToolDrawer: React.FC<EditorToolDrawerProps> = ({
  onToolSelect,
  activeTool,
  onClose,
  children
}) => {
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
                activeTool === 'text' ? 'h-[92%]' : 'h-[45%]'
              }`}
            >
              <div className="w-10 h-1.5 rounded-full bg-white/20 mx-auto mt-3 mb-2" />
              
              <div className="flex items-center justify-between px-6 py-2">
                <h3 className="text-sm font-black uppercase tracking-widest text-white/40">
                  {TOOLS.find(t => t.id === activeTool)?.label}
                </h3>
                <button 
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white"
                >
                    <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-8">
                {children}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <div className="h-20 bg-black border-t border-white/[0.06] px-4 flex items-center overflow-x-auto no-scrollbar gap-2">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => onToolSelect(tool.id)}
              className={`flex flex-col items-center justify-center min-w-[72px] h-16 rounded-2xl transition-all active:scale-90 ${
                isActive ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                    <motion.div 
                        layoutId="active-dot"
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" 
                    />
                )}
              </div>
              <span className="text-[10px] font-bold mt-2 tracking-tight">
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
