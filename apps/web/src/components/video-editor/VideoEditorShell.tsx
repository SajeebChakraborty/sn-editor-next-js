/**
 * Video editor chrome: preview, timeline, and side panels.
 * Sidebar visual matches the image editor’s Canva-style two-column rail.
 */
'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { useEffect, useState, type ReactNode } from 'react';
import { useVideoEditorStore, type VideoPanel } from '@/store/videoEditorStore';
import { PreviewPlayer } from './PreviewPlayer';
import { Timeline } from './Timeline';
import { fileToLocalUpload, persistAssetToApi, pickFiles, formatBytes, formatDuration, LARGE_FILE_BYTES, loadImageSize, loadVideoSize } from '@/lib/mediaUpload';
import { exportVideoProjectToDownload, type VideoExportFormat } from '@/lib/videoExport';
import { aspectFromSize, type AspectRatio } from '@sn-editor/video-engine';
import { TextSidePanel } from './TextSidePanel';
import { VideoElementsPanel } from './VideoElementsPanel';
// Hidden for now — Tools / AI
// import { VideoToolsPanel, VideoFloatingToolsBar } from './VideoToolsPanel';
// import { VideoAiPanel } from './VideoAiPanel';
import { VideoTransitionPanel } from './VideoTransitionPanel';
import { VideoFilterPanel } from './VideoFilterPanel';
import { VideoEffectsPanel } from './VideoEffectsPanel';
import { SAMPLE_MUSIC_LIBRARY, getSampleMusicUrl, type SampleMusicGenre } from '@/lib/sampleMusic';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SidePanel3D } from '@/components/SidePanel3D';
import { CreateDesignModal } from '@/components/image-editor/CreateDesignModal';
import { CREATE_VIDEO_ASPECT_KEY, type VideoAspect } from '@/lib/createDesignCatalog';
import { AccountMenu } from '@/components/auth/AccountMenu';
import { PremiumGate } from '@/components/auth/PremiumGate';
import { BrandWordmark } from '@/components/brand/BrandWordmark';

