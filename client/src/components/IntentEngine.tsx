"use client";

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface IntentEngineProps {
  stage: 'idle' | 'exploration' | 'convergence' | 'crystallization';
  accentColor: string;
}

const IntentEngine: React.FC<IntentEngineProps> = ({ stage, accentColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<any[]>([]);
  const bubbles = useRef<any[]>([]);
  const requestRef = useRef<number>(0);

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

    // Init particles
    particles.current = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: Math.random() * 2,
      alpha: Math.random() * 0.5
    }));

    // Init bubbles
    bubbles.current = Array.from({ length: 5 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 0,
      targetR: 100 + Math.random() * 100,
      alpha: 0
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      particles.current.forEach(p => {
        // Generative Layout Resonance: Coalesce at center or drift based on stage
        if (stage === 'convergence') {
          p.x += (centerX - p.x) * 0.05;
          p.y += (centerY - p.y) * 0.05;
        } else if (stage === 'exploration') {
          p.x += p.vx * 4;
          p.y += p.vy * 4;
        } else {
          p.x += p.vx * 0.5;
          p.y += p.vy * 0.5;
        }

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${accentColor}, ${p.alpha})`;
        ctx.fill();
      });

      if (stage === 'convergence') {
        bubbles.current.forEach(b => {
          b.r += (b.targetR - b.r) * 0.02;
          b.alpha += (0.1 - b.alpha) * 0.02;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${accentColor}, ${b.alpha})`;
          ctx.lineWidth = 1;
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
  }, [stage, accentColor]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-0" 
      style={{ opacity: stage === 'idle' ? 0 : 1, transition: 'opacity 1s ease' }}
    />
  );
};

export default IntentEngine;
