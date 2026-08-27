/**
 * Canva-style “Create a design” modal — sizes, templates, search, custom size.
 */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { useImageEditorStore } from '@/store/imageEditorStore';
import { useVideoEditorStore } from '@/store/videoEditorStore';
import { getTemplateById } from '@/lib/templates';
import {
  CREATE_CATEGORIES,
  CREATE_RATIOS,
  CREATE_SHAPES,
  CREATE_VIDEO_ASPECT_KEY,
  FOR_YOU_CARDS,
  SOCIAL_CARDS,
  createDesignWithShape,
  createSizedDocument,
  getPresetById,
  searchPresets,
  searchRatios,
  searchShapes,
  type CreateArt,
  type CreateCategoryId,
  type CreatePreset,
  type CreateRatio,
  type CreateShapeVariation,
  type CreateShowcaseCard,
  type VideoAspect,
} from '@/lib/createDesignCatalog';

export function CreateDesignModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CreateCategoryId>('for-you');

  const loadDocument = useImageEditorStore((s) => s.loadDocument);
  const setLeftTab = useImageEditorStore((s) => s.setLeftTab);
  const newVideoProject = useVideoEditorStore((s) => s.newProject);
  const setVideoAspect = useVideoEditorStore((s) => s.setAspectRatio);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    searchRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mounted, onClose]);

  const searching = query.trim().length > 0;
  const searchHits = useMemo(() => (searching ? searchPresets(query) : []), [searching, query]);
  const ratios = useMemo(() => {
    if (searching) return searchRatios(query);
    if (category === 'ratios') return CREATE_RATIOS;
    return [];
  }, [searching, query, category]);
  const shapes = useMemo(() => {
    if (searching) return searchShapes(query);
    if (category === 'shapes') return CREATE_SHAPES;
    return [];
  }, [searching, query, category]);

  const goEditor = () => {
    if (pathname !== '/editor') router.push('/editor');
  };

  const startDesign = (doc: ReturnType<typeof createSizedDocument>) => {
    loadDocument(doc);
    goEditor();
    onClose();
  };

  const startPreset = (preset: CreatePreset) => {
    if (preset.kind === 'video') {
      startVideo(preset.videoAspect ?? '9:16');
      return;
    }
    if (preset.templateId) {
      const tpl = getTemplateById(preset.templateId);
      if (tpl) {
        startDesign(structuredClone(tpl.document));
        return;
      }
    }
    startDesign(createSizedDocument(preset.label, preset.width, preset.height));
  };

  const startVideo = (aspect: VideoAspect) => {
    if (pathname === '/video') {
      newVideoProject();
      setVideoAspect(aspect);
      onClose();
      return;
    }
    try {
      sessionStorage.setItem(CREATE_VIDEO_ASPECT_KEY, aspect);
    } catch {
      /* ignore */
    }
    router.push('/video');
    onClose();
  };

  const startRatio = (ratio: CreateRatio) => {
    startDesign(createSizedDocument(`${ratio.label} (${ratio.ratio})`, ratio.width, ratio.height));
  };

  const startShape = (variation: CreateShapeVariation) => {
    startDesign(createDesignWithShape(variation));
    setLeftTab('elements');
  };

  const pickShowcase = (card: CreateShowcaseCard) => {
    const preset = getPresetById(card.presetId);
    if (preset) startPreset(preset);
  };

  const openTemplates = () => {
    setLeftTab('templates');
    goEditor();
    onClose();
  };

  const openBrand = () => {
    setLeftTab('brand');
    goEditor();
    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <div className="create-design-root" role="presentation" onMouseDown={onClose}>
      <div
        className="create-design-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-design-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="create-design-head">
          <h2 id="create-design-title">Create a design</h2>
          <label className="create-design-search">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm10 16-4.35-4.35"
              />
            </svg>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What would you like to create?"
            />
          </label>
          <button type="button" className="create-design-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="create-design-body">
          <aside className="create-design-nav">
            <div className="create-design-nav-scroll">
              {CREATE_CATEGORIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={category === item.id && !searching ? 'is-active' : undefined}
                  onClick={() => {
                    setCategory(item.id);
                    setQuery('');
                  }}
                >
                  <span className="create-design-nav-icon">
                    <CategoryGlyph id={item.id} />
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </aside>

          <div className="create-design-main">
            {searching ? (
              <section>
                <h3>Results for “{query.trim()}”</h3>
                {searchHits.length || ratios.length || shapes.length ? (
                  <>
                    {searchHits.length ? (
                      <div className="create-design-grid">
                        {searchHits.map((preset) => (
                          <PresetCard key={preset.id} preset={preset} onPick={startPreset} />
                        ))}
                      </div>
                    ) : null}
                    {ratios.length ? (
                      <div className="create-ratio-row" style={{ marginTop: 16 }}>
                        {ratios.map((ratio) => (
                          <RatioCard key={ratio.id} ratio={ratio} onPick={startRatio} />
                        ))}
                      </div>
                    ) : null}
                    {shapes.length ? (
                      <div className="create-shape-grid" style={{ marginTop: 16 }}>
                        {shapes.map((shape) => (
                          <ShapeCard key={shape.id} shape={shape} onPick={startShape} />
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="create-design-empty">No matching designs.</p>
                )}
              </section>
            ) : null}

            {!searching && category === 'for-you' ? (
              <section>
                <h3>Popular on SN Editor</h3>
                <div className="create-design-grid">
                  {FOR_YOU_CARDS.map((card) => (
                    <ShowcaseCard key={card.presetId} card={card} onPick={pickShowcase} />
                  ))}
                </div>
              </section>
            ) : null}

            {!searching && category === 'presentations' ? (
              <>
                <section>
                  <div className="create-design-hero-grid">
                    <ShowcaseCard
                      card={{ presetId: 'presentation', label: 'Presentation', art: 'presentation' }}
                      onPick={pickShowcase}
                      large
                    />
                  </div>
                </section>
                <section>
                  <h3>More ways to get started</h3>
                  <div className="create-design-ways">
                    <button type="button" className="create-way-card" onClick={openTemplates}>
                      <span className="create-design-thumb create-way-thumb">
                        <CardArt art="flyer" />
                      </span>
                      <strong>Browse templates</strong>
                      <small>Explore professionally designed templates</small>
                    </button>
                    <button type="button" className="create-way-card" onClick={openBrand}>
                      <span className="create-design-thumb create-way-thumb">
                        <CardArt art="logo" />
                      </span>
                      <strong>Brand Templates</strong>
                      <small>Start from your team’s on-brand designs</small>
                    </button>
                  </div>
                </section>
              </>
            ) : null}

            {!searching && category === 'social' ? (
              <section>
                <div className="create-design-grid">
                  {SOCIAL_CARDS.map((card) => (
                    <ShowcaseCard key={card.presetId} card={card} onPick={pickShowcase} />
                  ))}
                </div>
              </section>
            ) : null}

            {!searching && category === 'ratios' ? (
              <section>
                <h3>Ratios</h3>
                <div className="create-ratio-row">
                  {CREATE_RATIOS.map((ratio) => (
                    <RatioCard key={ratio.id} ratio={ratio} onPick={startRatio} />
                  ))}
                </div>
              </section>
            ) : null}

            {!searching && category === 'shapes' ? (
              <section>
                <h3>Shapes</h3>
                <div className="create-shape-grid">
                  {CREATE_SHAPES.map((shape) => (
                    <ShapeCard key={shape.id} shape={shape} onPick={startShape} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ShowcaseCard({
  card,
  onPick,
  large,
}: {
  card: CreateShowcaseCard;
  onPick: (card: CreateShowcaseCard) => void;
  large?: boolean;
}) {
  return (
    <button type="button" className={large ? 'create-design-card is-large' : 'create-design-card'} onClick={() => onPick(card)}>
      <div className="create-design-thumb">
        <CardArt art={card.art} />
      </div>
      <strong>{card.label}</strong>
    </button>
  );
}

function CardArt({ art }: { art: CreateArt }) {
  if (art === 'presentation') {
    return (
      <svg viewBox="0 0 160 110" className="create-art">
        <rect x="28" y="18" width="104" height="68" rx="6" fill="#fff" />
        <rect x="38" y="28" width="44" height="8" rx="2" fill="#fb923c" />
        <rect x="38" y="42" width="28" height="28" rx="2" fill="#fdba74" />
        <rect x="72" y="50" width="8" height="20" rx="1" fill="#f97316" />
        <rect x="84" y="44" width="8" height="26" rx="1" fill="#ea580c" />
        <rect x="96" y="38" width="8" height="32" rx="1" fill="#c2410c" />
        <rect x="108" y="46" width="8" height="24" rx="1" fill="#fb923c" />
      </svg>
    );
  }
  if (art === 'ig-post' || art === 'story' || art === 'tiktok') {
    const portrait = art !== 'ig-post';
    return (
      <svg viewBox="0 0 160 110" className="create-art">
        <rect x={portrait ? 58 : 48} y="8" width={portrait ? 44 : 64} height={portrait ? 94 : 94} rx="10" fill="#111827" />
        <rect x={portrait ? 62 : 52} y="18" width={portrait ? 36 : 56} height={portrait ? 74 : 68} rx="4" fill="#f472b6" />
        <circle cx="80" cy="36" r="10" fill="#fecdd3" />
        <rect x="70" y="52" width="20" height="6" rx="2" fill="#fff" opacity="0.8" />
        <circle cx={portrait ? 66 : 58} cy="16" r="4" fill={art === 'tiktok' ? '#22d3ee' : '#e1306c'} />
      </svg>
    );
  }
  if (art === 'flyer') {
    return (
      <svg viewBox="0 0 160 110" className="create-art">
        <rect x="48" y="10" width="64" height="90" rx="4" fill="#fff" />
        <rect x="56" y="20" width="48" height="8" rx="2" fill="#7c3aed" />
        <rect x="56" y="34" width="36" height="4" rx="1" fill="#c4b5fd" />
        <rect x="56" y="42" width="40" height="4" rx="1" fill="#ddd6fe" />
        <rect x="56" y="56" width="48" height="28" rx="3" fill="#a78bfa" />
      </svg>
    );
  }
  if (art === 'doc') {
    return (
      <svg viewBox="0 0 160 110" className="create-art">
        <rect x="44" y="12" width="72" height="86" rx="4" fill="#fff" />
        <path d="M92 12v18h18" fill="#ede9fe" />
        <rect x="54" y="40" width="40" height="5" rx="2" fill="#7c3aed" />
        <rect x="54" y="50" width="52" height="3" rx="1" fill="#e5e7eb" />
        <rect x="54" y="58" width="48" height="3" rx="1" fill="#e5e7eb" />
        <rect x="54" y="66" width="50" height="3" rx="1" fill="#e5e7eb" />
      </svg>
    );
  }
  if (art === 'video' || art === 'yt') {
    return (
      <svg viewBox="0 0 160 110" className="create-art">
        <rect x="24" y="22" width="112" height="66" rx="8" fill="#111827" />
        <polygon points="68,42 68,68 92,55" fill={art === 'yt' ? '#ef4444' : '#fff'} />
        {art === 'yt' ? <rect x="30" y="28" width="18" height="8" rx="2" fill="#ef4444" /> : null}
      </svg>
    );
  }
  if (art === 'logo') {
    return (
      <svg viewBox="0 0 160 110" className="create-art">
        <circle cx="80" cy="52" r="28" fill="#2563eb" />
        <path d="M68 58c8-14 16-14 24 0  -8 10-16 10-24 0z" fill="#fff" />
        <circle cx="74" cy="44" r="4" fill="#fff" />
      </svg>
    );
  }
  if (art === 'fb' || art === 'cover' || art === 'linkedin' || art === 'x') {
    const color = art === 'linkedin' ? '#0a66c2' : art === 'x' ? '#111827' : '#1877f2';
    return (
      <svg viewBox="0 0 160 110" className="create-art">
        <rect x="22" y="24" width="116" height="64" rx="8" fill="#fff" />
        <rect x="22" y="24" width="116" height="14" rx="8" fill={color} />
        <rect x="32" y="46" width="70" height="8" rx="2" fill="#e5e7eb" />
        <rect x="32" y="58" width="96" height="18" rx="3" fill="#dbeafe" />
        <circle cx="128" cy="31" r="4" fill="#fff" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 160 110" className="create-art">
      <rect x="40" y="20" width="80" height="70" rx="8" fill="#c4b5fd" />
    </svg>
  );
}

function RatioCard({
  ratio,
  onPick,
}: {
  ratio: CreateRatio;
  onPick: (ratio: CreateRatio) => void;
}) {
  const max = 56;
  const scale = max / Math.max(ratio.width, ratio.height);
  const w = Math.max(10, Math.round(ratio.width * scale));
  const h = Math.max(10, Math.round(ratio.height * scale));
  return (
    <button type="button" className="create-ratio-card" onClick={() => onPick(ratio)}>
      <span className="create-ratio-stage">
        <span
          className="create-ratio-frame"
          style={{ width: w, height: h, borderColor: ratio.tint, background: `${ratio.tint}22` }}
        />
      </span>
      <strong>{ratio.ratio}</strong>
      <small>{ratio.label}</small>
    </button>
  );
}

function ShapeCard({
  shape,
  onPick,
}: {
  shape: CreateShapeVariation;
  onPick: (shape: CreateShapeVariation) => void;
}) {
  return (
    <button type="button" className="create-shape-card" onClick={() => onPick(shape)} title={shape.label}>
      <span className="create-shape-preview">
        <ShapeGlyph variation={shape} />
      </span>
      <small>{shape.label}</small>
    </button>
  );
}

function ShapeGlyph({ variation }: { variation: CreateShapeVariation }) {
  const stroke = variation.outline || variation.shape === 'line' || variation.shape === 'arrow';
  const common = {
    fill: stroke && variation.shape !== 'arrow' ? 'none' : variation.fill,
    stroke: stroke ? variation.fill : 'none',
    strokeWidth: stroke ? 2.4 : 0,
  };
  if (variation.shape === 'ellipse') {
    return (
      <svg viewBox="0 0 48 48">
        <ellipse cx="24" cy="24" rx={variation.label === 'Oval' ? 18 : 13} ry={variation.label === 'Oval' ? 11 : 13} {...common} />
      </svg>
    );
  }
  if (variation.shape === 'triangle') {
    return (
      <svg viewBox="0 0 48 48">
        <path d="M24 8 40 38H8z" {...common} />
      </svg>
    );
  }
  if (variation.shape === 'star') {
    return (
      <svg viewBox="0 0 48 48">
        <path d="M24 6 29 19h13l-10.5 8 4 13L24 32 12.5 40l4-13L6 19h13z" {...common} />
      </svg>
    );
  }
  if (variation.shape === 'polygon') {
    return (
      <svg viewBox="0 0 48 48">
        <path d="M24 6 40 16v16L24 42 8 32V16z" {...common} />
      </svg>
    );
  }
  if (variation.shape === 'arrow') {
    return (
      <svg viewBox="0 0 48 48">
        <path d="M8 22h22v-8l14 10-14 10v-8H8z" fill={variation.fill} />
      </svg>
    );
  }
  if (variation.shape === 'line') {
    return (
      <svg viewBox="0 0 48 48">
        <path d="M8 32 40 16" fill="none" stroke={variation.fill} strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  const r = variation.cornerRadius ? Math.min(10, variation.cornerRadius / 4) : 3;
  return (
    <svg viewBox="0 0 48 48">
      <rect x="10" y="10" width="28" height="28" rx={r} {...common} />
    </svg>
  );
}

function PresetCard({
  preset,
  onPick,
}: {
  preset: CreatePreset;
  onPick: (preset: CreatePreset) => void;
}) {
  return (
    <button type="button" className="create-design-card" onClick={() => onPick(preset)}>
      <div
        className="create-design-thumb"
        style={{
          aspectRatio: `${preset.width} / ${preset.height}`,
          background: preset.previewBg,
        }}
      >
        <i style={{ background: preset.previewAccent }} />
        {preset.kind === 'video' ? <b>Video</b> : null}
      </div>
      <strong>{preset.label}</strong>
      <small>{preset.detail}</small>
    </button>
  );
}

function CategoryGlyph({ id }: { id: CreateCategoryId }) {
  if (id === 'for-you') {
    return (
      <svg viewBox="0 0 24 24">
        <path fill="#8b3dff" d="M12 3l1.2 3.6L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.4z" />
        <path fill="#c4b5fd" d="M18 13l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
      </svg>
    );
  }
  if (id === 'ratios') {
    return (
      <svg viewBox="0 0 24 24">
        <rect x="3" y="8" width="8" height="8" rx="1.5" fill="#2563eb" />
        <rect x="13" y="5" width="8" height="14" rx="1.5" fill="#93c5fd" />
      </svg>
    );
  }
  if (id === 'shapes') {
    return (
      <svg viewBox="0 0 24 24">
        <rect x="3" y="3" width="8" height="8" rx="1.5" fill="#db2777" />
        <circle cx="17" cy="7" r="4" fill="#f472b6" />
        <path d="M7 21 12 13l5 8z" fill="#fb7185" />
      </svg>
    );
  }
  if (id === 'presentations') {
    return (
      <svg viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="12" rx="2" fill="#ea580c" />
        <path d="M8 20h8M12 16v4" stroke="#ea580c" strokeWidth="1.8" fill="none" />
        <path d="M7 13V9h2l2 2 2-3 2 4" stroke="#fff" strokeWidth="1.5" fill="none" />
      </svg>
    );
  }
  if (id === 'social') {
    return (
      <svg viewBox="0 0 24 24">
        <path fill="#e11d48" d="M12 21s-7-4.35-7-10a4.4 4.4 0 0 1 7-3.5A4.4 4.4 0 0 1 19 11c0 5.65-7 10-7 10z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24">
      <rect x="5" y="5" width="14" height="14" rx="3" fill="#94a3b8" />
    </svg>
  );
}
