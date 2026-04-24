'use client';

import React from 'react';
import { 
  Scissors, Film, Type, Monitor, 
  Brain, Settings2, Download 
} from 'lucide-react';

interface StudioToolbarProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  onExport: () => void;
}

const StudioToolbar: React.FC<StudioToolbarProps> = ({ 
  activeTab, 
  onTabChange, 
  onExport 
}) => {
  const items = [
    { id: 'concept', label: 'Ideas', icon: Brain, color: 'text-yellow-400' },
    { id: 'teleprompter', label: 'Record', icon: Monitor, color: 'text-red-400' },
    { id: 'assembly', label: 'Studio', icon: Scissors, color: 'text-purple-400' },
    { id: 'assets', label: 'B-Roll', icon: Film, color: 'text-blue-400' },
    { id: 'style', label: 'Captions', icon: Type, color: 'text-pink-400' },
    { id: 'knowledge', label: 'DNA', icon: Settings2, color: 'text-green-400' },
  ];

  return (
    <div className="bg-[#0a0a14]/80 backdrop-blur-2xl border-t border-white/5 px-2 pt-3 pb-8 flex items-center justify-between z-[100] fixed bottom-0 left-0 right-0">
      <div className="flex flex-1 justify-around items-end max-w-2xl mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center gap-1.5 transition-all duration-500 relative ${isActive ? 'scale-110 -translate-y-1' : 'opacity-30 hover:opacity-100 hover:scale-105'}`}
            >
              {isActive && (
                <div className="absolute -top-1 w-1 h-1 rounded-full bg-white shadow-[0_0_10px_white]" />
              )}
              <div className={`p-2.5 rounded-2xl transition-all ${isActive ? 'bg-white/5 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]' : ''}`}>
                 <Icon size={22} className={isActive ? item.color : 'text-white'} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[7px] font-black uppercase tracking-[0.2em] transition-colors ${isActive ? 'text-white' : 'text-white/20'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <button 
        onClick={onExport}
        className="absolute right-4 bottom-8 bg-white text-black p-3.5 rounded-[1.5rem] shadow-2xl hover:scale-110 active:scale-90 transition-all z-10 hidden sm:flex items-center gap-2 group"
      >
        <Download size={22} className="group-hover:rotate-12 transition-transform" />
        <span className="text-[9px] font-black uppercase tracking-widest">Export</span>
      </button>
    </div>
  );
};

export default StudioToolbar;
