/**
 * Multi-color fire trail that follows the mouse across the landing page.
 */
'use client';

import { useEffect, useRef } from 'react';

type Flame = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  sat: number;
  light: number;
};

const PALETTE = [
  { h: 0, s: 95, l: 55 }, // red
  { h: 18, s: 100, l: 52 }, // orange
  { h: 42, s: 100, l: 55 }, // gold
  { h: 55, s: 100, l: 60 }, // yellow
  { h: 165, s: 85, l: 45 }, // teal (brand)
  { h: 285, s: 80, l: 60 }, // magenta spark
  { h: 200, s: 90, l: 55 }, // cyan spark
];

export function MouseFireTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let flames: Flame[] = [];
    let raf = 0;
    let running = true;
    let lastX = window.innerWidth / 2;
    let lastY = window.innerHeight / 2;
    let lastT = performance.now();
    let moved = false;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = (x: number, y: number, speed: number) => {
      const count = Math.min(8, 2 + Math.floor(speed / 4));
      for (let i = 0; i < count; i++) {
        const pal = PALETTE[Math.floor(Math.random() * PALETTE.length)]!;
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
        const burst = 0.6 + Math.random() * 2.2 + speed * 0.04;
        flames.push({
          x: x + (Math.random() - 0.5) * 10,
          y: y + (Math.random() - 0.5) * 10,
          vx: Math.cos(angle) * burst * (0.3 + Math.random()),
          vy: Math.sin(angle) * burst - Math.random() * 1.8,
          life: 1,
          maxLife: 0.35 + Math.random() * 0.55,
          size: 6 + Math.random() * 16 + Math.min(speed * 0.15, 10),
          hue: pal.h + (Math.random() - 0.5) * 18,
          sat: pal.s,
          light: pal.l,
        });
      }
      if (flames.length > 280) flames = flames.slice(-220);
    };

    const onMove = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      const dx = x - lastX;
      const dy = y - lastY;
      const dist = Math.hypot(dx, dy);
      const now = performance.now();
      const dt = Math.max(16, now - lastT);
      const speed = (dist / dt) * 16;
      lastT = now;

      // Trail between last and current for smooth coverage when moving fast
      const steps = Math.max(1, Math.min(6, Math.floor(dist / 18)));
      for (let s = 0; s < steps; s++) {
        const t = (s + 1) / steps;
        spawn(lastX + dx * t, lastY + dy * t, speed);
      }
      lastX = x;
      lastY = y;
      moved = true;
    };

    const tick = () => {
      if (!running) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // Additive fire look
      ctx.globalCompositeOperation = 'lighter';

      for (let i = flames.length - 1; i >= 0; i--) {
        const f = flames[i]!;
        f.life -= 0.016 / f.maxLife;
        f.x += f.vx;
        f.y += f.vy;
        f.vy -= 0.08; // rise
        f.vx *= 0.98;
        f.size *= 0.97;

        if (f.life <= 0 || f.size < 0.8) {
          flames.splice(i, 1);
          continue;
        }

        const alpha = Math.max(0, f.life);
        const soft = Math.max(0, f.light - (1 - alpha) * 25);
        const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size);
        gradient.addColorStop(0, `hsla(${f.hue}, ${f.sat}%, ${Math.min(90, soft + 25)}%, ${alpha * 0.95})`);
        gradient.addColorStop(0.35, `hsla(${f.hue}, ${f.sat}%, ${soft}%, ${alpha * 0.55})`);
        gradient.addColorStop(1, `hsla(${f.hue}, ${f.sat}%, ${soft - 10}%, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';

      // Idle ember drip if mouse hasn't moved recently — keep scene alive slightly
      if (!moved && flames.length < 12) {
        // no idle spawn; wait for mouse
      }
      moved = false;

      raf = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="mouse-fire-canvas"
      aria-hidden
    />
  );
}
