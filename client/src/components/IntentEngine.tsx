"use client";

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface IntentEngineProps {
  stage: 'idle' | 'exploration' | 'convergence' | 'crystallization';
  accentColor: string;
  isListening?: boolean;
  findingCount?: number;
}

const IntentEngine: React.FC<IntentEngineProps> = ({ stage, accentColor, isListening, findingCount }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<any[]>([]);
  const bubbles = useRef<any[]>([]);
  const pulseRef = useRef(0);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    if (findingCount && findingCount > 0) {
      pulseRef.current = 1.0; // Trigger a pulse flash
    }
  }, [findingCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Init particles with orbital metadata
    particles.current = Array.from({ length: 200 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: Math.random() * 2,
      alpha: Math.random() * 0.5,
      angle: Math.random() * Math.PI * 2,
      dist: 100 + Math.random() * 400
    }));

    // Init bubbles
    bubbles.current = Array.from({ length: 8 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 0,
      targetR: 150 + Math.random() * 200,
      alpha: 0
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Handle discovery pulse
      if (pulseRef.current > 0) {
        pulseRef.current *= 0.95;
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, canvas.width / 2);
        gradient.addColorStop(0, `rgba(${accentColor}, ${pulseRef.current * 0.3})`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      particles.current.forEach(p => {
        if (isListening) {
          // Vortex rotation when listening
          p.angle += 0.02;
          p.dist *= 0.99;
          if (p.dist < 50) p.dist = 400;
          p.x = centerX + Math.cos(p.angle) * p.dist;
          p.y = centerY + Math.sin(p.angle) * p.dist;
        } else if (stage === 'convergence') {
          // Gravity pull towards center
          p.x += (centerX - p.x) * 0.04;
          p.y += (centerY - p.y) * 0.04;
        } else if (stage === 'exploration') {
          // Erratic expansion
          p.x += p.vx * 6;
          p.y += p.vy * 6;
        } else {
          p.x += p.vx * 0.8;
          p.y += p.vy * 0.8;
        }

        // Boundary wrap
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${accentColor}, ${p.alpha + (pulseRef.current * 0.5)})`;
        ctx.fill();
      });

      if (stage === 'convergence' || stage === 'crystallization') {
        bubbles.current.forEach(b => {
          b.r += (b.targetR - b.r) * 0.03;
          b.alpha += (0.15 - b.alpha) * 0.03;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${accentColor}, ${b.alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        });
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(requestRef.current);
    };
  }, [stage, accentColor, isListening]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-0" 
      style={{ opacity: stage === 'idle' ? 0.2 : 1, transition: 'opacity 1s ease' }}
    />
  );
};

export default IntentEngine;
