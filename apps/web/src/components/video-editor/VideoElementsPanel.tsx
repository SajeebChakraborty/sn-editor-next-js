/**
 * Canva-style Elements panel for the video editor.
 * Photos / videos / music open real uploads; charts & sheets add timeline text overlays.
 */
'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useVideoEditorStore } from '@/store/videoEditorStore';
import {
  fileToLocalUpload,
  persistAssetToApi,
  pickFiles,
  formatBytes,
  formatDuration,
} from '@/lib/mediaUpload';

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

const CATEGORIES: { id: ElementCategory; label: string; tint: string; icon: ReactNode }[] = [
  {
    id: 'shapes',
    label: 'Shapes',
    tint: 'bg-violet-100 text-violet-700',
    icon: (
      <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
        <circle cx="14" cy="18" r="7" fill="currentColor" opacity="0.85" />
        <rect x="20" y="12" width="14" height="14" rx="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'graphics',
    label: 'Graphics',
    tint: 'bg-pink-100 text-pink-700',
    icon: (
      <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
        <path d="M20 8c2 4 6 6 6 10a6 6 0 1 1-12 0c0-4 4-6 6-10z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'animations',
    label: 'Animations',
    tint: 'bg-amber-100 text-amber-700',
    icon: (
      <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
        <circle cx="20" cy="20" r="10" fill="currentColor" opacity="0.35" />
        <path d="M15 24c2 2 6 2 8 0" stroke="currentColor" strokeWidth="2" fill="none" />
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
      </svg>
    ),
  },
  {
    id: 'videos',
    label: 'Videos',
    tint: 'bg-rose-100 text-rose-700',
    icon: (
      <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
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
        <path d="M10 28V16l6 4 6-8 6 6v10" stroke="currentColor" strokeWidth="2.5" fill="none" />
      </svg>
    ),
  },
  {
    id: 'forms',
    label: 'Forms',
    tint: 'bg-teal-100 text-teal-700',
    icon: (
      <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
        <rect x="14" y="15" width="10" height="4" rx="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'sheets',
    label: 'Sheets',
    tint: 'bg-lime-100 text-lime-800',
    icon: (
      <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
        <path d="M14 14h12M14 20h12M14 26h8" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: 'tables',
    label: 'Tables',
    tint: 'bg-cyan-100 text-cyan-800',
    icon: (
      <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
        <path d="M8 18h24M16 10v20" stroke="currentColor" strokeWidth="2" />
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
        <rect x="22" y="22" width="10" height="10" rx="1.5" fill="currentColor" opacity="0.7" />
      </svg>
    ),
  },
];

export function VideoElementsPanel() {
  const addTextClip = useVideoEditorStore((s) => s.addTextClip);
  const addMediaClip = useVideoEditorStore((s) => s.addMediaClip);
  const addAudioClip = useVideoEditorStore((s) => s.addAudioClip);
  const fitToContent = useVideoEditorStore((s) => s.fitToContent);
  const setActivePanel = useVideoEditorStore((s) => s.setActivePanel);

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
          addAudioClip(upload.name, upload.url, upload.durationMs ?? 12_000);
          setStatus(
            `Music “${upload.name}” added${upload.durationMs ? ` · ${formatDuration(upload.durationMs)}` : ''}`,
          );
        } else {
          if (kind === 'video' && upload.width && upload.height) {
            const { aspectFromSize } = await import('@sn-editor/video-engine');
            useVideoEditorStore.getState().setAspectRatio(
              aspectFromSize(upload.width, upload.height),
            );
          }
          addMediaClip(
            upload.name,
            upload.durationMs ?? (kind === 'image' ? 4000 : 5000),
            kind === 'image' ? 'overlay' : 'video',
            upload.url,
          );
          setStatus(
            `Added “${upload.name}”${upload.sizeBytes ? ` · ${formatBytes(upload.sizeBytes)}` : ''}`,
          );
        }
      }
      fitToContent();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const runCategory = (id: ElementCategory) => {
    setActive(id);
    setStatus(null);
    if (id === 'photos' || id === 'frames') {
      void uploadMedia('image');
      return;
    }
    if (id === 'videos') {
      void uploadMedia('video');
      return;
    }
    if (id === 'audio') {
      void uploadMedia('music');
      return;
    }
    if (id === 'charts') {
      addTextClip('▁▂▃▅▇ Chart', { fontSize: 36, fontWeight: 700, align: 'center' });
      setStatus('Chart overlay added');
      return;
    }
    if (id === 'sheets' || id === 'tables') {
      addTextClip('A | B | C | D\n1 |  — | — | —', {
        fontSize: 20,
        fontWeight: 500,
        align: 'left',
      });
      setStatus(id === 'sheets' ? 'Sheet overlay added' : 'Table overlay added');
      return;
    }
    if (id === 'grids') {
      addTextClip('▦ Grid', { fontSize: 40, fontWeight: 700, align: 'center' });
      return;
    }
    if (id === 'shapes' || id === 'graphics' || id === 'animations') {
      const stickerSvg =
        id === 'shapes'
          ? '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="16" fill="#0f766e"/></svg>'
          : id === 'animations'
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><circle cx="64" cy="64" r="48" fill="#8b5cf6"/><text x="64" y="78" text-anchor="middle" font-size="48" fill="#fff">✦</text></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><circle cx="64" cy="64" r="52" fill="#e11d48"/><text x="64" y="78" text-anchor="middle" font-size="48" fill="#fff">★</text></svg>';
      addMediaClip(
        id === 'shapes' ? 'Shape' : id === 'animations' ? 'Animation' : 'Sticker',
        4000,
        'sticker',
        `data:image/svg+xml,${encodeURIComponent(stickerSvg)}`,
      );
      setStatus(`${id} added to Sticker track`);
      return;
    }
    if (id === 'forms') {
      addTextClip('☐ Form field', { fontSize: 24, fontWeight: 500 });
    }
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-600">Elements</h2>
      <div className="flex gap-1.5">
        <input
          type="search"
          className="min-w-0 flex-1 rounded-lg border border-fog-200 bg-white px-2.5 py-2 text-xs"
          placeholder="Describe your ideal element"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" className="rounded-lg bg-teal-700 px-3 text-xs font-semibold text-white">
          Search
        </button>
      </div>
      <button
        type="button"
        className="btn-tool flex w-full items-center gap-2 text-left"
        onClick={() => setActivePanel('ai')}
      >
        <span aria-hidden>✧</span>
        Generate
      </button>
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-600">
        Browse categories
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {filtered.map((cat) => (
          <button
            key={cat.id}
            type="button"
            disabled={busy}
            onClick={() => runCategory(cat.id)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border border-fog-200 bg-white p-2.5 hover:border-teal-600/40 disabled:opacity-60 ${
              active === cat.id ? 'border-teal-600 ring-1 ring-teal-600/30' : ''
            }`}
          >
            <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${cat.tint}`}>
              {cat.icon}
            </span>
            <span className="text-[11px] font-medium text-ink-800">{cat.label}</span>
          </button>
        ))}
      </div>

      {(active === 'photos' || active === 'videos' || active === 'audio' || active === 'frames') && (
        <div className="space-y-2 rounded-xl border border-fog-200 bg-fog-50 p-3">
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
                ? 'Choose music files'
                : active === 'videos'
                  ? 'Choose video files'
                  : 'Choose photo files'}
          </button>
        </div>
      )}

      {status && <p className="text-[11px] text-teal-800">{status}</p>}
    </div>
  );
}
