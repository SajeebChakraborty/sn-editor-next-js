/**
 * Product screenshot wall — realistic SN Editor UI frames (image + video).
 */
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type Shot = {
  id: string;
  label: string;
  caption: string;
  kind: 'image' | 'video';
};

const SHOTS: Shot[] = [
  { id: 'canvas', label: 'Canvas', caption: 'Instagram post on an infinite workspace', kind: 'image' },
  { id: 'templates', label: 'Templates', caption: 'Start from brand-ready layouts', kind: 'image' },
  { id: 'elements', label: 'Elements', caption: 'Shapes, graphics & search', kind: 'image' },
  { id: 'text', label: 'Text', caption: 'Headings, body & Google Fonts', kind: 'image' },
  { id: 'brand', label: 'Brand kit', caption: 'Colors & logos that stick', kind: 'image' },
  { id: 'pages', label: 'Multi-page', caption: 'Design each page independently', kind: 'image' },
  { id: 'resize', label: 'Magic Resize', caption: 'One design → every ratio', kind: 'image' },
  { id: 'export', label: 'Export', caption: 'PNG, PDF · 1×–3×', kind: 'image' },
  { id: 'ai', label: 'AI tools', caption: 'Background remove & polish', kind: 'image' },
  { id: 'video', label: 'Video timeline', caption: 'CapCut-simple ad edits', kind: 'video' },
  { id: 'clips', label: 'Clips & captions', caption: 'Hook in the first 3 seconds', kind: 'video' },
  { id: 'ratios', label: 'Social ratios', caption: '9:16 · 1:1 · 16:9', kind: 'video' },
];

function Chrome({
  title,
  children,
  accent = '#8b3dff',
}: {
  title: string;
  children: ReactNode;
  accent?: string;
}) {
  return (
    <div className="shot-chrome">
      <div className="shot-chrome-bar">
        <span className="shot-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="shot-chrome-title">{title}</span>
        <span className="shot-chrome-pill" style={{ background: accent }}>
          SN Editor
        </span>
      </div>
      <div className="shot-chrome-body">{children}</div>
    </div>
  );
}

function Rail({ active }: { active: number }) {
  const icons = ['✦', '▦', '◇', '↑', 'T', '◎', '⚒', '✦', '▣', '↓'];
  return (
    <aside className="shot-rail">
      {icons.map((ic, i) => (
        <span key={ic + i} className={i === active ? 'shot-rail-on' : undefined}>
          {ic}
        </span>
      ))}
    </aside>
  );
}

function ArtboardMini({
  variant,
}: {
  variant: 'brand' | 'sale' | 'story' | 'yt' | 'blank' | 'ai';
}) {
  if (variant === 'blank') {
    return <div className="shot-board shot-board-blank" />;
  }
  if (variant === 'story') {
    return (
      <div className="shot-board shot-board-story">
        <div className="shot-story-bar" />
        <p className="shot-story-h">New drop</p>
        <p className="shot-story-s">Swipe up</p>
      </div>
    );
  }
  if (variant === 'yt') {
    return (
      <div className="shot-board shot-board-yt">
        <span className="shot-yt-play">▶</span>
        <p className="shot-yt-h">Unbox in 60s</p>
      </div>
    );
  }
  if (variant === 'sale') {
    return (
      <div className="shot-board shot-board-sale">
        <p className="shot-sale-tag">−30%</p>
        <p className="shot-sale-h">Weekend sale</p>
      </div>
    );
  }
  if (variant === 'ai') {
    return (
      <div className="shot-board shot-board-ai">
        <div className="shot-ai-cutout" />
        <p className="shot-ai-label">BG removed</p>
      </div>
    );
  }
  return (
    <div className="shot-board shot-board-brand">
      <p className="shot-brand-h">Meet SN Editor</p>
      <p className="shot-brand-s">Design that feels effortless</p>
      <div className="shot-brand-bar" />
      <div className="shot-brand-btn">Learn More</div>
      <div className="shot-brand-sq" />
    </div>
  );
}