const PANELS: { id: VideoPanel; label: string; icon: ReactNode }[] = [
  {
    id: 'media',
    label: 'Uploads',
    icon: (
      <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          d="M12 16V5m0 0L8 9m4-4 4 4M5 19h14"
        />
      </svg>
    ),
  },
  {
    id: 'elements',
    label: 'Elements',
    icon: (
      <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden>
        <circle cx="9" cy="10" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <rect x="12" y="8" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    id: 'text',
    label: 'Text',
    icon: (
      <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          d="M5 6h14M12 6v12M8 18h8"
        />
      </svg>
    ),
  },
  {
    id: 'audio',
    label: 'Audio',
    icon: (
      <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          d="M9 18V6l10-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm10-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"
        />
      </svg>
    ),
  },
  {
    id: 'align',
    label: 'Align',
    icon: (
      <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          d="M4 6h16M4 12h10M4 18h14"
        />
      </svg>
    ),
  },
  // Hidden for now — Tools
  // {
  //   id: 'tools',
  //   label: 'Tools',
  //   icon: (
  //     <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden>
  //       <path
  //         fill="none"
  //         stroke="currentColor"
  //         strokeWidth="1.6"
  //         strokeLinecap="round"
  //         d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4L15 12l-1.3-1.3 2.7-2.7z"
  //       />
  //     </svg>
  //   ),
  // },
  {
    id: 'effects',
    label: 'Animate',
    icon: (
      <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"
        />
      </svg>
    ),
  },
  {
    id: 'transitions',
    label: 'Transition',
    icon: (
      <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 7h7l3 5-3 5H4l3-5-3-5zm9 0h7l-3 5 3 5h-7l3-5-3-5z"
        />
      </svg>
    ),
  },
  {
    id: 'filters',
    label: 'Filter',
    icon: (
      <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          d="M4 6h16M7 12h10M10 18h4"
        />
      </svg>
    ),
  },
  // Hidden for now — AI
  // {
  //   id: 'ai',
  //   label: 'AI',
  //   icon: (
  //     <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden>
  //       <path
  //         fill="none"
  //         stroke="currentColor"
  //         strokeWidth="1.6"
  //         strokeLinecap="round"
  //         d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0-5v2m0 14v2M4 12H2m20 0h-2"
  //       />
  //     </svg>
  //   ),
  // },
  {
    id: 'layers',
    label: 'Layers',
    icon: (
      <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          d="M12 4 3 9l9 5 9-5-9-5zm-9 8 9 5 9-5M3 16l9 5 9-5"
        />
      </svg>
    ),
  },
  {
    id: 'export',
    label: 'Export',
    icon: (
      <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          d="M12 4v10m0 0 4-4m-4 4-4-4M5 18h14"
        />
      </svg>
    ),
  },
];

function MediaPanel() {
  const addMediaClip = useVideoEditorStore((s) => s.addMediaClip);
  const addPlaceholderClip = useVideoEditorStore((s) => s.addPlaceholderClip);
  const fitToContent = useVideoEditorStore((s) => s.fitToContent);
  const setAspectRatio = useVideoEditorStore((s) => s.setAspectRatio);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const uploadVideo = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const files = await pickFiles({
        accept: 'video/mp4,video/webm,video/quicktime,video/*,image/*',
        multiple: true,
      });
      for (const file of files) {
        const isImage = file.type.startsWith('image/');
        const upload = await fileToLocalUpload(file, isImage ? 'image' : 'video');
        await persistAssetToApi(upload);
        try {
          const size = isImage
            ? await loadImageSize(upload.url)
            : await loadVideoSize(upload.url);
          if (size.width > 0 && size.height > 0) {
            setAspectRatio(aspectFromSize(size.width, size.height));
          }
        } catch {
          /* keep current aspect */
        }
        addMediaClip(
          upload.name,
          upload.durationMs ?? (isImage ? 4000 : 5000),
          isImage ? 'overlay' : 'video',
          upload.url,
        );
        const sizeNote = upload.sizeBytes
          ? ` · ${formatBytes(upload.sizeBytes)}`
          : '';
        const durNote = upload.durationMs
          ? ` · ${formatDuration(upload.durationMs)}`
          : '';
        const largeNote =
          (upload.sizeBytes ?? 0) >= LARGE_FILE_BYTES
            ? ' · large file (local blob, S3 multipart later)'
            : '';
        setStatus(`Added “${upload.name}”${durNote}${sizeNote}${largeNote}`);
      }
      fitToContent();
      if (!files.length) setStatus('No files selected');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-600">Media</h2>
      <button
        type="button"
        className="btn-tool btn-tool-active w-full text-left"
        disabled={busy}
        onClick={() => void uploadVideo()}
      >
        {busy ? 'Reading media…' : 'Upload video / image'}
      </button>
      <button
        type="button"
        className="btn-tool w-full text-left"
        onClick={() => addPlaceholderClip('product')}
      >
        Add empty product clip
      </button>
      <button
        type="button"
        className="btn-tool w-full text-left"
        onClick={() => addPlaceholderClip('broll')}
      >
        Add B-roll (overlay)
      </button>
      <button
        type="button"
        className="btn-tool w-full text-left"
        onClick={() => addPlaceholderClip('logo')}
      >
        Add logo bumper
      </button>
      <p className="text-[11px] text-ink-600">
        Timeline length follows your clips (not a fixed 15s). Supports long / multi-GB videos via
        local blob URLs — metadata only is read at import.
      </p>
      {status && <p className="text-[11px] text-teal-800">{status}</p>}
    </div>
  );
}

