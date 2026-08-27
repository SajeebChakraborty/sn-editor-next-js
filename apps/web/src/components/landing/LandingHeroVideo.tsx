/**
 * High-quality Canva-style editing tutorial (YouTube) — autoplays muted.
 */
'use client';

/** Full Canva tutorial 2024 — beginner walkthrough of canvas-style editing */
const YT_ID = 'UkzVLHeSf7c';

export function LandingHeroVideo() {
  const src =
    `https://www.youtube-nocookie.com/embed/${YT_ID}` +
    '?autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1&loop=1' +
    `&playlist=${YT_ID}`;

  return (
    <div className="landing-hero-video">
      <div className="landing-hero-video-frame">
        <iframe
          title="Canva-style design tutorial"
          src={src}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
}
