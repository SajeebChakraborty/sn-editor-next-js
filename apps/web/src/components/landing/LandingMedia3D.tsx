/**
 * Gapless masonry mosaic — stacked columns so no black empty cells appear.
 * Every tile paints a real image; videos layer over a poster.
 */
'use client';

import { useState } from 'react';

type MediaItem = {
  kind: 'image' | 'video';
  src: string;
  poster?: string;
  alt?: string;
  ratio: string;
  label: string;
};

const ITEMS: MediaItem[] = [
  {
    kind: 'image',
    src: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    ratio: '1 / 1',
    label: '1:1',
    alt: 'Watch',
  },
  {
    kind: 'video',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    poster:
      'https://images.unsplash.com/photo-1611162617474-5b21e11e480f?auto=format&fit=crop&w=700&q=80',
    ratio: '9 / 16',
    label: '9:16',
  },
  {
    kind: 'image',
    src: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
    ratio: '4 / 5',
    label: '4:5',
    alt: 'Sneaker',
  },
  {
    kind: 'video',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    poster:
      'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=900&q=80',
    ratio: '16 / 9',
    label: '16:9',
  },
  {
    kind: 'image',
    src: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
    ratio: '16 / 9',
    label: '16:9',
    alt: 'Headphones',
  },
  {
    kind: 'video',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    poster:
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=80',
    ratio: '1 / 1',
    label: '1:1',
  },
  {
    kind: 'image',
    src: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&fit=crop&w=600&q=80',
    ratio: '9 / 16',
    label: '9:16',
    alt: 'Perfume',
  },
  {
    kind: 'video',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    poster:
      'https://images.unsplash.com/photo-1536240478700-b869070f927e?auto=format&fit=crop&w=700&q=80',
    ratio: '4 / 5',
    label: '4:5',
  },
  {
    kind: 'image',
    src: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=1000&q=80',
    ratio: '21 / 9',
    label: '21:9',
    alt: 'Camera',
  },
  {
    kind: 'image',
    src: 'https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=800&q=80',
    ratio: '3 / 2',
    label: '3:2',
    alt: 'Shoe',
  },
  {
    kind: 'image',
    src: 'https://images.unsplash.com/photo-1620916569170-4aad682d0a0e?auto=format&fit=crop&w=700&q=80',
    ratio: '4 / 3',
    label: '4:3',
    alt: 'Serum',
  },
  {
    kind: 'image',
    src: 'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?auto=format&fit=crop&w=700&q=80',
    ratio: '2 / 3',
    label: '2:3',
    alt: 'Skincare',
  },
  {
    kind: 'image',
    src: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=800&q=80',
    ratio: '5 / 4',
    label: '5:4',
    alt: 'White sneaker',
  },
  {
    kind: 'video',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    poster:
      'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80',
    ratio: '16 / 9',
    label: '16:9',
  },
  {
    kind: 'image',
    src: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=700&q=80',
    ratio: '3 / 4',
    label: '3:4',
    alt: 'Sunglasses',
  },
  {
    kind: 'image',
    src: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=800&q=80',
    ratio: '1 / 1',
    label: '1:1',
    alt: 'Nike product',
  },
];

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80';

function SafeImage({ src, alt }: { src: string; alt: string }) {
  const [url, setUrl] = useState(src);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (url !== FALLBACK_IMG) setUrl(FALLBACK_IMG);
      }}
    />
  );
}

function SafeVideo({ src, poster }: { src: string; poster: string }) {
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);

  return (
    <>
      <SafeImage src={poster} alt="" />
      {!failed && (
        <video
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          className="mosaic-video"
          style={{ opacity: playing ? 1 : 0 }}
          onPlaying={() => setPlaying(true)}
          onError={() => setFailed(true)}
          onLoadedData={(e) => {
            void e.currentTarget
              .play()
              .then(() => setPlaying(true))
              .catch(() => setFailed(true));
          }}
        />
      )}
    </>
  );
}

export function LandingMedia3D() {
  return (
    <div className="mosaic-masonry">
      {ITEMS.map((item, i) => (
        <article
          key={`${item.label}-${i}-${item.src.slice(-10)}`}
          className="mosaic-tile"
          style={{ aspectRatio: item.ratio }}
        >
          <div className="mosaic-tile-inner">
            {item.kind === 'image' ? (
              <SafeImage src={item.src} alt={item.alt ?? ''} />
            ) : (
              <SafeVideo src={item.src} poster={item.poster!} />
            )}
            <div className="mosaic-meta">
              <span>{item.kind === 'video' ? '3D Video' : '3D Image'}</span>
              <span className="mosaic-ratio">{item.label}</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
