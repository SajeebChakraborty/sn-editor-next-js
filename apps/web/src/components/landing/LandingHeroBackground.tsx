/**
 * Multi-layer hero background with mouse-driven parallax (listens on window).
 */
'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

const LAYERS = [
  {
    src: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea8?w=2200&q=80&auto=format&fit=crop',
    depth: 14,
    className: 'hero-bg-layer hero-bg-base',
  },
  {
    src: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1800&q=75&auto=format&fit=crop',
    depth: 26,
    className: 'hero-bg-layer hero-bg-accent',
  },
  {
    src: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=70&auto=format&fit=crop',
    depth: 38,
    className: 'hero-bg-layer hero-bg-glow',
  },
];

export function LandingHeroBackground() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: globalThis.MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      el.style.setProperty('--mx', x.toFixed(3));
      el.style.setProperty('--my', y.toFixed(3));
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div ref={rootRef} className="hero-bg" aria-hidden>
      <div className="hero-bg-fallback" />
      {LAYERS.map((layer) => (
        <div
          key={layer.src}
          className={layer.className}
          style={
            {
              backgroundImage: `url(${layer.src})`,
              '--depth': String(layer.depth),
            } as CSSProperties
          }
        />
      ))}
      <div className="hero-bg-mesh" />
      <div className="hero-bg-vignette" />
      <div className="landing-hero-grain" />
      <div className="hero-bg-orb hero-bg-orb-a" />
      <div className="hero-bg-orb hero-bg-orb-b" />
    </div>
  );
}
