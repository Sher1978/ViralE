'use client';

import React from 'react';

interface ScenarioLegendProps {
  scenarios: {
    id: string;
    color: string;
    label: string;
  }[];
}

export function ScenarioLegend({ scenarios }: ScenarioLegendProps) {
  return (
    <div className="flex items-center justify-center gap-6 py-2 px-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
      {scenarios.map(l => (
        <div key={l.id} className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full shadow-[0_0_8px_var(--color)]" 
            style={{ '--color': l.color, background: l.color } as any} 
          />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
            {l.label}
          </span>
        </div>
      ))}
    </div>
  );
}
