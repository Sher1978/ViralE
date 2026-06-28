'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { Activity, Cpu, Zap, Wand2, Share2, AlertTriangle, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

interface ContentMatrixProps {
  blocks: { id: string; label: string }[];
  scenarios: ('edutainment' | 'evergreen' | 'trends' | 'controversial' | 'detective' | 'napkin_explainer')[];
  selectionSources: Record<string, 'edutainment' | 'evergreen' | 'trends' | 'controversial' | 'detective' | 'napkin_explainer'>;
  allScenarios: any;
  scriptData: any;
  locale: string;
  t: (key: string) => string;
  onBlockSelect: (blockId: string, scenarioId: 'edutainment' | 'evergreen' | 'trends' | 'controversial' | 'detective' | 'napkin_explainer') => void;
  onBlockUpdate: (blockId: string, scenarioId: string, newContent: string) => void;
  onRefine: (instruction: string) => void;
  onAccept: () => void;
  onCopy: () => void;
  isSaving?: boolean;
  isGenerating?: boolean;
}

export function ContentMatrix({
  blocks,
  scenarios,
  selectionSources,
  allScenarios,
  scriptData,
  locale,
  t,
  onBlockSelect,
  onBlockUpdate,
  onAccept,
  onCopy,
  isSaving,
  isGenerating
}: ContentMatrixProps) {
  const [copied, setCopied] = React.useState(false);

  // Find initial selected scenario to focus the active card
  const currentSelectedScenario = selectionSources['hook'] || 'evergreen';
  const initialIndex = scenarios.indexOf(currentSelectedScenario);
  const [activeIndex, setActiveIndex] = React.useState(initialIndex >= 0 ? initialIndex : 0);

  // Sync activeIndex if selectionSources changes outside
  useEffect(() => {
    const current = selectionSources['hook'];
    if (current) {
      const idx = scenarios.indexOf(current);
      if (idx >= 0 && idx !== activeIndex) {
        setActiveIndex(idx);
      }
    }
  }, [selectionSources, scenarios]);

  const activeScenarioId = scenarios[activeIndex];

  const totalWords = Object.entries(selectionSources).reduce((acc, [blockId, scenarioId]) => {
    const content = allScenarios?.[scenarioId]?.[blockId] || scriptData[blockId] || '';
    const text = typeof content === 'string' ? content : (content as any)?.words || '';
    return acc + text.split(/\s+/).filter(Boolean).length;
  }, 0);
  const totalSeconds = Math.ceil(totalWords / 2.8);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrev = () => {
    setActiveIndex(prev => (prev > 0 ? prev - 1 : scenarios.length - 1));
  };

  const handleNext = () => {
    setActiveIndex(prev => (prev < scenarios.length - 1 ? prev + 1 : 0));
  };

  const incompleteBlocks = blocks.filter(block => {
    const content = allScenarios?.[selectionSources[block.id]]?.[block.id] || scriptData[block.id];
    const text = typeof content === 'string' ? content : (content as any)?.words || '';
    return !text || text.trim().length < 10;
  });

  return (
    <div className="relative pb-40">
      <AnimatePresence>
        {isGenerating && (
           <motion.div 
             initial={{ opacity: 0 }} 
             animate={{ opacity: 1 }} 
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-40 bg-black/20 backdrop-blur-md pointer-events-none flex items-center justify-center" 
           >
             <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent" />
             <div className="w-full h-[2px] bg-purple-500/20 absolute top-0 animate-scanner shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
           </motion.div>
        )}
      </AnimatePresence>

      {/* Narrative HUD - Reading Time Tracker & Validation */}
      <div className="px-6 mb-10 mt-6 space-y-4">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-[2rem] backdrop-blur-2xl border-2 transition-all duration-1000 flex items-center justify-between relative overflow-hidden ${
            incompleteBlocks.length > 0 
              ? 'border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-transparent to-amber-500/5 shadow-[0_0_50px_rgba(245,158,11,0.1)]' 
              : totalSeconds > 50 
                ? 'border-red-500/30 bg-gradient-to-r from-red-500/10 via-transparent to-red-500/5 shadow-[0_0_50px_rgba(239,68,68,0.1)]' 
                : 'border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/5 shadow-[0_0_50px_rgba(168,85,247,0.1)]'
          }`}
        >
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)]" />
          
          <div className="flex flex-col relative z-10">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
              <Cpu className="w-3 h-3 text-purple-400 animate-spin-slow" />
              {incompleteBlocks.length > 0 ? 'INTEGRITY AUDIT: ACTION REQUIRED' : 'NARRATIVE EFFICIENCY METRICS'}
            </span>
            
            {incompleteBlocks.length > 0 ? (
              <span className="text-2xl font-black text-amber-400 tracking-tight uppercase italic flex items-center gap-2">
                {incompleteBlocks.length} Segment(s) Incomplete
              </span>
            ) : (
              <div className="flex items-baseline gap-3">
                <span className={`text-4xl font-black tabular-nums tracking-tighter italic ${totalSeconds > 50 ? 'text-red-400' : 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300'}`}>
                  {totalSeconds}s
                </span>
                <span className="text-xs font-black opacity-30 text-white tracking-widest uppercase">/ TARGET &lt; 50s</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-center gap-2 relative z-10">
             <motion.div 
               animate={incompleteBlocks.length > 0 || totalSeconds > 50 ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] } : {}}
               transition={{ repeat: Infinity, duration: 2 }}
               className={`w-14 h-14 rounded-3xl flex items-center justify-center border transition-all duration-500 ${
                 incompleteBlocks.length > 0 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]' :
                 totalSeconds > 50 ? 'bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 
                 'bg-purple-500/20 text-purple-400 border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
               }`}
             >
               {incompleteBlocks.length > 0 ? (
                 <AlertTriangle className="w-6 h-6" />
               ) : (
                 <Zap className="w-6 h-6 fill-current" />
               )}
             </motion.div>
             <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40">
               {incompleteBlocks.length > 0 ? 'FIX REQUIRED' : 'LAUNCH READY'}
             </span>
          </div>
        </motion.div>

        {incompleteBlocks.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 backdrop-blur-md flex items-center gap-3"
          >
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-[10px] text-amber-400/80 font-medium leading-relaxed tracking-wide">
              <span className="font-black uppercase tracking-[0.15em] mr-2 text-amber-400">Core Warning:</span>
              The script payload detected null vectors. Fill the tracks manually or trigger the AI generator to assemble matching story blocks.
            </p>
          </motion.div>
        )}
      </div>

      {/* 3D Card Carousel Slider */}
      <div className="relative flex flex-col items-center select-none px-6">
        
        {/* Navigation Wrapper */}
        <div className="relative w-full flex items-center justify-center h-[500px] overflow-hidden">
          
          {/* Left Arrow */}
          <button
            onClick={handlePrev}
            className="absolute left-0 z-30 p-3 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 active:scale-95 transition-all shadow-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Cards Stack */}
          <div className="relative w-full max-w-[340px] h-[450px] flex items-center justify-center">
            {scenarios.map((scenarioId, i) => {
              const config = {
                evergreen: { color: '#10B981', label: locale === 'ru' ? 'Вечнозеленый' : 'Evergreen' },
                trends: { color: '#F59E0B', label: locale === 'ru' ? 'Тренды' : 'Trends' },
                edutainment: { color: '#3B82F6', label: locale === 'ru' ? 'Польза' : 'Edutainment' },
                controversial: { color: '#EF4444', label: locale === 'ru' ? 'Провокация' : 'Controversial' },
                detective: { color: '#06B6D4', label: locale === 'ru' ? 'Детектив' : 'Detective' },
                napkin_explainer: { color: '#A855F7', label: locale === 'ru' ? 'Маркер и доска' : 'Marker & Board' }
              }[scenarioId] || { color: '#A855F7', label: 'Scenario' };

              const offset = i - activeIndex;
              const absOffset = Math.abs(offset);
              
              if (absOffset > 2) return null;

              const isSelected = blocks.every(b => selectionSources[b.id] === scenarioId);

              return (
                <motion.div
                  key={scenarioId}
                  style={{
                    zIndex: 10 - absOffset,
                    pointerEvents: offset === 0 ? 'auto' : 'none',
                    boxShadow: offset === 0 
                      ? `0 0 35px ${config.color}25, 0 20px 50px rgba(0,0,0,0.6)` 
                      : 'none'
                  }}
                  animate={{
                    x: offset * 290,
                    scale: offset === 0 ? 1 : 0.84 - absOffset * 0.04,
                    rotateY: offset * -18,
                    opacity: offset === 0 ? 1 : 0.35,
                    z: -absOffset * 100
                  }}
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  onClick={() => setActiveIndex(i)}
                  className={`absolute w-full h-full rounded-[2.5rem] border backdrop-blur-2xl overflow-hidden flex flex-col transition-all duration-300 ${
                    offset === 0 
                      ? 'border-purple-500/40 bg-[#0d0d16]/95' 
                      : 'border-white/5 bg-white/[0.01]'
                  }`}
                >
                  {/* Card Header */}
                  <div className="px-6 py-4 flex items-center justify-between border-b border-white/[0.03] bg-black/25">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-2 h-2 rounded-full shadow-[0_0_10px_currentcolor] animate-pulse" 
                        style={{ backgroundColor: config.color, color: config.color }} 
                      />
                      <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white">
                        {config.label}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Selected</span>
                      </div>
                    )}
                  </div>

                  {/* Card Body - Scrollable Editable Blocks */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar select-text bg-black/10">
                    {blocks.map((block) => {
                      const content = allScenarios?.[scenarioId]?.[block.id] || scriptData[block.id] || '';
                      const text = typeof content === 'string' ? content : (content as any)?.words || '';
                      return (
                        <div key={block.id} className="space-y-1.5">
                          <span className="text-[8px] font-black uppercase text-purple-400/50 tracking-widest block ml-1">
                            {block.label}
                          </span>
                          <textarea
                            value={text}
                            onChange={(e) => onBlockUpdate(block.id, scenarioId, (e.target as any).value)}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-3 text-xs leading-relaxed text-white/90 font-medium focus:outline-none focus:border-purple-500/35 focus:bg-white/[0.04] transition-all resize-none h-24 no-scrollbar placeholder:text-white/10 italic"
                            placeholder={`[Empty ${block.label} block...]`}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Scanner overlay */}
                  {offset === 0 && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2.5rem]">
                      <div className="w-[200%] h-[2px] bg-gradient-to-r from-transparent via-purple-500/20 to-transparent absolute top-0 left-[-50%] animate-scanner" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Right Arrow */}
          <button
            onClick={handleNext}
            className="absolute right-0 z-30 p-3 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 active:scale-95 transition-all shadow-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Carousel Indicator Dots */}
        <div className="flex gap-2.5 mt-2 mb-8">
          {scenarios.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === activeIndex ? 'w-6 bg-purple-500' : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>

        {/* Choose Plot Button */}
        <div className="w-full max-w-[340px] px-2">
          {(() => {
            const isSelected = blocks.every(b => selectionSources[b.id] === activeScenarioId);
            return (
              <button
                onClick={() => {
                  blocks.forEach(b => onBlockSelect(b.id, activeScenarioId));
                }}
                className={`w-full py-4.5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.25em] transition-all duration-300 flex items-center justify-center gap-2 border ${
                  isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-purple-500/30 text-white shadow-[0_0_25px_rgba(168,85,247,0.3)] hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {isSelected ? (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    {locale === 'ru' ? '✓ Сюжет Выбран' : '✓ Plot Selected'}
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-current text-yellow-300" />
                    {locale === 'ru' ? 'Выбрать этот сюжет' : 'Choose this plot'}
                  </>
                )}
              </button>
            );
          })()}
        </div>
      </div>

      {/* Final Synthesis Terminal */}
      <div className="mt-16 flex items-center gap-4 px-6">
        <button 
          onClick={handleCopy}
          className="p-6 bg-white/5 border border-white/10 rounded-[2rem] text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95 group"
          title="Copy Matrix Selection"
        >
          {copied ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <Activity className="w-5 h-5 text-emerald-400" />
            </motion.div>
          ) : (
            <Share2 className="w-5 h-5" />
          )}
        </button>

        <button 
          onClick={onAccept}
          disabled={isSaving || !allScenarios}
          className="flex-1 py-6 bg-white text-black font-black uppercase tracking-[0.3em] text-xs rounded-[2rem] flex items-center justify-center gap-4 shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isSaving ? 'Synchronizing Workspace...' : 'Accept Narrative Matrix'}
          <Wand2 className="w-4 h-4 fill-black" />
        </button>
      </div>
    </div>
  );
}
