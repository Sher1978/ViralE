'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Cpu, 
  Database, 
  Activity, 
  Terminal, 
  Clock, 
  ShieldCheck, 
  Server,
  Layers,
  Hexagon
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface FactoryMonitorProps {
  progress: number;
  status: string;
}

export const FactoryMonitor: React.FC<FactoryMonitorProps> = ({ progress, status }) => {
  const t = useTranslations('production.factoryMonitor');
  const [logs, setLogs] = useState<string[]>([]);
  const [metrics, setMetrics] = useState({
    gpu: 0,
    cpu: 0,
    vram: 0,
    fps: 0
  });
  
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Simulated metrics
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics({
        gpu: 75 + Math.random() * 20,
        cpu: 40 + Math.random() * 30,
        vram: 2.4 + Math.random() * 1.2,
        fps: 24 + Math.random() * 4
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Log progression based on progress
  useEffect(() => {
    const logKeys = ['init', 'auth', 'avatar', 'veo', 'sync', 'audio', 'assembly', 'cleanup', 'ready'];
    const currentLogIndex = Math.floor((progress / 100) * logKeys.length);
    
    const newLogs: string[] = [];
    for (let i = 0; i <= currentLogIndex; i++) {
      if (i < logKeys.length) {
        newLogs.push(`[${new Date().toLocaleTimeString()}] ${t(`logs.${logKeys[i]}`)}`);
      }
    }
    
    setLogs(newLogs);
  }, [progress, t]);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Header: Factory Heartbeat */}
      <div className="flex items-center justify-between px-6 py-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse" />
            <div className="absolute inset-0 w-3 h-3 bg-cyan-400 rounded-full animate-ping opacity-75" />
          </div>
          <span className="text-sm font-mono text-cyan-400/80 uppercase tracking-widest">
            {t('health')}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-white/40 uppercase font-bold">{t('fps')}</span>
            <span className="text-sm font-mono text-white/80">{metrics.fps.toFixed(1)} <span className="text-[10px]">FPS</span></span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-white/40 uppercase font-bold">Uptime</span>
            <span className="text-sm font-mono text-white/80">00:04:12</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Metrics Wheel & Engine Multiplier */}
        <div className="lg:col-span-1 space-y-6">
          {/* Main Visualizer */}
          <div className="relative aspect-square rounded-3xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden">
            {/* Background scanning hex Grid */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500/20 via-transparent to-transparent" />
            <div className="absolute inset-0 opacity-20" 
                 style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            
            {/* Progress Ring */}
            <svg className="w-48 h-48 transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                className="stroke-white/5 fill-none"
                strokeWidth="8"
              />
              <motion.circle
                cx="96"
                cy="96"
                r="88"
                className="stroke-cyan-500 fill-none"
                strokeWidth="8"
                strokeDasharray="552.92"
                initial={{ strokeDashoffset: 552.92 }}
                animate={{ strokeDashoffset: 552.92 - (552.92 * progress) / 100 }}
                strokeLinecap="round"
                transition={{ duration: 0.5 }}
              />
            </svg>

            {/* Inner Stats */}
            <div className="absolute flex flex-col items-center">
              <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-white/40">
                {Math.round(progress)}%
              </span>
              <span className="text-[10px] text-cyan-400/60 font-bold uppercase tracking-tighter mt-1">
                {t('engineStatus', { status: status.replace('_', ' ') })}
              </span>
            </div>

            {/* Scanning Line */}
            <motion.div 
              className="absolute top-0 left-0 w-full h-[2px] bg-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.5)]"
              animate={{ top: ['0%', '100%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
          </div>

          {/* Engine Load Units */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard 
              icon={<Zap className="w-4 h-4 text-yellow-400" />} 
              label={t('gpuLoad')} 
              value={`${metrics.gpu.toFixed(0)}%`} 
              active={true}
            />
            <MetricCard 
              icon={<Cpu className="w-4 h-4 text-purple-400" />} 
              label={t('cpuLoad')} 
              value={`${metrics.cpu.toFixed(0)}%`} 
              active={progress < 100}
            />
            <MetricCard 
              icon={<Database className="w-4 h-4 text-cyan-400" />} 
              label={t('memLoad')} 
              value={`${metrics.vram.toFixed(1)} GB`} 
              active={true}
            />
            <MetricCard 
              icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />} 
              label="Sync Node" 
              value="SECURE" 
              active={true}
            />
          </div>
        </div>

        {/* Right Column: System Logs & Pipeline Visualization */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Logs Terminal */}
          <div className="flex-1 min-h-[300px] bg-black/60 border border-white/10 rounded-3xl overflow-hidden flex flex-col backdrop-blur-xl">
            <div className="px-5 py-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold text-white/60 tracking-wider">
                  {t('logTitle')}
                </span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-white/10" />
                <div className="w-2 h-2 rounded-full bg-white/10" />
                <div className="w-2 h-2 rounded-full bg-white/10" />
              </div>
            </div>
            
            <div 
              ref={logContainerRef}
              className="flex-1 p-5 font-mono text-[11px] space-y-2 overflow-y-auto scrollbar-hide"
            >
              <AnimatePresence mode="popLayout">
                {logs.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-3"
                  >
                    <span className="text-cyan-500/40">{'>'}</span>
                    <span className={i === logs.length - 1 ? "text-cyan-400" : "text-white/50"}>
                      {log}
                    </span>
                    {i === logs.length - 1 && (
                      <motion.span
                        animate={{ opacity: [0, 1] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="w-1.5 h-3 bg-cyan-400 inline-block align-middle"
                      />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Visualization of the factory belt */}
          <div className="h-24 bg-white/5 border border-white/10 rounded-3xl relative overflow-hidden flex items-center px-8">
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(90deg,_transparent_0%,_white_50%,_transparent_100%)] animate-pulse" />
            
            <div className="flex justify-between w-full relative z-10">
              <div className="flex flex-col items-center gap-2">
                <Server className={`w-5 h-5 ${progress > 10 ? 'text-cyan-400' : 'text-white/20'}`} />
                <div className={`h-1 w-12 rounded-full ${progress > 10 ? 'bg-cyan-400 shadow-[0_0_8px_cyan]' : 'bg-white/10'}`} />
              </div>
              <div className="flex-1 flex items-center px-2">
                <div className="h-[2px] w-full bg-white/5 relative">
                  <motion.div 
                    className="absolute h-full bg-cyan-400"
                    initial={{ width: "0%" }}
                    animate={{ width: `${Math.min(100, Math.max(0, (progress - 10) * 1.25))}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Layers className={`w-5 h-5 ${progress > 50 ? 'text-cyan-400' : 'text-white/20'}`} />
                <div className={`h-1 w-12 rounded-full ${progress > 50 ? 'bg-cyan-400 shadow-[0_0_8px_cyan]' : 'bg-white/10'}`} />
              </div>
              <div className="flex-1 flex items-center px-2">
                <div className="h-[2px] w-full bg-white/5 relative">
                  <motion.div 
                    className="absolute h-full bg-cyan-400"
                    initial={{ width: "0%" }}
                    animate={{ width: `${Math.min(100, Math.max(0, (progress - 50) * 2))}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Hexagon className={`w-5 h-5 ${progress > 90 ? 'text-cyan-400' : 'text-white/20'}`} />
                <div className={`h-1 w-12 rounded-full ${progress > 90 ? 'bg-cyan-400 shadow-[0_0_8px_cyan]' : 'bg-white/10'}`} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between text-[10px] text-white/30 uppercase tracking-widest font-mono">
        <span>Worker Instance: v-engine-node-04-eu-west</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
             <Clock className="w-3 h-3" />
             <span>{t('eta', { time: '00:15' })}</span>
          </div>
          <span>Ref: 0x8f2...{status.slice(0, 4)}</span>
        </div>
      </div>
    </div>
  );
};

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  active: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, active }) => (
  <div className={`p-4 rounded-2xl border transition-all duration-500 ${
    active ? 'bg-white/5 border-white/10 shadow-[inner_0_0_20px_rgba(255,255,255,0.02)]' : 'bg-white/[0.02] border-white/5 opacity-50'
  }`}>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{label}</span>
    </div>
    <div className="text-lg font-mono text-white/80 font-bold tabular-nums">
      {active ? value : '---'}
    </div>
  </div>
);
