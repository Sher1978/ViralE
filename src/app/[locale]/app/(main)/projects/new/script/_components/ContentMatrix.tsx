'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Cpu, Zap, Wand2, Share2, AlertTriangle, Info } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

interface ScenarioCardProps {
  blockId: string;
  scenarioId: 'evergreen' | 'trend' | 'educational' | 'controversial' | 'storytelling';
  content: string;
  isSelected: boolean;
  t: (key: string) => string;
  onSelect: (blockId: string, scenarioId: 'evergreen' | 'trend' | 'educational' | 'controversial' | 'storytelling') => void;
  onUpdate: (blockId: string, scenarioId: string, newContent: string) => void;
  index: number;
}

function ScenarioCard({
  blockId,
  scenarioId,
  content,
  isSelected,
  t,
  onSelect,
  onUpdate
}: ScenarioCardProps) {
  const { ref, inView } = useInView({
    threshold: 0.6,
    rootMargin: '0px -25% 0px -25%',
  });

  useEffect(() => {
    if (inView && !isSelected) {
      onSelect(blockId, scenarioId);
    }
  }, [inView, isSelected, onSelect, blockId, scenarioId]);

  const config = {
    evergreen: { color: '#10B981', label: 'Evergreen' },
    trend: { color: '#F59E0B', label: 'Trend' },
    educational: { color: '#3B82F6', label: 'Edu' },
    controversial: { color: '#EF4444', label: 'Contro' },
    storytelling: { color: '#06B6D4', label: 'Story' }
  }[scenarioId];

  const displayContent = typeof content === 'string' ? content : (content as any)?.words || '';

  return (
    <motion.div
      ref={ref}
      animate={{ 
        scale: isSelected ? 1.02 : 0.92,
        opacity: isSelected ? 1 : 0.4,
        y: isSelected ? 0 : 10,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`flex-none w-[85vw] sm:w-[360px] snap-center rounded-[2.5rem] border transition-all duration-500 overflow-hidden relative backdrop-blur-xl group ${
        isSelected 
          ? 'border-purple-500/40 bg-gradient-to-b from-purple-500/10 to-black/80 shadow-[0_20px_50px_rgba(168,85,247,0.25)]' 
          : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10'
      }`}
      style={{ 
        boxShadow: isSelected 
          ? `0 0 35px ${config.color}30, 0 20px 50px rgba(0,0,0,0.5)` 
          : 'none' 
      }}
    >
      {/* Decorative Card Aura */}
      {isSelected && (
        <div 
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[80px] opacity-40 pointer-events-none"
          style={{ backgroundColor: config.color }}
        />
      )}

      <div className="px-6 py-4 flex items-center justify-between border-b border-white/[0.03] relative z-10 bg-black/20">
        <div className="flex items-center gap-3">
          <div 
            className="w-2 h-2 rounded-full shadow-[0_0_10px_currentcolor] animate-pulse" 
            style={{ backgroundColor: config.color, color: config.color }} 
          />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60">
            {config.label}
          </span>
        </div>
        {isSelected && (
          <div className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-purple-400 animate-spin-slow" />
            <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest">Selected</span>
          </div>
        )}
      </div>

      <div className="p-6 relative z-10 flex flex-col min-h-[240px]">
        <textarea
          value={displayContent}
          onChange={(e) => onUpdate(blockId, scenarioId, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="w-full bg-transparent text-sm sm:text-[15px] leading-relaxed text-white/90 font-medium focus:outline-none focus:ring-0 border-none p-0 transition-all resize-none flex-1 no-scrollbar placeholder:text-white/10 italic"
          placeholder="[Empty Node... Edit required]"
        />
        
        {/* Visual Prompts Panel */}
        {(content as any)?.visual && (
          <div className={`mt-4 p-4 rounded-2xl border backdrop-blur-sm transition-all duration-500 ${
            isSelected 
              ? 'bg-purple-950/20 border-purple-500/20' 
              : 'bg-black/40 border-white/5 group-hover:border-white/10'
          }`}>
             <p className="text-[9px] font-black uppercase text-purple-400/80 mb-1.5 tracking-[0.15em] flex items-center gap-1">
               <Wand2 className="w-3 h-3" />
               Visual Prompt Reference
             </p>
             <p className="text-[11px] text-white/50 leading-relaxed italic tracking-wide">
               {(content as any).visual}
             </p>
          </div>
        )}
      </div>

      {/* Background scanner beam effect for selected */}
      {isSelected && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2.5rem]">
          <div className="w-[200%] h-1 bg-gradient-to-r from-transparent via-purple-400/20 to-transparent absolute top-0 left-[-50%] animate-scanner" />
        </div>
      )}
    </motion.div>

  );
}

interface ContentMatrixProps {
  blocks: { id: string; label: string }[];
  scenarios: ('evergreen' | 'trend' | 'educational' | 'controversial' | 'storytelling')[];
  selectionSources: Record<string, 'evergreen' | 'trend' | 'educational' | 'controversial' | 'storytelling'>;
  allScenarios: any;
  scriptData: any;
  locale: string;
  t: (key: string) => string;
  onBlockSelect: (blockId: string, scenarioId: 'evergreen' | 'trend' | 'educational' | 'controversial' | 'storytelling') => void;
  onBlockUpdate: (blockId: string, scenarioId: string, newContent: string) => void;
  onRefine: (instruction: string) => void;
  onAccept: () => void;
  onCopy: () => void;
  isSaving?: boolean;
}

export function ContentMatrix({
  blocks,
  scenarios,
  selectionSources,
  allScenarios,
  scriptData,
  t,
  onBlockSelect,
  onBlockUpdate,
  onAccept,
  onCopy,
  isSaving
}: ContentMatrixProps) {
  const [copied, setCopied] = React.useState(false);

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

  const incompleteBlocks = blocks.filter(block => {
    const content = allScenarios?.[selectionSources[block.id]]?.[block.id] || scriptData[block.id];
    const text = typeof content === 'string' ? content : (content as any)?.words || '';
    return !text || text.trim().length < 10;
  });

  return (
    <div className="relative pb-40">
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


      {/* Content Tracks */}
      <div className="space-y-12">
        {blocks.map((block) => (
          <div key={block.id} className="relative">
            <div className="px-6 mb-3 flex items-center gap-3">
              <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                {block.label}
              </span>
              <div className="h-px flex-1 bg-white/[0.05]" />
            </div>

            <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar px-[10vw] py-8 gap-6 scroll-smooth"
                 style={{ scrollPaddingLeft: '10vw', scrollPaddingRight: '10vw' }}>
              <div className="flex-none w-[5vw]" /> {/* Left padding for center snap */}
              {scenarios.map((scenarioId, idx) => (
                <ScenarioCard
                  key={`${block.id}-${scenarioId}`}
                  blockId={block.id}
                  scenarioId={scenarioId}
                  content={allScenarios?.[scenarioId]?.[block.id] || scriptData[block.id] || ''}
                  isSelected={selectionSources[block.id] === scenarioId}
                  t={t}
                  onSelect={onBlockSelect}
                  onUpdate={onBlockUpdate}
                  index={idx}
                />
              ))}
              <div className="flex-none w-[15vw]" /> {/* Right padding for center snap */}
            </div>
          </div>
        ))}
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