function ShotFrame({ shot }: { shot: Shot }) {
  switch (shot.id) {
    case 'templates':
      return (
        <Chrome title="Templates · SN Editor">
          <div className="shot-layout">
            <Rail active={1} />
            <div className="shot-side">
              <div className="shot-search" />
              <div className="shot-grid-2">
                <ArtboardMini variant="brand" />
                <ArtboardMini variant="sale" />
                <ArtboardMini variant="story" />
                <ArtboardMini variant="yt" />
              </div>
            </div>
            <div className="shot-stage">
              <ArtboardMini variant="brand" />
            </div>
          </div>
        </Chrome>
      );
    case 'elements':
      return (
        <Chrome title="Elements · SN Editor">
          <div className="shot-layout">
            <Rail active={2} />
            <div className="shot-side">
              <div className="shot-search shot-search-filled">shapes</div>
              <div className="shot-shape-row">
                {['■', '●', '▲', '◆', '▭', '○'].map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
              <div className="shot-chip-row">
                <span>Graphics</span>
                <span>Photos</span>
                <span>Icons</span>
              </div>
            </div>
            <div className="shot-stage">
              <ArtboardMini variant="brand" />
            </div>
          </div>
        </Chrome>
      );
    case 'text':
      return (
        <Chrome title="Text · SN Editor">
          <div className="shot-layout">
            <Rail active={4} />
            <div className="shot-side">
              <p className="shot-side-label">Add text</p>
              <div className="shot-text-preset">Add a heading</div>
              <div className="shot-text-preset shot-text-preset-sm">Add a subheading</div>
              <div className="shot-text-preset shot-text-preset-xs">Add body text</div>
            </div>
            <div className="shot-stage">
              <ArtboardMini variant="brand" />
            </div>
          </div>
        </Chrome>
      );
    case 'brand':
      return (
        <Chrome title="Brand · SN Editor" accent="#0d9488">
          <div className="shot-layout">
            <Rail active={5} />
            <div className="shot-side">
              <p className="shot-side-label">Brand kit</p>
              <div className="shot-swatches">
                {['#8b3dff', '#f97316', '#f5e6d3', '#111827', '#14b8a6'].map((c) => (
                  <i key={c} style={{ background: c }} />
                ))}
              </div>
              <div className="shot-logo-slot">Logo</div>
            </div>
            <div className="shot-stage">
              <ArtboardMini variant="sale" />
            </div>
          </div>
        </Chrome>
      );
    case 'pages':
      return (
        <Chrome title="Pages · SN Editor">
          <div className="shot-layout shot-layout-pages">
            <Rail active={0} />
            <div className="shot-stage shot-stage-wide">
              <ArtboardMini variant="brand" />
            </div>
            <div className="shot-pages-strip">
              <div className="shot-page-thumb on">
                <ArtboardMini variant="brand" />
                <span>1</span>
              </div>
              <div className="shot-page-thumb">
                <ArtboardMini variant="sale" />
                <span>2</span>
              </div>
              <div className="shot-page-thumb">
                <ArtboardMini variant="story" />
                <span>3</span>
              </div>
              <div className="shot-page-add">+</div>
            </div>
          </div>
        </Chrome>
      );
    case 'resize':
      return (
        <Chrome title="Magic Resize · SN Editor">
          <div className="shot-layout shot-layout-resize">
            <div className="shot-resize-from">
              <ArtboardMini variant="brand" />
              <span>1080×1080</span>
            </div>
            <div className="shot-resize-arrow">→</div>
            <div className="shot-resize-to">
              <ArtboardMini variant="story" />
              <span>1080×1920</span>
            </div>
            <div className="shot-resize-to">
              <ArtboardMini variant="yt" />
              <span>1280×720</span>
            </div>
          </div>
        </Chrome>
      );
    case 'export':
      return (
        <Chrome title="Export · SN Editor">
          <div className="shot-layout">
            <Rail active={9} />
            <div className="shot-side">
              <p className="shot-side-label">Download</p>
              <div className="shot-export-opt on">PNG · 2×</div>
              <div className="shot-export-opt">PDF · multi-page</div>
              <div className="shot-export-opt">Transparent</div>
              <div className="shot-export-cta">Download</div>
            </div>
            <div className="shot-stage">
              <ArtboardMini variant="brand" />
            </div>
          </div>
        </Chrome>
      );
    case 'ai':
      return (
        <Chrome title="AI · SN Editor" accent="#14b8a6">
          <div className="shot-layout">
            <Rail active={7} />
            <div className="shot-side">
              <p className="shot-side-label">AI tools</p>
              <div className="shot-export-opt on">Remove background</div>
              <div className="shot-export-opt">Enhance</div>
              <div className="shot-export-opt">Magic edit</div>
            </div>
            <div className="shot-stage">
              <ArtboardMini variant="ai" />
            </div>
          </div>
        </Chrome>
      );
    case 'video':
    case 'clips':
    case 'ratios':
      return (
        <Chrome title="Video Editor · SN Editor" accent="#f97316">
          <div className="shot-video">
            <div className="shot-video-preview">
              {shot.id === 'ratios' ? (
                <div className="shot-ratio-row">
                  <ArtboardMini variant="story" />
                  <ArtboardMini variant="brand" />
                  <ArtboardMini variant="yt" />
                </div>
              ) : (
                <div className="shot-video-frame">
                  <span className="shot-yt-play">▶</span>
                  <p>{shot.id === 'clips' ? 'Shop the look' : 'Product reel'}</p>
                </div>
              )}
            </div>
            <div className="shot-timeline">
              <div className="shot-tl-track">
                <i style={{ width: '42%' }} />
                <i style={{ width: '28%', marginLeft: '4%' }} />
              </div>
              <div className="shot-tl-track shot-tl-audio">
                <i style={{ width: '70%' }} />
              </div>
              <div className="shot-tl-playhead" />
            </div>
          </div>
        </Chrome>
      );
    default:
      return (
        <Chrome title="Image Editor · SN Editor">
          <div className="shot-layout">
            <Rail active={0} />
            <div className="shot-side shot-side-dim">
              <div className="shot-search" />
              <div className="shot-shape-row">
                {['■', '●', '▲', '◆'].map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </div>
            <div className="shot-stage">
              <ArtboardMini variant="brand" />
            </div>
          </div>
        </Chrome>
      );
  }
}

export function ProductScreenshotGallery() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const card = el.querySelector('.shot-card') as HTMLElement | null;
      if (!card) return;
      const w = card.offsetWidth + 16;
      setActive(Math.round(el.scrollLeft / w));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector('.shot-card') as HTMLElement | null;
    const w = (card?.offsetWidth ?? 360) + 16;
    el.scrollBy({ left: dir * w, behavior: 'smooth' });
  };

  return (
    <div className="shot-gallery">
      <div className="shot-gallery-head">
        <div>
          <h2 className="font-display text-3xl text-ink-950 sm:text-4xl">See SN Editor in action</h2>
          <p className="mt-3 max-w-xl text-ink-700">
            Real editor surfaces — canvas, templates, brand kit, multi-page, export, and the video timeline.
          </p>
        </div>
        <div className="shot-gallery-nav">
          <button type="button" className="shot-nav-btn" onClick={() => scrollBy(-1)} aria-label="Previous">
            ←
          </button>
          <button type="button" className="shot-nav-btn" onClick={() => scrollBy(1)} aria-label="Next">
            →
          </button>
        </div>
      </div>

      <div ref={scrollerRef} className="shot-scroller">
        {SHOTS.map((shot) => (
          <article key={shot.id} className="shot-card">
            <ShotFrame shot={shot} />
            <div className="shot-meta">
              <span className="shot-kind">{shot.kind === 'video' ? 'Video' : 'Image'}</span>
              <h3 className="font-display text-lg text-ink-950">{shot.label}</h3>
              <p className="text-sm text-ink-700">{shot.caption}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="shot-dots-bar" role="tablist" aria-label="Screenshots">
        {SHOTS.map((shot, i) => (
          <button
            key={shot.id}
            type="button"
            className={i === active ? 'on' : undefined}
            aria-label={shot.label}
            onClick={() => {
              const el = scrollerRef.current;
              const card = el?.querySelector('.shot-card') as HTMLElement | null;
              if (!el || !card) return;
              el.scrollTo({ left: i * (card.offsetWidth + 16), behavior: 'smooth' });
            }}
          />
        ))}
      </div>
    </div>
  );
}
