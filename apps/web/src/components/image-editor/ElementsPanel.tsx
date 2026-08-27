/**
 * Canva-style Elements panel: search, generate, browse categories.
 * Photos / videos / music open real file pickers; charts & sheets insert canvas content.
 */
'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { createBodyLayer, addLayer } from '@sn-editor/editor-core';
import { useImageEditorStore } from '@/store/imageEditorStore';
import {
  fileToLocalUpload,
  persistAssetToApi,
  pickFiles,
  formatBytes,
} from '@/lib/mediaUpload';
import { stampLayerPage } from '@/lib/pageLayers';
import { DEVICE_MOCKUPS, SHAPE_FRAMES, type FrameMockup } from '@/lib/frameMockups';

type ElementCategory =
  | 'shapes'
  | 'graphics'
  | 'animations'
  | 'photos'
  | 'videos'
  | 'audio'
  | 'charts'
  | 'forms'
  | 'sheets'
  | 'tables'
  | 'frames'
  | 'grids';

const CATEGORIES: {
  id: ElementCategory;
  label: string;
  icon: ReactNode;
  tint: string;
}[] = [
  {
    id: 'shapes',
    label: 'Shapes',
    tint: 'bg-violet-100 text-violet-700',
    icon: (
      <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
        <circle cx="14" cy="18" r="7" fill="currentColor" opacity="0.85" />
        <rect x="20" y="12" width="14" height="14" rx="2" fill="currentColor" />
        <path d="M8 30 L20 30 L14 22 Z" fill="currentColor" opacity="0.7" />
      </svg>
    ),
  },
  {
    id: 'graphics',
    label: 'Graphics',
    tint: 'bg-pink-100 text-pink-700',
    icon: (
      <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
        <circle cx="20" cy="20" r="10" fill="currentColor" opacity="0.25" />
        <path
          d="M20 8c2 4 6 6 6 10a6 6 0 1 1-12 0c0-4 4-6 6-10z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    id: 'animations',
    label: 'Animations',
    tint: 'bg-amber-100 text-amber-700',
    icon: (
      <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
        <circle cx="20" cy="20" r="12" fill="currentColor" opacity="0.2" />
        <circle cx="20" cy="20" r="9" fill="currentColor" opacity="0.35" />
        <circle cx="16" cy="17" r="1.5" fill="currentColor" />
        <path
          d="M22 17h3M15 24c2 2 6 2 8 0"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'photos',
    label: 'Photos',
    tint: 'bg-sky-100 text-sky-700',
    icon: (
      <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
        <rect x="8" y="10" width="24" height="20" rx="3" fill="currentColor" opacity="0.35" />
        <circle cx="15" cy="17" r="2.5" fill="currentColor" />
        <path d="M10 28l7-7 5 5 4-4 6 6" fill="currentColor" opacity="0.8" />
      </svg>
    ),
  },
  {
    id: 'videos',
    label: 'Videos',
    tint: 'bg-rose-100 text-rose-700',
    icon: (
      <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
        <rect x="8" y="11" width="24" height="18" rx="3" fill="currentColor" opacity="0.3" />
        <path d="M17 16v10l9-5z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'audio',
    label: 'Music',
    tint: 'bg-emerald-100 text-emerald-700',
    icon: (
      <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
        <path d="M16 28V12l12-2v16" stroke="currentColor" strokeWidth="2.5" fill="none" />
        <circle cx="14" cy="28" r="3.5" fill="currentColor" />
        <circle cx="26" cy="26" r="3.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'charts',
    label: 'Charts',
    tint: 'bg-indigo-100 text-indigo-700',
    icon: (
      <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
        <path
          d="M8 28h24M10 28V16l6 4 6-8 6 6v10"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  // Hidden for now — Forms
  // {
  //   id: 'forms',
  //   label: 'Forms',
  //   tint: 'bg-teal-100 text-teal-700',
  //   icon: (
  //     <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
  //       <rect x="10" y="10" width="20" height="20" rx="3" fill="currentColor" opacity="0.2" />
  //       <rect x="14" y="15" width="10" height="4" rx="2" fill="currentColor" />
  //       <circle cx="28" cy="17" r="3" fill="currentColor" />
  //     </svg>
  //   ),
  // },
  // Hidden for now — Sheets
  // {
  //   id: 'sheets',
  //   label: 'Sheets',
  //   tint: 'bg-lime-100 text-lime-800',
  //   icon: (
  //     <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
  //       <rect x="10" y="8" width="20" height="24" rx="2" fill="currentColor" opacity="0.25" />
  //       <path d="M14 14h12M14 20h12M14 26h8" stroke="currentColor" strokeWidth="2" />
  //     </svg>
  //   ),
  // },
  {
    id: 'tables',
    label: 'Tables',
    tint: 'bg-cyan-100 text-cyan-800',
    icon: (
      <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
        <rect x="8" y="10" width="24" height="20" rx="2" fill="currentColor" opacity="0.2" />
        <path d="M8 18h24M8 26h24M16 10v20M24 10v20" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: 'frames',
    label: 'Frames',
    tint: 'bg-orange-100 text-orange-700',
    icon: (
      <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
        <circle cx="20" cy="20" r="12" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <rect x="14" y="14" width="12" height="12" rx="1" fill="currentColor" opacity="0.35" />
      </svg>
    ),
  },
  {
    id: 'grids',
    label: 'Grids',
    tint: 'bg-fuchsia-100 text-fuchsia-700',
    icon: (
      <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
        <rect x="8" y="8" width="10" height="10" rx="1.5" fill="currentColor" opacity="0.7" />
        <rect x="22" y="8" width="10" height="10" rx="1.5" fill="currentColor" opacity="0.45" />
        <rect x="8" y="22" width="10" height="10" rx="1.5" fill="currentColor" opacity="0.45" />
        <rect x="22" y="22" width="10" height="10" rx="1.5" fill="currentColor" opacity="0.7" />
      </svg>
    ),
  },
];

const SHAPE_SWATCHES = [
  { id: 'rect', label: 'Square', shape: 'rect' as const, fill: '#7c3aed' },
  { id: 'ellipse', label: 'Circle', shape: 'ellipse' as const, fill: '#db2777' },
  { id: 'triangle', label: 'Triangle', shape: 'triangle' as const, fill: '#0891b2' },
  { id: 'line', label: 'Line', shape: 'line' as const, fill: '#0a1214' },
  { id: 'polygon', label: 'Hexagon', shape: 'polygon' as const, fill: '#6366f1' },
  { id: 'star', label: 'Star', shape: 'star' as const, fill: '#f59e0b' },
  { id: 'arrow', label: 'Arrow', shape: 'arrow' as const, fill: '#0f766e' },
  { id: 'rect-teal', label: 'Bar', shape: 'rect' as const, fill: '#0f766e' },
];

const GRAPHIC_SWATCHES = [
  { id: 'blob', label: 'Blob', shape: 'ellipse' as const, fill: '#f472b6' },
  { id: 'sparkle', label: 'Sparkle', shape: 'star' as const, fill: '#a855f7' },
  { id: 'badge', label: 'Badge', shape: 'polygon' as const, fill: '#f97316' },
  { id: 'leaf', label: 'Leaf', shape: 'ellipse' as const, fill: '#10b981' },
  { id: 'banner', label: 'Banner', shape: 'rect' as const, fill: '#8b5cf6' },
  { id: 'burst', label: 'Burst', shape: 'star' as const, fill: '#ef4444' },
];

const ANIM_SWATCHES = [
  { id: 'pulse', label: 'Pulse', shape: 'ellipse' as const, fill: '#ec4899' },
  { id: 'orbit', label: 'Orbit', shape: 'ellipse' as const, fill: '#38bdf8' },
  { id: 'pop', label: 'Pop', shape: 'star' as const, fill: '#facc15' },
  { id: 'spin', label: 'Spin', shape: 'polygon' as const, fill: '#818cf8' },
];

const FRAME_SWATCHES = [
  { id: 'frame-rect', label: 'Box', shape: 'rect' as const },
  { id: 'frame-round', label: 'Rounded', shape: 'rect' as const, radius: 28 },
  { id: 'frame-circle', label: 'Circle', shape: 'ellipse' as const },
  { id: 'frame-poly', label: 'Hex', shape: 'polygon' as const },
  { id: 'frame-star', label: 'Star', shape: 'star' as const },
  { id: 'frame-tri', label: 'Triangle', shape: 'triangle' as const },
];

type ShapePick = {
  id: string;
  label: string;
  shape: 'rect' | 'ellipse' | 'triangle' | 'line' | 'polygon' | 'star' | 'arrow';
  fill: string;
};

function ShapeGrid({
  title,
  items,
  onPick,
}: {
  title: string;
  items: ShapePick[];
  onPick: (item: ShapePick) => void;
}) {
  return (
    <div className="space-y-2 border-t border-fog-200 pt-3">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-600">{title}</h3>
      <div className="grid grid-cols-3 gap-2">
        {items.map((s) => (
          <button
            key={s.id}
            type="button"
            className="flex flex-col items-center gap-1 rounded-xl border border-fog-200 bg-[var(--sn-editor-panel)] p-2 hover:border-teal-600/40"
            onClick={() => onPick(s)}
          >
            <span
              className="block h-8 w-8"
              style={{
                background: s.shape === 'line' ? 'transparent' : s.fill,
                borderRadius: s.shape === 'ellipse' ? '999px' : s.shape === 'triangle' ? 0 : 6,
                clipPath:
                  s.shape === 'triangle'
                    ? 'polygon(50% 0%, 100% 100%, 0% 100%)'
                    : s.shape === 'star'
                      ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                      : s.shape === 'polygon'
                        ? 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
                        : undefined,
                borderTop: s.shape === 'line' || s.shape === 'arrow' ? `3px solid ${s.fill}` : undefined,
                marginTop: s.shape === 'line' || s.shape === 'arrow' ? 14 : 0,
                height: s.shape === 'line' || s.shape === 'arrow' ? 0 : 32,
                width: 32,
              }}
            />
            <span className="text-[10px] text-ink-600">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ElementsPanel() {
  const addShape = useImageEditorStore((s) => s.addShape);
  const addTable = useImageEditorStore((s) => s.addTable);
  // Hidden for now — Forms / Sheets
  // const addStickyNote = useImageEditorStore((s) => s.addStickyNote);
  const addChart = useImageEditorStore((s) => s.addChart);
  // const addSheet = useImageEditorStore((s) => s.addSheet);
  const addMediaLayer = useImageEditorStore((s) => s.addMediaLayer);
  const addImagePlaceholder = useImageEditorStore((s) => s.addImagePlaceholder);
  const addText = useImageEditorStore((s) => s.addText);
  const updateLayerProps = useImageEditorStore((s) => s.updateLayerProps);
  const updateTransform = useImageEditorStore((s) => s.updateTransform);
  const commit = useImageEditorStore((s) => s.commit);
  const document = useImageEditorStore((s) => s.document);
  const setSelectedIds = useImageEditorStore((s) => s.setSelectedIds);

  const [query, setQuery] = useState('');
  const [active, setActive] = useState<ElementCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.filter((c) => c.label.toLowerCase().includes(q) || c.id.includes(q));
  }, [query]);

  const uploadMedia = async (kind: 'image' | 'video' | 'music') => {
    setBusy(true);
    setStatus(null);
    try {
      const accept =
        kind === 'image'
          ? 'image/*'
          : kind === 'video'
            ? 'video/mp4,video/webm,video/quicktime,video/*'
            : 'audio/*,.mp3,.wav,.m4a,.ogg,.aac';
      const files = await pickFiles({ accept, multiple: true });
      if (!files.length) {
        setStatus('No files selected');
        return;
      }
      for (const file of files) {
        const upload = await fileToLocalUpload(file, kind);
        await persistAssetToApi(upload);
        if (kind === 'music') {
          const d = document();
          const abId = useImageEditorStore.getState().activeArtboardId ?? d.artboards[0]?.id;
          const note = stampLayerPage(createBodyLayer(`♪ ${upload.name}`), abId);
          note.name = 'Music';
          note.textStyle = {
            ...note.textStyle!,
            fontSize: 18,
            fontWeight: 600,
            fill: '#065f46',
          };
          note.transform = {
            ...note.transform,
            x: 80,
            y: 80,
            width: 360,
            height: 40,
          };
          commit(addLayer(d, note));
          setSelectedIds([note.id]);
          setStatus(
            `Music “${upload.name}” saved${upload.sizeBytes ? ` · ${formatBytes(upload.sizeBytes)}` : ''} (marker on canvas; play in Video editor)`,
          );
        } else {
          addMediaLayer({
            name: upload.name,
            src: upload.url,
            kind: kind === 'video' ? 'video' : 'image',
            width: upload.width,
            height: upload.height,
          });
          setStatus(
            `Added “${upload.name}”${upload.sizeBytes ? ` · ${formatBytes(upload.sizeBytes)}` : ''}`,
          );
        }
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const runCategory = (id: ElementCategory) => {
    setActive(id);
    setStatus(`Browse ${CATEGORIES.find((c) => c.id === id)?.label ?? id} — click an item to add it`);
  };

  const insertShape = (
    shape: NonNullable<Parameters<typeof addShape>[0]>,
    fill: string,
    extra?: { stroke?: string; strokeWidth?: number; cornerRadius?: number; name?: string },
  ) => {
    addShape(shape, fill);
    const id = useImageEditorStore.getState().selectedIds[0];
    if (id && extra) updateLayerProps(id, extra);
    setStatus(`Added ${extra?.name ?? shape}`);
  };

  const insertFrame = (
    shape: 'rect' | 'ellipse' | 'polygon' | 'star' | 'triangle',
    extra?: { cornerRadius?: number; name?: string },
  ) => {
    addShape(shape, '#ffffff');
    const id = useImageEditorStore.getState().selectedIds[0];
    if (id) {
      updateLayerProps(id, {
        fill: 'rgba(255,255,255,0.01)',
        stroke: '#111827',
        strokeWidth: 16,
        cornerRadius: extra?.cornerRadius,
        name: extra?.name ?? 'Frame',
      });
    }
    setStatus('Frame added — drop a photo behind it');
  };

  const insertMockup = (mock: FrameMockup) => {
    addMediaLayer({
      name: mock.label,
      src: mock.src,
      kind: 'image',
      width: mock.width,
      height: mock.height,
    });
    const id = useImageEditorStore.getState().selectedIds[0];
    if (id) {
      updateLayerProps(id, { name: mock.label });
      updateTransform(id, { width: mock.width, height: mock.height });
    }
    setStatus(`${mock.label} mockup added — place a photo behind the screen`);
  };

  const generateFromQuery = () => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setStatus('Type what you want (circle, star, table, chart…), then Generate');
      return;
    }
    if (q.includes('circle') || q.includes('ellipse')) insertShape('ellipse', '#db2777');
    else if (q.includes('star')) insertShape('star', '#f59e0b');
    else if (q.includes('triangle')) insertShape('triangle', '#0891b2');
    else if (q.includes('line')) insertShape('line', '#0a1214');
    else if (q.includes('arrow')) insertShape('arrow', '#0f766e');
    else if (q.includes('hex') || q.includes('polygon')) insertShape('polygon', '#6366f1');
    else if (q.includes('table')) {
      addTable(3, 3);
      setStatus('Table added');
    } else if (q.includes('chart')) {
      addChart();
      setStatus('Chart added');
    // Hidden for now — Forms / Sheets search shortcuts
    // } else if (q.includes('sheet')) {
    //   addSheet();
    //   setStatus('Sheet added');
    // } else if (q.includes('note') || q.includes('form') || q.includes('button')) {
    //   addStickyNote();
    //   setStatus('Form element added');
    } else if (q.includes('phone') || q.includes('smartphone') || q.includes('mobile')) {
      const phone = DEVICE_MOCKUPS.find((m) => m.id === 'phone');
      if (phone) insertMockup(phone);
    } else if (q.includes('laptop') || q.includes('macbook')) {
      const laptop = DEVICE_MOCKUPS.find((m) => m.id === 'laptop');
      if (laptop) insertMockup(laptop);
    } else if (q.includes('tablet') || q.includes('ipad')) {
      const tablet = DEVICE_MOCKUPS.find((m) => m.id === 'tablet');
      if (tablet) insertMockup(tablet);
    } else if (q.includes('frame') || q.includes('polaroid')) {
      const frame = SHAPE_FRAMES.find((m) => m.id === 'polaroid');
      if (frame) insertMockup(frame);
    } else if (q.includes('photo') || q.includes('image')) {
      addImagePlaceholder();
      setStatus('Photo placeholder added');
    } else if (q.includes('grid')) {
      addTable(2, 2);
      setStatus('Grid added');
    } else {
      addText('body');
      const id = useImageEditorStore.getState().selectedIds[0];
      if (id) {
        const { updateTextContent } = useImageEditorStore.getState();
        updateTextContent(id, query.trim());
      }
      setStatus(`Added text “${query.trim()}”`);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-600">Elements</h2>

      <div className="flex gap-1.5">
        <div className="relative min-w-0 flex-1">
          <input
            type="search"
            className="w-full rounded-lg border border-fog-200 bg-[var(--sn-editor-panel)] py-2 pl-2.5 pr-8 text-xs text-ink-800 placeholder:text-ink-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                generateFromQuery();
              }
            }}
            placeholder="Describe your ideal element"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query.trim().length > 0 && (
            <button
              type="button"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-xs font-bold text-ink-600 hover:bg-fog-100 hover:text-ink-900"
              title="Clear search"
              aria-label="Clear search"
              onClick={() => setQuery('')}
            >
              ×
            </button>
          )}
        </div>
        <button
          type="button"
          className="rounded-lg bg-teal-700 px-3 text-xs font-semibold text-white hover:bg-teal-800"
          onClick={generateFromQuery}
        >
          Search
        </button>
      </div>

      <button
        type="button"
        className="btn-tool flex w-full items-center gap-2 text-left"
        onClick={generateFromQuery}
      >
        <span aria-hidden>✧</span>
        Generate
      </button>

      {!active && (
        <div>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-600">
            Browse categories
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {filtered.map((cat) => (
              <button
                key={cat.id}
                type="button"
                disabled={busy}
                onClick={() => runCategory(cat.id)}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-fog-200 bg-[var(--sn-editor-panel)] p-2.5 text-center hover:border-teal-600/40 hover:shadow-sm disabled:opacity-60"
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${cat.tint}`}>
                  {cat.icon}
                </span>
                <span className="text-[11px] font-medium text-ink-800">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {active && (
        <button
          type="button"
          className="btn-tool w-full text-left"
          onClick={() => {
            setActive(null);
            setStatus(null);
          }}
        >
          ← {CATEGORIES.find((c) => c.id === active)?.label ?? 'All categories'}
        </button>
      )}

      {(active === 'photos' || active === 'videos' || active === 'audio') && (
        <div className="space-y-2 rounded-xl border border-fog-200 bg-[var(--sn-editor-panel)] p-3">
          <p className="text-[11px] font-semibold text-ink-800">
            {active === 'audio'
              ? 'Upload music'
              : active === 'videos'
                ? 'Upload video'
                : 'Upload photo'}
          </p>
          {active === 'photos' && (
            <button
              type="button"
              className="btn-tool w-full text-left"
              onClick={() => {
                addImagePlaceholder();
                setStatus('Photo placeholder added');
              }}
            >
              Add photo placeholder
            </button>
          )}
          {active === 'videos' && (
            <button
              type="button"
              className="btn-tool w-full text-left"
              onClick={() =>
                insertShape('rect', '#111827', { cornerRadius: 12, name: 'Video' })
              }
            >
              Add video placeholder
            </button>
          )}
          <button
            type="button"
            className="btn-tool btn-tool-active w-full text-left"
            disabled={busy}
            onClick={() =>
              void uploadMedia(
                active === 'audio' ? 'music' : active === 'videos' ? 'video' : 'image',
              )
            }
          >
            {busy
              ? 'Uploading…'
              : active === 'audio'
                ? 'Choose audio files'
                : active === 'videos'
                  ? 'Choose video files'
                  : 'Choose image files'}
          </button>
        </div>
      )}

      {(active === 'shapes' || active === null) && (
        <ShapeGrid
          title={active === 'shapes' ? 'Click a shape to add it' : 'Suggested shapes'}
          items={SHAPE_SWATCHES}
          onPick={(s) => insertShape(s.shape, s.fill, { name: s.label })}
        />
      )}

      {active === 'graphics' && (
        <ShapeGrid
          title="Graphics"
          items={GRAPHIC_SWATCHES}
          onPick={(s) => insertShape(s.shape, s.fill, { name: s.label })}
        />
      )}

      {active === 'animations' && (
        <ShapeGrid
          title="Animations"
          items={ANIM_SWATCHES}
          onPick={(s) => insertShape(s.shape, s.fill, { name: s.label })}
        />
      )}

      {active === 'frames' && (
        <div className="space-y-4 border-t border-fog-200 pt-3">
          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-600">
              Devices
            </h3>
            <p className="text-[10px] text-ink-500">
              Smartphone, tablet, laptop & more — place a photo behind the screen area.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DEVICE_MOCKUPS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="flex flex-col items-center gap-1 rounded-xl border border-fog-200 bg-[var(--sn-editor-panel)] p-2 hover:border-teal-600/40"
                  onClick={() => insertMockup(m)}
                >
                  <span
                    className="block h-12 w-10 rounded-md border border-fog-200 shadow-sm"
                    style={{
                      background: m.preview,
                      aspectRatio: `${m.width} / ${m.height}`,
                      width: m.id.includes('laptop') || m.id === 'monitor' ? 44 : 32,
                      height: m.id.includes('laptop') || m.id === 'monitor' ? 30 : 48,
                    }}
                  />
                  <span className="text-[10px] text-ink-600">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-600">
              Shape frames
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {SHAPE_FRAMES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="flex flex-col items-center gap-1 rounded-xl border border-fog-200 bg-[var(--sn-editor-panel)] p-2 hover:border-teal-600/40"
                  onClick={() => insertMockup(m)}
                >
                  <span
                    className="block h-10 w-10 rounded-md border border-fog-200"
                    style={{
                      background: m.preview,
                      borderRadius:
                        m.id === 'gold-circle' || m.id === 'heart'
                          ? '999px'
                          : m.id === 'star-frame'
                            ? 4
                            : 6,
                      clipPath:
                        m.id === 'star-frame'
                          ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                          : m.id === 'heart'
                            ? 'path("M12 21C4 14 2 8 6 4.5C8 3 10.5 4 12 7C13.5 4 16 3 18 4.5C22 8 20 14 12 21Z")'
                            : undefined,
                    }}
                  />
                  <span className="text-[10px] text-ink-600">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-600">
              Outline frames
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {FRAME_SWATCHES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="flex flex-col items-center gap-1 rounded-xl border border-fog-200 bg-[var(--sn-editor-panel)] p-2 hover:border-teal-600/40"
                  onClick={() =>
                    insertFrame(s.shape, { cornerRadius: s.radius, name: s.label })
                  }
                >
                  <span
                    className="block h-8 w-8 border-[3px] border-ink-800"
                    style={{
                      borderRadius:
                        s.shape === 'ellipse' ? '999px' : s.radius ? 8 : 4,
                      clipPath:
                        s.shape === 'polygon'
                          ? 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
                          : s.shape === 'star'
                            ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                            : s.shape === 'triangle'
                              ? 'polygon(50% 0%, 100% 100%, 0% 100%)'
                              : undefined,
                    }}
                  />
                  <span className="text-[10px] text-ink-600">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {active === 'charts' && (
        <div className="space-y-2 rounded-xl border border-fog-200 bg-[var(--sn-editor-panel)] p-3">
          <p className="text-[11px] font-semibold text-ink-800">Charts</p>
          <button
            type="button"
            className="btn-tool w-full text-left"
            onClick={() => {
              addChart();
              setStatus('Bar chart added');
            }}
          >
            Add bar chart
          </button>
        </div>
      )}

      {/* Hidden for now — Sheets
      {active === 'sheets' && (
        <div className="space-y-2 rounded-xl border border-fog-200 bg-[var(--sn-editor-panel)] p-3">
          <p className="text-[11px] font-semibold text-ink-800">Sheets</p>
          <button
            type="button"
            className="btn-tool w-full text-left"
            onClick={() => {
              addSheet();
              setStatus('Sheet added');
            }}
          >
            Add spreadsheet
          </button>
        </div>
      )}
      */}

      {(active === 'tables' || active === 'grids') && (
        <div className="space-y-2 rounded-xl border border-fog-200 bg-[var(--sn-editor-panel)] p-3">
          <p className="text-[11px] font-semibold text-ink-800">
            {active === 'grids' ? 'Grids' : 'Tables'}
          </p>
          {(active === 'grids' ? [2, 3] : [2, 3, 4]).map((n) => (
            <button
              key={n}
              type="button"
              className="btn-tool w-full text-left"
              onClick={() => {
                addTable(n, n);
                setStatus(`${n}×${n} ${active === 'grids' ? 'grid' : 'table'} added`);
              }}
            >
              Add {n}×{n} {active === 'grids' ? 'grid' : 'table'}
            </button>
          ))}
        </div>
      )}

      {/* Hidden for now — Forms
      {active === 'forms' && (
        <div className="space-y-2 rounded-xl border border-fog-200 bg-[var(--sn-editor-panel)] p-3">
          <p className="text-[11px] font-semibold text-ink-800">Forms</p>
          <button
            type="button"
            className="btn-tool w-full text-left"
            onClick={() => {
              addStickyNote();
              setStatus('Sticky note added');
            }}
          >
            Sticky note
          </button>
          <button
            type="button"
            className="btn-tool w-full text-left"
            onClick={() => insertShape('rect', '#8b3dff', { cornerRadius: 10, name: 'Button' })}
          >
            Button
          </button>
          <button
            type="button"
            className="btn-tool w-full text-left"
            onClick={() =>
              insertShape('rect', '#ffffff', {
                stroke: '#94a3b8',
                strokeWidth: 2,
                cornerRadius: 8,
                name: 'Input',
              })
            }
          >
            Input field
          </button>
        </div>
      )}
      */}

      {status && <p className="text-[11px] text-teal-800">{status}</p>}
      {busy && <p className="text-[11px] text-ink-600">Working…</p>}
    </div>
  );
}
