'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, RefreshCw, Check, ArrowRight, Layers, 
  Sparkles, ChevronUp, ChevronDown, Wand2, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContentBlock {
  type: 'hook' | 'context' | 'meat' | 'cta';
  text: string;
  visual: string;
}

interface ScriptStyle {
  id: string;
  name: string;
  blocks: ContentBlock[];
}

interface ScriptMatrix {
  topic: string;
  styles: ScriptStyle[];
}

interface ScriptRotorProps {
  matrix: ScriptMatrix;
  onApply: (finalScript: string) => void;
  onClose: () => void;
}

export function ScriptRotor({ matrix, onApply, onClose }: ScriptRotorProps) {
  // Indices for each of the 4 columns
  const [selections, setSelections] = useState([0, 0, 0, 0]); // Indices for Hook, Context, Meat, CTA
  const [isAssembling, setIsAssembling] = useState(false);

  const blockTypes = ['hook', 'context', 'meat', 'cta'];
  const blockLabels = ['HOOK (0-5s)', 'CONTEXT (5-15s)', 'VALUE (15-45s)', 'CTA (45-60s)'];

  // Rotate a specific column
  const rotate = (colIdx: number, direction: 'up' | 'down') => {
    setSelections(prev => {
      const next = [...prev];
      if (direction === 'up') {
        next[colIdx] = (next[colIdx] + 1) % 5;
      } else {
        next[colIdx] = (next[colIdx] - 1 + 5) % 5;
      }
      return next;
    });
  };

  const currentCombination = useMemo(() => {
    return selections.map((styleIdx, colIdx) => {
      return matrix.styles[styleIdx].blocks[colIdx];
    });
  }, [selections, matrix]);

  const handleAssemble = async () => {
    setIsAssembling(true);
    // Add a slight delay for dramatic effect
    await new Promise(r => setTimeout(r, 800));
    
    const finalScript = currentCombination.map(b => b.text).join('\n\n');
    onApply(finalScript);
    setIsAssembling(false);
  };

  const randomize = () => {
    setSelections(selections.map(() => Math.floor(Math.random() * 5)));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 z-50 bg-[#05050a]/95 backdrop-blur-2xl flex flex-col p-6 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="text-purple-500 w-5 h-5" />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Content Lego Rotor</h2>
          </div>
          <p className="text-[11px] text-white/40 max-w-md">
            Topic: <span className="text-purple-400 font-bold">"{matrix.topic}"</span> • Mix blocks from 5 viral styles to build your custom narrative.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={randomize}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-95"
          >
            <RefreshCw size={14} /> Mix & Match
          </button>
          <button onClick={onClose} className="p-2 text-white/20 hover:text-white transition-colors">
            <Layers className="rotate-45" />
          </button>
        </div>
      </div>

      {/* The Rotor Matrix */}
      <div className="flex-1 grid grid-cols-4 gap-4 min-h-0 overflow-hidden">
        {blockTypes.map((type, colIdx) => (
          <div key={type} className="flex flex-col h-full bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden group">
            <div className="p-4 border-b border-white/5 bg-black/40 flex items-center justify-between">
              <span className="text-[9px] font-black tracking-widest text-white/30 uppercase">{blockLabels[colIdx]}</span>
              <div className="flex gap-1">
                <button onClick={() => rotate(colIdx, 'up')} className="p-1 hover:bg-white/10 rounded"><ChevronUp size={12} /></button>
                <button onClick={() => rotate(colIdx, 'down')} className="p-1 hover:bg-white/10 rounded"><ChevronDown size={12} /></button>
              </div>
            </div>

            <div className="flex-1 relative overflow-hidden flex flex-col justify-center items-center">
               <AnimatePresence mode="wait">
                 <motion.div
                   key={`${colIdx}-${selections[colIdx]}`}
                   initial={{ y: 20, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   exit={{ y: -20, opacity: 0 }}
                   className="absolute inset-0 p-5 flex flex-col pt-8"
                 >
                   <div className="mb-4">
                     <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-[8px] font-black uppercase text-purple-400 tracking-tighter">
                       Style: {matrix.styles[selections[colIdx]].name}
                     </span>
                   </div>
                   
                   <p className="text-[13px] leading-relaxed text-white/90 font-medium mb-6">
                     {matrix.styles[selections[colIdx]].blocks[colIdx].text}
                   </p>

                   <div className="mt-auto p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={10} className="text-purple-400" />
                        <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Visual Direction</span>
                      </div>
                      <p className="text-[10px] text-white/50 leading-snug italic">
                        {matrix.styles[selections[colIdx]].blocks[colIdx].visual}
                      </p>
                   </div>
                 </motion.div>
               </AnimatePresence>
            </div>
            
            {/* Selection indicators */}
            <div className="p-3 flex justify-center gap-1.5 bg-black/40">
              {[0,1,2,3,4].map(idx => (
                <div 
                  key={idx} 
                  className={cn(
                    "w-1 h-1 rounded-full transition-all",
                    selections[colIdx] === idx ? "w-4 bg-purple-500" : "bg-white/10"
                  )} 
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Action Bar */}
      <div className="mt-8 flex items-center justify-between p-6 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-3xl">
        <div className="flex items-center gap-6">
          <div className="flex -space-x-3">
            {selections.map((val, i) => (
              <div key={i} className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-[10px] font-bold text-purple-400 shadow-xl">
                {matrix.styles[val].name.charAt(0)}
              </div>
            ))}
          </div>
          <div>
            <h4 className="text-[12px] font-black text-white uppercase tracking-wider">Ready to Assemble</h4>
            <p className="text-[10px] text-white/40">Custom hybrid script calculated from {matrix.styles.length} styles.</p>
          </div>
        </div>

        <button
          onClick={handleAssemble}
          disabled={isAssembling}
          className="relative px-8 py-4 bg-purple-600 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] text-white shadow-[0_0_40px_rgba(168,85,247,0.4)] hover:bg-purple-500 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isAssembling ? (
            <div className="flex items-center gap-3">
              <Wand2 className="animate-spin" size={16} /> <span>Forging Matrix...</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span>Push to Studio</span> <ArrowRight size={16} />
            </div>
          )}
        </button>
      </div>

      {/* Guidance */}
      <div className="mt-4 flex items-center justify-center gap-2 text-[9px] text-white/20 uppercase tracking-widest font-medium">
        <Info size={10} />
        Use Up/Down arrows to rotate blocks • Each block is interchangeable by design
      </div>
    </motion.div>
  );
}
