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
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  color: string;
  hue: number;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  isActive,
  isListening,
  isSpeaking,
  frequencyData,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  // Configuration
  const PARTICLE_COUNT = 240; // Increased for "cloud" density
  const CONNECTION_LIMIT_DEFAULT = 2500;
  const CONNECTION_LIMIT_LISTENING = 8000;

  // Initialize particles
  useEffect(() => {
    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const hue = 190 + Math.random() * 40; // Electric blue range
      particles.push({
        x: Math.random() * 400,
        y: Math.random() * 400,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        size: Math.random() * 1.5 + 0.5,
        baseSize: Math.random() * 1.5 + 0.5,
        hue,
        color: `hsla(${hue}, 100%, 50%, `,
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const { width, height } = canvas;
      const centerX = width / 2;
      const centerY = height / 2;
      timeRef.current += 0.01;

      // Deep space background with very subtle trails for depth
      ctx.fillStyle = 'rgba(2, 4, 12, 0.15)';
      ctx.fillRect(0, 0, width, height);

      // Get frequency analysis
      let avgFreq = 0;
      let lowFreq = 0;
      let midFreq = 0;
      if (frequencyData && frequencyData.length > 0) {
        avgFreq = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length;
        lowFreq = frequencyData.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
        midFreq = frequencyData.slice(10, 30).reduce((a, b) => a + b, 0) / 20;
      }

      // Interaction States
      const isInteraction = isListening || isSpeaking;
      const intensity = isInteraction ? (avgFreq / 140) : 0;
      const pulseScale = isSpeaking ? (1 + (lowFreq / 200)) : (1 + Math.sin(timeRef.current * 1.5) * 0.03);
      
      // Draw Filamentous Connections (Thread-like lattice)
      if (isActive) {
        ctx.beginPath();
        const connectionOpacityBase = isListening ? 0.08 : 0.25;
        for (let i = 0; i < particlesRef.current.length; i++) {
          const limit = isListening ? CONNECTION_LIMIT_LISTENING : CONNECTION_LIMIT_DEFAULT;
          const p1 = particlesRef.current[i];
          
          // Connect to a few nearby particles
          for (let j = i + 1; j < Math.min(i + 8, particlesRef.current.length); j++) {
            const p2 = particlesRef.current[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < limit) {
              const distFactor = 1 - Math.sqrt(distSq / limit);
              const opacity = distFactor * connectionOpacityBase * (1 + intensity);
              ctx.strokeStyle = `hsla(${p1.hue}, 100%, 70%, ${opacity})`;
              ctx.lineWidth = distFactor * 0.5;
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
            }
          }
        }
        ctx.stroke();
      }

      // Update and Draw Pixels (The "Cloud")
      ctx.globalCompositeOperation = 'lighter';
      
      particlesRef.current.forEach((p, idx) => {
        // Orbital Dynamics
        const dx = centerX - p.x;
        const dy = centerY - p.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        // Behaviors based on state
        if (isActive) {
          // Center-seeking "Gravity" - stronger when quiet, weaker when speaking
          const gravityForce = isInteraction ? 0.002 : 0.008;
          p.vx += dx * gravityForce;
          p.vy += dy * gravityForce;

          // Swirl/Orbit speed
          const orbitSpeed = isSpeaking ? 0.02 + (midFreq/1000) : 0.005;
          p.vx += Math.cos(angle + Math.PI/2) * orbitSpeed * d * 0.1;
          p.vy += Math.sin(angle + Math.PI/2) * orbitSpeed * d * 0.1;
          
          if (isListening) {
             // Reactive jitter (like scanning data threads)
             p.vx += (Math.random() - 0.5) * (1 + intensity);
             p.vy += (Math.random() - 0.5) * (1 + intensity);
          }

          if (isSpeaking) {
            // Pulse out from center on beats
            const beatPush = (lowFreq / 255) * 0.5;
            p.vx -= dx * beatPush * 0.01;
            p.vy -= dy * beatPush * 0.01;
          }
        }

        // Apply velocities with state-dependent friction
        const friction = isInteraction ? 0.94 : 0.97;
        p.vx *= friction;
        p.vy *= friction;
        p.x += p.vx;
        p.y += p.vy;

        // Visual properties
        const size = p.baseSize * pulseScale;
        const opacity = isActive ? (0.4 + intensity * 0.6) : 0.1;

        // Pixel Render (Square)
        ctx.fillStyle = `hsla(${p.hue}, 100%, 65%, ${opacity})`;
        ctx.fillRect(p.x - size/2, p.y - size/2, size, size);

        // Glow layer for high intensity particles
        if (isSpeaking && idx % 4 === 0 && intensity > 0.3) {
          ctx.shadowBlur = 10 * intensity;
          ctx.shadowColor = `hsla(${p.hue}, 100%, 70%, 0.8)`;
        } else {
          ctx.shadowBlur = 0;
        }
      });

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
      width={400}
      height={400}
      className={`w-full h-full transition-all duration-1000 ${
        isActive ? 'opacity-100' : 'opacity-40 pointer-events-none'
      }`}
      style={{
        filter: isActive ? 'none' : 'blur(40px)',
      }}
    />
  );
};
