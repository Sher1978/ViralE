'use client';

import React, { useEffect, useRef } from 'react';

interface VoiceVisualizerProps {
  isActive: boolean; // Voice mode is active
  isListening: boolean; // User is speaking
  isSpeaking: boolean; // AI is speaking
  frequencyData?: Uint8Array; // Real-time frequency data from AnalyserNode
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  baseSize: number;
  hue: number;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  isActive,
  isListening,
  isSpeaking,
  frequencyData,
}) => {
  const canvasRef = useRef<any>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const pulseScaleRef = useRef(0.7); // Smooth breathing/pulsing state

  const PARTICLE_COUNT = 320; // High density for nebula cloud effect

  // Initialize particles in a 3D sphere
  useEffect(() => {
    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      // Concentrated spherical distribution (radius ~100px)
      const r = Math.pow(Math.random(), 0.75) * 105; 
      
      particles.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        vz: (Math.random() - 0.5) * 0.15,
        baseSize: Math.random() * 1.2 + 0.5, // Tiny glowing dust (0.5px to 1.7px)
        hue: 190 + Math.random() * 45, // Cyberpunk electric cyan/blue
      });
    }
    particlesRef.current = particles;
  }, []);

  // Handle canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = (globalThis as any).devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };

    resize();
    const win = (globalThis as any).window;
    if (win) win.addEventListener('resize', resize);
    return () => {
      if (win) win.removeEventListener('resize', resize);
    };
  }, []);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const dpr = (globalThis as any).devicePixelRatio || 1;

      // Deep space space backdrop with slight trailing for fluid motion
      ctx.fillStyle = 'rgba(2, 4, 12, 0.16)';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.scale(dpr, dpr);

      const cssWidth = width / dpr;
      const cssHeight = height / dpr;
      const centerX = cssWidth / 2;
      const centerY = cssHeight / 2;
      
      timeRef.current += 0.01;

      // Frequency analysis
      let avgFreq = 0;
      let lowFreq = 0;
      let midFreq = 0;
      if (frequencyData && frequencyData.length > 0) {
        avgFreq = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length;
        lowFreq = frequencyData.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
        midFreq = frequencyData.slice(10, 30).reduce((a, b) => a + b, 0) / 20;
      }

      const isInteraction = isListening || isSpeaking;
      const intensity = isInteraction ? (avgFreq / 140) : 0;

      // Camera vibration/tremor on vocal peaks (brings back early organic aesthetic)
      const shakeAmt = isInteraction ? (avgFreq / 255) * 4.5 : 0;
      const shakeX = (Math.random() - 0.5) * shakeAmt;
      const shakeY = (Math.random() - 0.5) * shakeAmt;
      ctx.translate(shakeX, shakeY);

      // Pulse scale constraints (idle: ~0.7, speaking max: ~1.25x - under 2x volume limit)
      let targetPulseScale = 0.7;
      if (isInteraction) {
        const freqFactor = avgFreq / 150;
        targetPulseScale = 0.7 + Math.min(freqFactor, 0.55); // maximum 1.25
      } else {
        targetPulseScale = 0.7 + Math.sin(timeRef.current * 1.8) * 0.04;
      }

      pulseScaleRef.current += (targetPulseScale - pulseScaleRef.current) * 0.12;
      const pulseScale = pulseScaleRef.current;

      // Volumetric core glow gradient (eliminates sharp boundaries)
      const coreGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 125 * pulseScale);
      coreGlow.addColorStop(0, `rgba(139, 92, 246, ${0.16 * (1 + intensity)})`); // purple core
      coreGlow.addColorStop(0.5, `rgba(6, 182, 212, ${0.06 * (1 + intensity)})`); // cyan mid
      coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 125 * pulseScale, 0, Math.PI * 2);
      ctx.fill();

      // Render filamentous connections (Subtle space dust webs)
      if (isActive && isInteraction) {
        ctx.beginPath();
        const connectionOpacityBase = 0.045;
        for (let i = 0; i < particlesRef.current.length; i += 2) {
          const p1 = particlesRef.current[i];
          const scale1 = 280 / (280 + p1.z);
          const screenX1 = centerX + p1.x * scale1 * pulseScale;
          const screenY1 = centerY + p1.y * scale1 * pulseScale;

          for (let j = i + 1; j < Math.min(i + 4, particlesRef.current.length); j++) {
            const p2 = particlesRef.current[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dz = p1.z - p2.z;
            const distSq = dx * dx + dy * dy + dz * dz;

            if (distSq < 1200) {
              const scale2 = 280 / (280 + p2.z);
              const screenX2 = centerX + p2.x * scale2 * pulseScale;
              const screenY2 = centerY + p2.y * scale2 * pulseScale;

              const opacity = (1 - Math.sqrt(distSq) / 35) * connectionOpacityBase * (1 + intensity);
              ctx.strokeStyle = `hsla(${p1.hue}, 100%, 75%, ${opacity})`;
              ctx.lineWidth = 0.35;
              ctx.moveTo(screenX1, screenY1);
              ctx.lineTo(screenX2, screenY2);
            }
          }
        }
        ctx.stroke();
      }

      // Render Particles
      ctx.globalCompositeOperation = 'lighter';

      // Z-sorting to maintain correct 3D depth layering
      const sortedParticles = [...particlesRef.current].sort((a, b) => b.z - a.z);

      sortedParticles.forEach((p) => {
        // Continuous organic orbit rotations
        const orbitSpeedY = 0.0035 + (midFreq / 16000);
        const orbitSpeedX = 0.0012 + (lowFreq / 26000);

        // Rotation around Y
        const cosY = Math.cos(orbitSpeedY);
        const sinY = Math.sin(orbitSpeedY);
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.z * cosY + p.x * sinY;

        // Rotation around X
        const cosX = Math.cos(orbitSpeedX);
        const sinX = Math.sin(orbitSpeedX);
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = z1 * cosX + p.y * sinX;

        p.x = x1;
        p.y = y2;
        p.z = z2;

        // Mild thermal vibration (live nebula look)
        const jitter = 0.12 + intensity * 0.35;
        p.x += (Math.random() - 0.5) * jitter;
        p.y += (Math.random() - 0.5) * jitter;
        p.z += (Math.random() - 0.5) * jitter;

        // Dynamic voice displacement
        if (isSpeaking) {
          const beatPush = (lowFreq / 255) * 0.35;
          p.x += (p.x * beatPush * 0.004);
          p.y += (p.y * beatPush * 0.004);
          p.z += (p.z * beatPush * 0.004);
        }

        // Restoring force to keep spherical containment
        const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
        if (dist > 110) {
          const pull = 0.06;
          p.x -= (p.x / dist) * pull * (dist - 110);
          p.y -= (p.y / dist) * pull * (dist - 110);
          p.z -= (p.z / dist) * pull * (dist - 110);
        }

        // 3D Perspective Projection
        const scale = 280 / (280 + p.z);
        const screenX = centerX + p.x * scale * pulseScale;
        const screenY = centerY + p.y * scale * pulseScale;
        const projectedSize = p.baseSize * scale * pulseScale;

        const opacity = isActive ? (0.24 + intensity * 0.45) * scale : 0.09;

        // Circular rendering (no square artifacts)
        ctx.beginPath();
        ctx.arc(screenX, screenY, projectedSize, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${opacity})`;
        ctx.fill();
      });

      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isActive, isListening, isSpeaking, frequencyData]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full transition-all duration-1000 ${
        isActive ? 'opacity-100' : 'opacity-40 pointer-events-none'
      }`}
      style={{
        filter: isActive ? 'blur(1.2px)' : 'blur(25px)',
      }}
    />
  );
};
