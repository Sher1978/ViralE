'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Cpu, Zap, Wand2, Share2 } from 'lucide-react';
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
    threshold: 0.7,
    rootMargin: '0px -15% 0px -15%',
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

  return (
    <motion.div
      ref={ref}
      animate={{ 
        scale: isSelected ? 1 : 0.9,
        opacity: isSelected ? 1 : 0.35,
        y: isSelected ? 0 : 5
      }}
      className={`flex-none w-[80vw] sm:w-[350px] snap-center rounded-2xl border-l-4 transition-all duration-500 overflow-hidden relative backdrop-blur-xl group ${
        isSelected 
          ? 'border-white/40 bg-white/5 shadow-2xl' 
          : 'border-white/5 bg-white/[0.02]'
      }`}
      style={{ borderLeftColor: config.color }}
    >
      <div className="px-5 py-3 flex items-center justify-between border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
            {config.label}
          </span>
        </div>
        {isSelected && (
          <Activity className="w-3 h-3 text-white/20 animate-pulse" />
        )}
      </div>

      <div className="p-6">
        <textarea
          value={content}
          onChange={(e) => onUpdate(blockId, scenarioId, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="w-full bg-transparent text-sm sm:text-base leading-relaxed text-white font-medium focus:outline-none focus:ring-1 focus:ring-white/20 rounded-lg p-2 transition-all resize-none min-h-[160px] no-scrollbar placeholder:text-white/10"
          placeholder="[Empty Node... Edit required]"
        />
      </div>
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
  const infiniteScenarios = [...scenarios, ...scenarios, ...scenarios];
  
  const totalWords = Object.entries(selectionSources).reduce((acc, [blockId, scenarioId]) => {
    const text = allScenarios?.[scenarioId]?.[blockId] || scriptData[blockId] || '';
    return acc + text.split(/\s+/).filter(Boolean).length;
  }, 0);
  const totalSeconds = Math.ceil(totalWords / 2.8);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative pb-40">
      {/* Narrative HUD - Reading Time Tracker */}
      <div className="px-6 mb-8 mt-4">
        <div className={`p-5 rounded-2xl border transition-all duration-700 flex items-center justify-between ${
          totalSeconds > 50 ? 'border-red-500/60 bg-red-500/10' : 'border-white/10 bg-white/5'
        }`}>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Audit: Narrative Duration</span>
            <span className={`text-3xl font-black tabular-nums tracking-tighter ${totalSeconds > 50 ? 'text-red-400' : 'text-emerald-400'}`}>
              {totalSeconds}s <span className="text-xs font-medium opacity-30 text-white">/ MAX 50s</span>
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
             <motion.div 
               animate={totalSeconds > 50 ? { scale: [1, 1.2, 1] } : {}}
               transition={{ repeat: Infinity, duration: 1 }}
               className={`w-10 h-10 rounded-full flex items-center justify-center ${totalSeconds > 50 ? 'bg-red-500/20 text-red-500' : 'bg-white/10 text-white/40'}`}
             >
               <Zap className="w-5 h-5 fill-current" />
             </motion.div>
             <span className="text-[8px] font-bold uppercase text-white/20 whitespace-nowrap">Production Ready</span>
          </div>
        </div>
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

            <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar px-[10vw] py-4 gap-6 scroll-smooth"
                 style={{ scrollPaddingLeft: '10vw', scrollPaddingRight: '10vw' }}>
              {infiniteScenarios.map((scenarioId, idx) => (
                <ScenarioCard
                  key={`${block.id}-${scenarioId}-${idx}`}
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
              <div className="flex-none w-[10vw]" />
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
