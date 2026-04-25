'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wand2, Check } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

interface ScenarioCardProps {
  blockId: string;
  scenarioId: string;
  content: string;
  isSelected: boolean;
  locale: string;
  t: (key: string) => string;
  onSelect: (blockId: string, scenarioId: string) => void;
  onRefine: (instruction: string) => void;
}

function ScenarioCard({
  blockId,
  scenarioId,
  content,
  isSelected,
  locale,
  t,
  onSelect,
  onRefine
}: ScenarioCardProps) {
  const { ref, inView } = useInView({
    threshold: 0.6,
    rootMargin: '0px -10% 0px -10%',
  });

  useEffect(() => {
    if (inView && !isSelected) {
      onSelect(blockId, scenarioId);
    }
  }, [inView, isSelected, onSelect, blockId, scenarioId]);

  const config = {
    evergreen: { color: '#00FF9F', bg: 'rgba(0, 255, 159, 0.05)', border: 'rgba(0, 255, 159, 0.2)' },
    trend: { color: '#FF8A00', bg: 'rgba(255, 138, 0, 0.05)', border: 'rgba(255, 138, 0, 0.2)' },
    educational: { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.05)', border: 'rgba(59, 130, 246, 0.2)' }
  }[scenarioId as 'evergreen' | 'trend' | 'educational'];

  return (
    <motion.div
      ref={ref}
      className={`flex-none w-[88%] sm:w-[500px] snap-center rounded-[1.5rem] border transition-all duration-500 overflow-hidden group cursor-pointer relative ${
        isSelected 
          ? 'border-white/40 bg-white/[0.07] scale-[1.02] shadow-[0_10px_40px_rgba(0,0,0,0.4)] z-10' 
          : 'border-white/5 bg-black/60 opacity-20 grayscale blur-[2px]'
      }`}
    >
      {/* Scope Highlight */}
      {isSelected && (
        <div 
          className="absolute inset-0 border-2 rounded-[1.5rem] pointer-events-none opacity-40 shadow-[inset_0_0_20px_var(--color)]"
          style={{ borderColor: config.color, '--color': config.color } as any}
        />
      )}

      {/* Mini Label */}
      <div 
        className="px-4 py-1.5 flex items-center justify-between border-b backdrop-blur-md"
        style={{ background: config.bg, borderColor: config.border }}
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: config.color }} />
          <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: config.color }}>
            {t(`scenarios.${scenarioId}`)}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-3">
        <textarea
          value={content}
          readOnly
          className="w-full bg-transparent text-base leading-relaxed text-white font-medium focus:outline-none resize-none min-h-[140px] text-center"
        />

        {/* Prompt Input Area - Subtle */}
        <div className="pt-2 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-1.5 border border-white/5 focus-within:border-white/10 transition-all">
            <Wand2 className="w-3 h-3 text-white/20" />
            <input 
              placeholder={locale === 'ru' ? 'Уточнить блок...' : 'Refine this block...'}
              className="bg-transparent text-[10px] font-bold text-white/50 placeholder:text-white/5 outline-none w-full"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onRefine(`${blockId} in ${scenarioId}: ${e.currentTarget.value}`);
                  e.currentTarget.value = '';
                  e.stopPropagation();
                }
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface ContentMatrixProps {
  blocks: { id: string; label: string }[];
  scenarios: ('evergreen' | 'trend' | 'educational')[];
  selectionSources: Record<string, string>;
  allScenarios: any;
  scriptData: any;
  locale: string;
  t: (key: string) => string;
  onBlockSelect: (blockId: string, scenarioId: string) => void;
  onRefine: (instruction: string) => void;
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
  onRefine
}: ContentMatrixProps) {
  return (
    <div className="relative space-y-2 pb-32">
      {blocks.map((block) => (
        <div key={block.id} className="space-y-1">
          {/* Extremely tight label */}
          <div className="flex items-center justify-center">
            <div className="px-3 py-0.5 bg-white/5 border border-white/10 rounded-full">
              <span className="text-[8px] font-black tracking-[0.4em] text-white/40 uppercase">
                {block.label}
              </span>
            </div>
          </div>

          <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-6 px-[20%] py-4 gap-4">
            {scenarios.map((scenarioId) => (
              <ScenarioCard
                key={scenarioId}
                blockId={block.id}
                scenarioId={scenarioId}
                content={allScenarios?.[scenarioId]?.[block.id] || scriptData[block.id] || ''}
                isSelected={selectionSources[block.id] === scenarioId}
                locale={locale}
                t={t}
                onSelect={onBlockSelect}
                onRefine={onRefine}
              />
            ))}
            {/* Spacer for proper centering of all elements */}
            <div className="flex-none w-[20%]" />
          </div>
        </div>
      ))}
    </div>
  );
}