function AudioPanel() {
  const addAudioClip = useVideoEditorStore((s) => s.addAudioClip);
  const project = useVideoEditorStore((s) => s.project);
  const selectedClipId = useVideoEditorStore((s) => s.selectedClipId);
  const setSelectedClipId = useVideoEditorStore((s) => s.setSelectedClipId);
  const patchAudio = useVideoEditorStore((s) => s.patchAudio);
  const removeClip = useVideoEditorStore((s) => s.removeClip);
  const seekTo = useVideoEditorStore((s) => s.seekTo);
  const [busy, setBusy] = useState(false);
  const [addingId, setAddingId] = useState<SampleMusicGenre | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const selectedAudio =
    project.audio.find((a) => a.id === selectedClipId) ?? project.audio[0] ?? null;

  const uploadAudio = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const files = await pickFiles({ accept: 'audio/*,.mp3,.wav,.m4a,.ogg,.aac', multiple: true });
      for (const file of files) {
        const upload = await fileToLocalUpload(file, 'music');
        await persistAssetToApi(upload);
        addAudioClip(upload.name, upload.url, upload.durationMs ?? 12_000);
        setStatus(
          `Added “${upload.name}” · ${formatDuration(upload.durationMs ?? 0)} — press Play to hear it`,
        );
      }
      if (!files.length) setStatus('No files selected');
    } finally {
      setBusy(false);
    }
  };

  const addSample = async (genre: SampleMusicGenre) => {
    const track = SAMPLE_MUSIC_LIBRARY.find((t) => t.id === genre);
    if (!track) return;
    setAddingId(genre);
    setStatus(`Preparing “${track.name}”…`);
    try {
      const { url, durationMs } = await getSampleMusicUrl(genre);
      addAudioClip(`${track.name} (${track.genre})`, url, durationMs);
      setStatus(`Added “${track.name}” — press Play to hear it`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not create sample');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="space-y-3 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-600">Audio editor</h2>
      <button
        type="button"
        className="btn-tool btn-tool-active w-full text-left"
        disabled={busy || !!addingId}
        onClick={() => void addSample(SAMPLE_MUSIC_LIBRARY[0]!.id)}
      >
        {addingId === SAMPLE_MUSIC_LIBRARY[0]?.id ? 'Adding…' : 'Add music bed (sample)'}
      </button>
      <button
        type="button"
        className="btn-tool w-full text-left"
        disabled={busy || !!addingId}
        onClick={() => void uploadAudio()}
      >
        {busy ? 'Uploading…' : 'Upload audio file'}
      </button>

      {selectedAudio && (
        <div className="rounded-xl border border-fog-200 bg-fog-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-600">Selected clip</p>
          <p className="mt-1 truncate text-sm font-semibold text-ink-900">{selectedAudio.name}</p>
          <label className="mt-3 block text-[11px] font-semibold text-ink-600">
            Volume {Math.round((selectedAudio.volume ?? 0.85) * 100)}%
            <input
              type="range"
              min={0}
              max={100}
              className="mt-1 w-full"
              value={Math.round((selectedAudio.volume ?? 0.85) * 100)}
              onChange={(e) =>
                patchAudio(selectedAudio.id, { volume: Number(e.target.value) / 100 }, 'Volume')
              }
            />
          </label>
          <label className="mt-2 block text-[11px] font-semibold text-ink-600">
            Label
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-fog-200 bg-white px-2 py-1.5 text-sm"
              value={selectedAudio.label ?? ''}
              placeholder={selectedAudio.name}
              onChange={(e) =>
                patchAudio(selectedAudio.id, { label: e.target.value }, 'Audio label')
              }
            />
          </label>
          <div className="mt-2 flex gap-1">
            <button
              type="button"
              className="btn-tool flex-1"
              onClick={() => seekTo(selectedAudio.startMs)}
            >
              Seek to clip
            </button>
            <button
              type="button"
              className="btn-tool text-red-700"
              onClick={() => removeClip(selectedAudio.id)}
            >
              Remove
            </button>
          </div>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-600">
          Timeline audio
        </p>
        <ul className="space-y-1">
          {project.audio.length === 0 && (
            <li className="text-[11px] text-ink-600">No audio clips yet</li>
          )}
          {project.audio.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className={clsx(
                  'btn-tool w-full justify-between text-left',
                  selectedClipId === a.id && 'btn-tool-active',
                )}
                onClick={() => {
                  setSelectedClipId(a.id);
                  seekTo(a.startMs);
                }}
              >
                <span className="truncate">{a.label?.trim() || a.name}</span>
                <span className="text-[10px] opacity-70">{formatDuration(a.durationMs)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-600">
          Free sample music
        </p>
        <div className="space-y-1.5">
          {SAMPLE_MUSIC_LIBRARY.map((track) => (
            <button
              key={track.id}
              type="button"
              disabled={!!addingId || busy}
              className="btn-tool flex w-full flex-col items-start gap-0.5 !py-2 text-left"
              onClick={() => void addSample(track.id)}
            >
              <span className="font-semibold text-ink-900">
                {addingId === track.id ? 'Adding…' : track.name}
              </span>
              <span className="text-[10px] font-normal text-ink-600">
                {track.genre} · {track.mood} · {Math.round(track.durationMs / 1000)}s · {track.bpm} BPM
              </span>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="btn-tool w-full text-left"
        disabled={!!addingId}
        onClick={() => {
          addAudioClip('Voiceover');
          setStatus('Placeholder VO added — upload an audio file to hear sound');
        }}
      >
        Add voiceover track
      </button>

      <p className="text-[11px] text-ink-600">
        Adjust volume here, then press <strong>Space</strong> or Play — audio follows the playhead.
      </p>
      {status && <p className="text-[11px] text-teal-800">{status}</p>}
    </div>
  );
}

function AlignSidePanel() {
  const alignSelected = useVideoEditorStore((s) => s.alignSelected);
  const selectedClipId = useVideoEditorStore((s) => s.selectedClipId);
  const modes = [
    ['left', 'Left'],
    ['center', 'Center'],
    ['right', 'Right'],
    ['top', 'Top'],
    ['middle', 'Middle'],
    ['bottom', 'Bottom'],
  ] as const;

  return (
    <div className="space-y-3 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-600">Alignment</h2>
      <p className="text-[11px] text-ink-600">
        Select a text, overlay, sticker, or logo on the canvas, then align it on the frame.
      </p>
      {!selectedClipId && (
        <p className="text-[11px] text-amber-800">No clip selected</p>
      )}
      <div className="grid grid-cols-3 gap-1.5">
        {modes.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="btn-tool"
            disabled={!selectedClipId}
            onClick={() => alignSelected(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function EffectsPanel() {
  return <VideoEffectsPanel />;
}

function LayersSidePanel() {
  const project = useVideoEditorStore((s) => s.project);
  const selectedClipId = useVideoEditorStore((s) => s.selectedClipId);
  const setSelectedClipId = useVideoEditorStore((s) => s.setSelectedClipId);
  const toggleTrackMute = useVideoEditorStore((s) => s.toggleTrackMute);
  const toggleTrackLock = useVideoEditorStore((s) => s.toggleTrackLock);
  const toggleTrackVisible = useVideoEditorStore((s) => s.toggleTrackVisible);
  const removeClip = useVideoEditorStore((s) => s.removeClip);
  const seekTo = useVideoEditorStore((s) => s.seekTo);
  const reorderTracks = useVideoEditorStore((s) => s.reorderTracks);
  const addPlaceholderClip = useVideoEditorStore((s) => s.addPlaceholderClip);
  const addMediaClip = useVideoEditorStore((s) => s.addMediaClip);
  const setStatusMessage = useVideoEditorStore((s) => s.setStatusMessage);
  const [dragId, setDragId] = useState<string | null>(null);

  const onDropTrack = (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const ids = project.tracks.map((t) => t.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) {
      setDragId(null);
      return;
    }
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    reorderTracks(next);
    setDragId(null);
  };

  return (
    <div className="space-y-3 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-600">Tracks</h2>
      <p className="text-[11px] text-ink-600">Drag sections to reorder. Lock blocks edits on that track.</p>
      {project.tracks.map((t) => {
        const clips =
          t.kind === 'audio'
            ? project.audio.filter((a) => a.trackId === t.id)
            : t.kind === 'transition' || t.kind === 'effects'
              ? []
              : project.clips.filter((c) => c.trackId === t.id);
        return (
          <div
            key={t.id}
            draggable
            onDragStart={() => setDragId(t.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDropTrack(t.id)}
            className={clsx(
              'rounded-lg border border-fog-200 bg-fog-50 px-3 py-2 text-xs',
              dragId === t.id && 'opacity-60',
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <p className="cursor-grab font-semibold capitalize text-ink-900 active:cursor-grabbing">
                ⋮⋮ {t.name}
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  className={clsx('btn-tool !px-1.5 !py-0.5 text-[10px]', t.visible === false && 'btn-tool-active')}
                  onClick={() => toggleTrackVisible(t.id)}
                >
                  {t.visible === false ? 'Hidden' : 'Show'}
                </button>
                <button
                  type="button"
                  className={clsx('btn-tool !px-1.5 !py-0.5 text-[10px]', t.muted && 'btn-tool-active')}
                  onClick={() => toggleTrackMute(t.id)}
                >
                  {t.muted ? 'Muted' : 'Mute'}
                </button>
                <button
                  type="button"
                  className={clsx('btn-tool !px-1.5 !py-0.5 text-[10px]', t.locked && 'btn-tool-active')}
                  onClick={() => {
                    toggleTrackLock(t.id);
                    setStatusMessage(t.locked ? `${t.name} unlocked` : `${t.name} locked`);
                  }}
                >
                  {t.locked ? 'Locked' : 'Lock'}
                </button>
              </div>
            </div>
            {(t.kind === 'sticker' || t.kind === 'logo') && clips.length === 0 && (
              <button
                type="button"
                className="btn-tool mt-2 w-full text-left text-[10px]"
                onClick={() => {
                  if (t.kind === 'logo') {
                    addPlaceholderClip('logo');
                    setStatusMessage('Logo bumper added');
                  } else {
                    addMediaClip(
                      'Sticker',
                      4000,
                      'sticker',
                      'data:image/svg+xml,' +
                        encodeURIComponent(
                          '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><circle cx="64" cy="64" r="52" fill="#e11d48"/><text x="64" y="74" text-anchor="middle" font-size="42" fill="#fff">★</text></svg>',
                        ),
                    );
                    setStatusMessage('Sticker added — upload more from Elements');
                  }
                }}
              >
                {t.kind === 'logo' ? '+ Add logo bumper' : '+ Add sticker'}
              </button>
            )}
            {t.kind === 'transition' && (
              <p className="mt-1.5 text-[10px] text-ink-600">
                {project.transitions.filter((x) => x.type !== 'none').length} transition(s) — open
                Transition panel
              </p>
            )}
            {t.kind === 'effects' && (
              <p className="mt-1.5 text-[10px] text-ink-600">
                {project.clips.filter((c) => (c.effectIds?.length ?? 0) > 0).length} clip(s) with
                effects — open Effects panel
              </p>
            )}
            <ul className="mt-1.5 space-y-1">
              {t.kind !== 'transition' &&
                t.kind !== 'effects' &&
                clips.length === 0 && <li className="text-ink-600/70">Empty</li>}
              {clips.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between rounded px-1.5 py-1 text-left ${
                      selectedClipId === c.id ? 'bg-teal-700/15 text-teal-900' : 'hover:bg-white'
                    }`}
                    onClick={() => {
                      setSelectedClipId(c.id);
                      seekTo(c.startMs);
                    }}
                  >
                    <span className="truncate font-medium">{c.name}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      className="ml-2 text-[10px] text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeClip(c.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') removeClip(c.id);
                      }}
                    >
                      ✕
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function ExportSidePanel() {
  const project = useVideoEditorStore((s) => s.project);
  const pause = useVideoEditorStore((s) => s.pause);
  const setExportRange = useVideoEditorStore((s) => s.setExportRange);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [format, setFormat] = useState<VideoExportFormat>('webm');

  const exportNow = async () => {
    setBusy(true);
    setStatus('Preparing…');
    setProgress(0);
    pause();
    try {
      if (project.durationMs <= 0 && project.clips.length === 0) {
        throw new Error('Add a video or image clip before exporting');
      }
      const result = await exportVideoProjectToDownload(
        project,
        (p) => {
          setProgress(p.progress);
          setStatus(p.status);
        },
        { format },
      );
      setStatus(`Downloaded ${result.filename}`);
      setProgress(100);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-600">Export</h2>
      <p className="text-[11px] text-ink-600">
        {project.aspectRatio} · {Math.round(project.durationMs / 1000)}s · {project.fps}fps
      </p>
      <label className="block text-[11px] font-semibold text-ink-600">
        Format
        <select
          className="mt-1 w-full rounded-lg border border-fog-200 bg-white px-2 py-1.5 text-sm"
          value={format}
          onChange={(e) => setFormat(e.target.value as VideoExportFormat)}
        >
          <option value="webm">WebM (VP9) — best quality</option>
          <option value="webm-vp8">WebM (VP8) — wider support</option>
          <option value="mp4">MP4 (when browser supports)</option>
        </select>
      </label>
      <div className="flex gap-1">
        <button
          type="button"
          className="btn-tool flex-1 text-[10px]"
          onClick={() => setExportRange(0, project.durationMs)}
        >
          Full length
        </button>
        <button
          type="button"
          className="btn-tool flex-1 text-[10px]"
          onClick={() => {
            const mid = Math.max(1000, Math.floor(project.durationMs / 2));
            setExportRange(0, mid);
          }}
        >
          First half
        </button>
      </div>
      <p className="text-[11px] text-ink-600">
        Bakes music, text, filters, and speed into the file. MP4 falls back to WebM if unsupported.
      </p>
      <button
        type="button"
        className="btn-tool btn-tool-active w-full"
        disabled={busy}
        onClick={() => void exportNow()}
      >
        {busy ? `Exporting ${progress}%` : 'Export Video'}
      </button>
      {status && <p className="text-[11px] text-ink-700">{status}</p>}
    </div>
  );
}

function VideoProjectTitleField() {
  const name = useVideoEditorStore((s) => s.project.meta.name);
  const setProjectName = useVideoEditorStore((s) => s.setProjectName);
  const [text, setText] = useState(name);

  useEffect(() => {
    setText(name);
  }, [name]);

  const commit = () => {
    const next = text.trim() || 'Untitled Ad';
    setText(next);
    if (next !== name) setProjectName(next);
  };

  return (
    <input
      className="canva-topbar-title"
      value={text}
      title="Click to rename this project"
      aria-label="Project name"
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setText(name);
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

export function VideoEditorShell() {
  const activePanel = useVideoEditorStore((s) => s.activePanel);
  const setActivePanel = useVideoEditorStore((s) => s.setActivePanel);
  const project = useVideoEditorStore((s) => s.project);
  const setAspectRatio = useVideoEditorStore((s) => s.setAspectRatio);
  const newProject = useVideoEditorStore((s) => s.newProject);
  const statusMessage = useVideoEditorStore((s) => s.statusMessage);
  const fitToContent = useVideoEditorStore((s) => s.fitToContent);
  const undo = useVideoEditorStore((s) => s.undo);
  const redo = useVideoEditorStore((s) => s.redo);
  const pause = useVideoEditorStore((s) => s.pause);
  const togglePlay = useVideoEditorStore((s) => s.togglePlay);

  const [createOpen, setCreateOpen] = useState(false);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [resizeMenuOpen, setResizeMenuOpen] = useState(false);

  // One-shot: strip legacy padded tails / pin all tracks to frame 0
  useEffect(() => {
    useVideoEditorStore.getState().snapClipsToStart();
    fitToContent();
    try {
      const stored = sessionStorage.getItem(CREATE_VIDEO_ASPECT_KEY);
      if (stored === '9:16' || stored === '1:1' || stored === '16:9') {
        sessionStorage.removeItem(CREATE_VIDEO_ASPECT_KEY);
        newProject();
        setAspectRatio(stored as VideoAspect);
      } else {
        // Ensure default square canvas for new sessions without a create preference
        if (useVideoEditorStore.getState().project.aspectRatio !== '1:1') {
          // keep user aspect if they already changed it after load
        }
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ctrl+Z / Ctrl+Y / Delete / Backspace / Space
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        pause();
        undo();
        return;
      }
      if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        pause();
        redo();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        useVideoEditorStore.getState().rippleDeleteSelected();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, pause, togglePlay]);

  return (
    <div className="editor-shell flex h-screen flex-col overflow-hidden">
      <header className="canva-topbar">
        <div className="canva-topbar-left">
          <BrandWordmark className="font-display px-2 text-lg tracking-tight text-ink-900" />
          <div className="relative">
            <button
              type="button"
              className="canva-topbar-menu"
              title="File"
              onClick={() => {
                setFileMenuOpen((o) => !o);
                setResizeMenuOpen(false);
              }}
            >
              File
            </button>
            {fileMenuOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-fog-200 bg-white p-1 shadow-lg">
                <button
                  type="button"
                  className="btn-tool w-full justify-start"
                  onClick={() => {
                    newProject();
                    setFileMenuOpen(false);
                  }}
                >
                  New project
                </button>
                <button
                  type="button"
                  className="btn-tool w-full justify-start"
                  onClick={() => {
                    setActivePanel('export');
                    setFileMenuOpen(false);
                  }}
                >
                  Export…
                </button>
                <button
                  type="button"
                  className="btn-tool w-full justify-start"
                  onClick={() => {
                    setCreateOpen(true);
                    setFileMenuOpen(false);
                  }}
                >
                  Create design…
                </button>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              className="canva-topbar-menu"
              title="Resize"
              onClick={() => {
                setResizeMenuOpen((o) => !o);
                setFileMenuOpen(false);
              }}
            >
              Resize
            </button>
            {resizeMenuOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-lg border border-fog-200 bg-white p-1 shadow-lg">
                {(['1:1', '9:16', '16:9'] as AspectRatio[]).map((ar) => (
                  <button
                    key={ar}
                    type="button"
                    className={clsx(
                      'btn-tool w-full justify-start',
                      project.aspectRatio === ar && 'btn-tool-active',
                    )}
                    onClick={() => {
                      setAspectRatio(ar);
                      setResizeMenuOpen(false);
                    }}
                  >
                    {ar}
                  </button>
                ))}
                <div className="mt-1 border-t border-fog-200 px-2 py-2">
                  <p className="mb-1 text-[10px] font-semibold uppercase text-ink-600">Custom (W×H)</p>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={64}
                      max={3840}
                      placeholder="W"
                      className="w-16 rounded border border-fog-200 px-1.5 py-1 text-xs"
                      id="custom-canvas-w"
                      defaultValue={
                        /^\d+x\d+$/i.test(String(project.aspectRatio))
                          ? String(project.aspectRatio).split(/x/i)[0]
                          : '1080'
                      }
                    />
                    <span className="text-xs text-ink-600">×</span>
                    <input
                      type="number"
                      min={64}
                      max={3840}
                      placeholder="H"
                      className="w-16 rounded border border-fog-200 px-1.5 py-1 text-xs"
                      id="custom-canvas-h"
                      defaultValue={
                        /^\d+x\d+$/i.test(String(project.aspectRatio))
                          ? String(project.aspectRatio).split(/x/i)[1]
                          : '1080'
                      }
                    />
                    <button
                      type="button"
                      className="btn-tool btn-tool-active !px-2 !py-1 text-[10px]"
                      onClick={() => {
                        const wEl = document.getElementById('custom-canvas-w') as HTMLInputElement | null;
                        const hEl = document.getElementById('custom-canvas-h') as HTMLInputElement | null;
                        const w = Math.max(64, Math.min(3840, Number(wEl?.value || 1080)));
                        const h = Math.max(64, Math.min(3840, Number(hEl?.value || 1080)));
                        setAspectRatio(`${w}x${h}`);
                        setResizeMenuOpen(false);
                      }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            className={clsx(
              'canva-topbar-menu',
              activePanel === 'effects' && 'text-teal-700',
            )}
            onClick={() => setActivePanel('effects')}
          >
            Animate
          </button>
          <button
            type="button"
            className={clsx(
              'canva-topbar-menu',
              activePanel === 'transitions' && 'text-teal-700',
            )}
            onClick={() => setActivePanel('transitions')}
          >
            Transition
          </button>
          <button
            type="button"
            className={clsx(
              'canva-topbar-menu',
              activePanel === 'filters' && 'text-teal-700',
            )}
            onClick={() => setActivePanel('filters')}
          >
            Filter
          </button>
          <VideoProjectTitleField />
          {statusMessage && (
            <span className="hidden max-w-xs truncate text-[11px] text-teal-700 md:inline">
              {statusMessage}
            </span>
          )}
        </div>
        <div className="canva-topbar-center">
          {(['9:16', '1:1', '16:9'] as AspectRatio[]).map((ar) => (
            <button
              key={ar}
              type="button"
              className={project.aspectRatio === ar ? 'btn-tool btn-tool-active' : 'btn-tool'}
              onClick={() => setAspectRatio(ar)}
            >
              {ar}
            </button>
          ))}
          {/^\d+x\d+$/i.test(String(project.aspectRatio)) && (
            <span className="btn-tool btn-tool-active pointer-events-none text-[10px]">
              {project.aspectRatio}
            </span>
          )}
        </div>
        <div className="canva-topbar-right">
          <ThemeToggle />
          <Link href="/editor" className="canva-topbar-share">
            Image Editor
          </Link>
          <AccountMenu />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[72px_280px_1fr]">
        {/* Same Canva-style narrow icon rail as image editor */}
        <aside className="canva-rail flex min-h-0 flex-col items-center overflow-hidden py-3">
          <div className="mb-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-600">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                d="M4 6h6v12H4zM14 6h6v12h-6"
              />
            </svg>
          </div>

          <button
            type="button"
            className="canva-create mb-3 shrink-0"
            aria-label="Create a design"
            title="Create a design"
            onClick={() => setCreateOpen(true)}
          >
            <span className="canva-create-plus">+</span>
            <span className="canva-create-label">Create</span>
          </button>

          <nav className="canva-rail-scroll panel-scroll flex w-full min-h-0 flex-1 flex-col items-stretch gap-0.5 overflow-y-auto overscroll-contain px-1.5 pb-2">
            {PANELS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePanel(p.id)}
                className={clsx(
                  'canva-rail-item',
                  activePanel === p.id && 'canva-rail-item-active',
                )}
              >
                <span className="canva-rail-icon-wrap">{p.icon}</span>
                <span className="canva-rail-label">{p.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <SidePanel3D className="overflow-auto" panelKey={activePanel}>
          <div className="canva-panel-brand px-4 pb-2 pt-4">
            <span className="text-sm font-bold tracking-tight text-ink-900">
              {PANELS.find((p) => p.id === activePanel)?.label ?? 'SN Editor'}
            </span>
          </div>
          <div className="canva-panel-body">
            {activePanel === 'media' && <MediaPanel />}
            {activePanel === 'elements' && <VideoElementsPanel />}
            {activePanel === 'text' && <TextSidePanel />}
            {activePanel === 'audio' && <AudioPanel />}
            {activePanel === 'align' && <AlignSidePanel />}
            {/* Hidden for now — Tools / AI
            {activePanel === 'tools' && <VideoToolsPanel />}
            {activePanel === 'ai' && <VideoAiPanel />}
            */}
            {activePanel === 'effects' && (
              <PremiumGate feature="video.animate" label="Animate">
                <EffectsPanel />
              </PremiumGate>
            )}
            {activePanel === 'transitions' && (
              <PremiumGate feature="video.transitions" label="Transitions">
                <VideoTransitionPanel />
              </PremiumGate>
            )}
            {activePanel === 'filters' && (
              <PremiumGate feature="video.filters" label="Video filters">
                <VideoFilterPanel />
              </PremiumGate>
            )}
            {activePanel === 'layers' && <LayersSidePanel />}
            {activePanel === 'export' && (
              <PremiumGate feature="video.export" label="Video export">
                <ExportSidePanel />
              </PremiumGate>
            )}
          </div>
        </SidePanel3D>

        <section className="flex min-h-0 flex-col overflow-hidden">
          <div className="canva-canvas-well relative flex min-h-0 flex-1 flex-col overflow-hidden p-3">
            <PreviewPlayer />
            {/* Hidden for now — Tools floating bar
            {activePanel === 'tools' && (
              <VideoFloatingToolsBar className="absolute left-6 top-1/2 z-20 -translate-y-1/2" />
            )}
            */}
          </div>
          <div className="h-[min(280px,34vh)] min-h-[220px] shrink-0 border-t border-fog-200 bg-white">
            <Timeline />
          </div>
        </section>
      </div>
      {createOpen ? <CreateDesignModal onClose={() => setCreateOpen(false)} /> : null}
    </div>
  );
}
