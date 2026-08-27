/**
 * Client 3D stage — floating product images + videos with posters always visible.
 */
'use client';

import { useCallback, useRef, useState, type MouseEvent } from 'react';

const FLOAT_IMAGES = [
  {
    src: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80&auto=format&fit=crop',
    ratio: '4 / 5',
    className: 'hero3d-card hero3d-card-a',
  },
  {
    src: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80&auto=format&fit=crop',
    ratio: '1 / 1',
    className: 'hero3d-card hero3d-card-b',
  },
  {
    src: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&q=80&auto=format&fit=crop',
    ratio: '3 / 4',
    className: 'hero3d-card hero3d-card-c',
  },
];

const FLOAT_VIDEOS = [
  {
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    poster:
      'https://images.unsplash.com/photo-1611162617474-5b21e11e480f?w=700&q=85&auto=format&fit=crop',
    ratio: '9 / 16',
    className: 'hero3d-card hero3d-card-v1',
  },
  {
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    poster:
      'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&q=85&auto=format&fit=crop',
    ratio: '16 / 9',
    className: 'hero3d-card hero3d-card-v2',
  },
];

function VideoCard({
  src,
  poster,
  className,
  ratio,
}: {
  src: string;
  poster: string;
  className: string;
  ratio: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className={className} style={{ aspectRatio: ratio }}>
      {/* Permanent poster — never leave a black void */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={poster}
        alt=""
        draggable={false}
        className="hero3d-poster"
        style={{ opacity: playing ? 0 : 1 }}
      />
      <video
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        className="hero3d-video"
        onPlaying={() => setPlaying(true)}
        onError={() => setPlaying(false)}
        onLoadedData={(e) => {
          void e.currentTarget.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        }}
      />
      <span className="hero3d-glare" />
      <span className="hero3d-badge">3D · Live</span>
    </div>
  );
}

export function LandingHeroStage() {
  const stageRef = useRef<HTMLDivElement>(null);

  const onMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty('--tilt-x', `${(-y * 14).toFixed(2)}deg`);
    el.style.setProperty('--tilt-y', `${(x * 18).toFixed(2)}deg`);
    el.style.setProperty('--shift-x', `${(x * 18).toFixed(1)}px`);
    el.style.setProperty('--shift-y', `${(y * 14).toFixed(1)}px`);
  }, []);

  const onLeave = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    el.style.setProperty('--tilt-x', '0deg');
    el.style.setProperty('--tilt-y', '0deg');
    el.style.setProperty('--shift-x', '0px');
    el.style.setProperty('--shift-y', '0px');
  }, []);

  return (
    <div
      ref={stageRef}
      className="hero3d-stage"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      aria-hidden
    >
      <div className="hero3d-world">
        {FLOAT_IMAGES.map((card) => (
          <div
            key={card.src}
            className={card.className}
            style={{ aspectRatio: card.ratio }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={card.src} alt="" draggable={false} />
            <span className="hero3d-glare" />
          </div>
        ))}
        {FLOAT_VIDEOS.map((card) => (
          <VideoCard key={card.src} {...card} />
        ))}
        <div className="hero3d-orbit" />
        <div className="hero3d-orbit hero3d-orbit-delayed" />
      </div>
    </div>
  );
}
