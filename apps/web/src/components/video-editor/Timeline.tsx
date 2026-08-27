/**
 * Multi-track timeline with drag-resize trim handles, undo-aware edits.
 * Track order: Video → Audio → others so music stays visible.
 */
'use client';

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { msToPx, pxToMs } from '@sn-editor/video-engine';
import { useVideoEditorStore } from '@/store/videoEditorStore';
import {
  fileToLocalUpload,
  persistAssetToApi,
  pickFiles,
  formatDuration,
} from '@/lib/mediaUpload';
import { isFxDragEvent, readFxDragData, endFxDrag } from '@/lib/fxDragDrop';
import { ClipFxDurationBars } from './ClipFxDurationBars';

const TRACK_LABEL_WIDTH = 88;
const TRACK_ORDER = [
  'video',
  'audio',
  'overlay',
  'text',
  'sticker',
  'logo',
  'transition',
  'effects',
] as const;

const TRACK_COLORS: Record<string, string> = {
  video: '#0f766e',
  overlay: '#1e3a45',
  text: '#f59e0b',
  sticker: '#e11d48',
  logo: '#14b8a6',
  audio: '#2a4f5c',
  transition: '#8b5cf6',
  effects: '#ec4899',
};

function tickEveryMsFor(durationMs: number): number {
  const steps = [
    1_000, 2_000, 5_000, 10_000, 30_000, 60_000, 120_000, 300_000, 600_000, 1_800_000, 3_600_000,
  ];
  const target = Math.max(1_000, durationMs / 12);
  return steps.find((s) => s >= target) ?? 3_600_000;
}

type TimelineItem = {
  id: string;
  name: string;
  startMs: number;
  durationMs: number;
  trackId: string;
  kind: string;
};

function TimelineMetaBlock({
  kind,
  id,
  label,
  startMs,
  durationMs,
  pxPerSecond,
  color,
  onSelect,
  onCommit,
}: {
  kind: 'transition' | 'effects';
  id: string;
  label: string;
  startMs: number;
  durationMs: number;
  pxPerSecond: number;
  color: string;
  onSelect: () => void;
  onCommit: (startMs: number, durationMs: number) => void;
}) {
  const dragRef = useRef<{
    mode: 'move' | 'start' | 'end';
    originX: number;
    startMs: number;
    durationMs: number;
  } | null>(null);
  const draftRef = useRef<{ startMs: number; durationMs: number } | null>(null);
  const [draft, setDraft] = useState<{ startMs: number; durationMs: number } | null>(null);

  const s = draft?.startMs ?? startMs;
  const d = draft?.durationMs ?? durationMs;
  const left = msToPx(s, pxPerSecond);
  const w = Math.max(20, msToPx(d, pxPerSecond));

  const updateDraft = (next: { startMs: number; durationMs: number }) => {
    draftRef.current = next;
    setDraft(next);
  };

  const onPointerDown =
    (mode: 'move' | 'start' | 'end') => (e: ReactPointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onSelect();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        mode,
        originX: e.clientX,
        startMs,
        durationMs,
      };
      updateDraft({ startMs, durationMs });
    };

  const onPointerMove = (e: ReactPointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dMs = pxToMs(e.clientX - drag.originX, pxPerSecond);
    if (drag.mode === 'move') {
      updateDraft({
        startMs: Math.max(0, Math.round(drag.startMs + dMs)),
        durationMs: drag.durationMs,
      });
    } else if (drag.mode === 'start') {
      const newStart = Math.max(0, Math.round(drag.startMs + dMs));
      const maxStart = drag.startMs + drag.durationMs - 200;
      const nextStart = Math.min(newStart, maxStart);
      updateDraft({
        startMs: nextStart,
        durationMs: drag.startMs + drag.durationMs - nextStart,
      });
    } else {
      updateDraft({
        startMs: drag.startMs,
        durationMs: Math.max(200, Math.round(drag.durationMs + dMs)),
      });
    }
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const drag = dragRef.current;
    const final = draftRef.current;
    dragRef.current = null;
    draftRef.current = null;
    setDraft(null);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (!drag || !final) return;
    if (
      Math.abs(final.startMs - startMs) < 1 &&
      Math.abs(final.durationMs - durationMs) < 1
    ) {
      return;
    }
    onCommit(final.startMs, final.durationMs);
  };

  return (
    <div
      className="absolute top-1 z-[5] flex h-8 select-none items-stretch overflow-hidden rounded-md text-[10px] font-semibold text-white shadow-sm"
      style={{ left, width: w, background: color }}
      title={`${kind}: drag to change start · edges to resize`}
      onClick={(e) => e.stopPropagation()}
    >
      <span
        className="w-2 shrink-0 cursor-ew-resize bg-black/25 hover:bg-black/40"
        onPointerDown={onPointerDown('start')}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      <button
        type="button"
        className="min-w-0 flex-1 cursor-grab truncate px-1.5 text-left active:cursor-grabbing"
        onPointerDown={onPointerDown('move')}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {label}
      </button>
      <span
        className="w-2 shrink-0 cursor-ew-resize bg-black/25 hover:bg-black/40"
        onPointerDown={onPointerDown('end')}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
    </div>
  );
}

function TimelineClipBlock({
  clip,
  selected,
  pxPerSecond,
  onSelect,
}: {
  clip: TimelineItem;
  selected: boolean;
  pxPerSecond: number;
  onSelect: () => void;
}) {
  const trimClipById = useVideoEditorStore((s) => s.trimClipById);
  const moveClipById = useVideoEditorStore((s) => s.moveClipById);
  const applyFxToClip = useVideoEditorStore((s) => s.applyFxToClip);
  const setActivePanel = useVideoEditorStore((s) => s.setActivePanel);
  const [dropActive, setDropActive] = useState(false);
  const dragRef = useRef<{
    mode: 'move' | 'start' | 'end';
    originX: number;
    startMs: number;
    durationMs: number;
  } | null>(null);
  const draftRef = useRef<{ startMs: number; durationMs: number } | null>(null);
  const [draft, setDraft] = useState<{ startMs: number; durationMs: number } | null>(null);

  const startMs = draft?.startMs ?? clip.startMs;
  const durationMs = draft?.durationMs ?? clip.durationMs;
  const left = msToPx(startMs, pxPerSecond);
  const w = Math.max(16, msToPx(durationMs, pxPerSecond));

  const updateDraft = (next: { startMs: number; durationMs: number }) => {
    draftRef.current = next;
    setDraft(next);
  };

  const onPointerDown = useCallback(
    (mode: 'move' | 'start' | 'end') => (e: ReactPointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const state = useVideoEditorStore.getState();
      const track = state.project.tracks.find((t) => t.id === clip.trackId);
      if (track?.locked) {
        state.setStatusMessage('Track is locked — unlock it in Layers');
        onSelect();
        return;
      }
      onSelect();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        mode,
        originX: e.clientX,
        startMs: clip.startMs,
        durationMs: clip.durationMs,
      };
      updateDraft({ startMs: clip.startMs, durationMs: clip.durationMs });
    },
    [clip.startMs, clip.durationMs, clip.trackId, onSelect],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.originX;
      const dMs = pxToMs(dx, pxPerSecond);
      if (drag.mode === 'move') {
        updateDraft({
          startMs: Math.max(0, Math.round(drag.startMs + dMs)),
          durationMs: drag.durationMs,
        });
      } else if (drag.mode === 'start') {
        const newStart = Math.max(0, Math.round(drag.startMs + dMs));
        const maxStart = drag.startMs + drag.durationMs - 200;
        const start = Math.min(newStart, maxStart);
        updateDraft({
          startMs: start,
          durationMs: drag.startMs + drag.durationMs - start,
        });
      } else {
        const newDur = Math.max(200, Math.round(drag.durationMs + dMs));
        updateDraft({ startMs: drag.startMs, durationMs: newDur });
      }
    },
    [pxPerSecond],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent) => {
      const drag = dragRef.current;
      const final = draftRef.current;
      dragRef.current = null;
      draftRef.current = null;
      setDraft(null);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      if (!drag || !final) return;
      if (drag.mode === 'move') {
        moveClipById(clip.id, final.startMs);
      } else if (drag.mode === 'start') {
        trimClipById(clip.id, 'start', final.startMs);
      } else {
        trimClipById(clip.id, 'end', final.startMs + final.durationMs);
      }
    },
    [clip.id, moveClipById, trimClipById],
  );

  return (
    <div
      data-clip-id={clip.id}
      className={`absolute top-1 h-8 overflow-visible rounded-md text-left text-[10px] font-semibold text-white ${
        dropActive ? 'ring-2 ring-amber-300 ring-offset-1 scale-[1.02]' : ''
      }`}
      style={{
        left,
        width: w,
        background: TRACK_COLORS[clip.kind] ?? '#152830',
        outline: selected ? '2px solid var(--sn-editor-accent)' : undefined,
        outlineOffset: 1,
        zIndex: selected ? 5 : 1,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDragEnter={(e) => {
        if (!isFxDragEvent(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation();
        setDropActive(true);
      }}
      onDragOver={(e) => {
        if (!isFxDragEvent(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        setDropActive(true);
      }}
      onDragLeave={(e) => {
        // Only clear when leaving the clip (not entering a child)
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDropActive(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDropActive(false);
        const payload = readFxDragData(e.dataTransfer);
        endFxDrag();
        if (!payload) return;
        applyFxToClip(clip.id, payload.kind, payload.id);
        if (payload.kind === 'effect') setActivePanel('effects');
        else if (payload.kind === 'transition') setActivePanel('transitions');
        else setActivePanel('filters');
      }}
    >
      <div
        className="absolute inset-y-0 cursor-grab active:cursor-grabbing"
        style={{ left: 8, right: 8 }}
        onPointerDown={onPointerDown('move')}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className="pointer-events-none block truncate px-1 pt-1.5">{clip.name}</span>
      </div>
      {clip.kind === 'video' || clip.kind === 'overlay' ? (
        <ClipFxDurationBars
          clipId={clip.id}
          clipDurationMs={durationMs}
          pxPerSecond={pxPerSecond}
        />
      ) : null}
      <div
        className="absolute inset-y-0 left-0 z-10 w-2 cursor-ew-resize rounded-l-md bg-white/25 hover:bg-teal-300/80"
        title="Drag to trim start / resize"
        onPointerDown={onPointerDown('start')}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      <div
        className="absolute inset-y-0 right-0 z-10 w-2 cursor-ew-resize rounded-r-md bg-white/25 hover:bg-teal-300/80"
        title="Drag to trim end / resize"
        onPointerDown={onPointerDown('end')}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
    </div>
  );
}

export function Timeline() {
  const project = useVideoEditorStore((s) => s.project);
  const clock = useVideoEditorStore((s) => s.clock);
  const selectedClipId = useVideoEditorStore((s) => s.selectedClipId);
  const setSelectedClipId = useVideoEditorStore((s) => s.setSelectedClipId);
  const seekTo = useVideoEditorStore((s) => s.seekTo);
  const splitAtPlayhead = useVideoEditorStore((s) => s.splitAtPlayhead);
  const trimSelected = useVideoEditorStore((s) => s.trimSelected);
  const rippleDeleteSelected = useVideoEditorStore((s) => s.rippleDeleteSelected);
  const zoomTimeline = useVideoEditorStore((s) => s.zoomTimeline);
  const moveSelected = useVideoEditorStore((s) => s.moveSelected);
  const snapClipsToStart = useVideoEditorStore((s) => s.snapClipsToStart);
  const fitToContent = useVideoEditorStore((s) => s.fitToContent);
  const undo = useVideoEditorStore((s) => s.undo);
  const redo = useVideoEditorStore((s) => s.redo);
  const canUndo = useVideoEditorStore((s) => s.canUndo);
  const canRedo = useVideoEditorStore((s) => s.canRedo);
  const statusMessage = useVideoEditorStore((s) => s.statusMessage);
  const setActivePanel = useVideoEditorStore((s) => s.setActivePanel);
  const addMediaClip = useVideoEditorStore((s) => s.addMediaClip);
  const setStatusMessage = useVideoEditorStore((s) => s.setStatusMessage);
  const [uploading, setUploading] = useState(false);

  const uploadVideoAtEnd = async () => {
    if (uploading) return;
    setUploading(true);
    try {
      const files = await pickFiles({
        accept: 'video/mp4,video/webm,video/quicktime,video/*,image/*',
        multiple: true,
      });
      if (!files.length) {
        setStatusMessage('No files selected');
        return;
      }
      const { aspectFromSize, loadImageSize, loadVideoSize } = {
        aspectFromSize: (await import('@sn-editor/video-engine')).aspectFromSize,
        loadImageSize: (await import('@/lib/mediaUpload')).loadImageSize,
        loadVideoSize: (await import('@/lib/mediaUpload')).loadVideoSize,
      };
      const setAspectRatio = useVideoEditorStore.getState().setAspectRatio;
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
          /* ignore */
        }
        addMediaClip(
          upload.name,
          upload.durationMs ?? 5000,
          isImage ? 'overlay' : 'video',
          upload.url,
        );
        setStatusMessage(
          `Added “${upload.name}”${upload.durationMs ? ` · ${formatDuration(upload.durationMs)}` : ''}`,
        );
      }
      fitToContent();
    } finally {
      setUploading(false);
    }
  };

  const durationMs = project.durationMs;
  const displayMs = Math.max(durationMs, 1_000);
  // Extra room after last clip for the “+” upload control
  const laneWidth = Math.max(640, msToPx(displayMs, clock.pxPerSecond) + 120);
  const totalWidth = TRACK_LABEL_WIDTH + laneWidth;
  const playheadX = TRACK_LABEL_WIDTH + msToPx(Math.min(clock.currentMs, displayMs), clock.pxPerSecond);

  const tickEveryMs = tickEveryMsFor(displayMs);
  const ticks: number[] = [];
  for (let t = 0; t <= displayMs; t += tickEveryMs) {
    ticks.push(t);
    if (ticks.length > 40) break;
  }
  if (durationMs > 0 && ticks[ticks.length - 1] !== durationMs) ticks.push(durationMs);

  const zoomLabel =
    clock.pxPerSecond >= 10
      ? `${Math.round(clock.pxPerSecond)}px/s`
      : `${clock.pxPerSecond.toFixed(2)}px/s`;

  const orderedTracks = [...project.tracks].sort((a, b) => {
    const ai = TRACK_ORDER.indexOf(a.kind as (typeof TRACK_ORDER)[number]);
    const bi = TRACK_ORDER.indexOf(b.kind as (typeof TRACK_ORDER)[number]);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });

  const seekFromClientX = (clientX: number, target: HTMLElement) => {
    const scrollParent = target.closest('.panel-scroll') as HTMLElement | null;
    const row = target.closest('[data-timeline-row]') as HTMLElement | null;
    const rect = (row ?? target).getBoundingClientRect();
    const scrollLeft = scrollParent?.scrollLeft ?? 0;
    const xInRow = clientX - rect.left + scrollLeft;
    const xInLane = Math.max(0, xInRow - TRACK_LABEL_WIDTH);
    seekTo((xInLane / clock.pxPerSecond) * 1000);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-fog-200 px-3 py-2">
        <button type="button" className="btn-tool" disabled={!canUndo()} onClick={undo} title="Ctrl+Z">
          Undo
        </button>
        <button type="button" className="btn-tool" disabled={!canRedo()} onClick={redo} title="Ctrl+Y">
          Redo
        </button>
        <span className="mx-1 h-4 w-px bg-fog-200" />
        <button type="button" className="btn-tool" onClick={splitAtPlayhead} disabled={!selectedClipId}>
          Split
        </button>
        <button
          type="button"
          className="btn-tool"
          disabled={!selectedClipId}
          onClick={() => {
            const clip =
              project.clips.find((c) => c.id === selectedClipId) ??
              project.audio.find((a) => a.id === selectedClipId);
            if (!clip) return;
            trimSelected('start', clip.startMs + 250);
          }}
        >
          Trim in
        </button>
        <button
          type="button"
          className="btn-tool"
          disabled={!selectedClipId}
          onClick={() => {
            const clip =
              project.clips.find((c) => c.id === selectedClipId) ??
              project.audio.find((a) => a.id === selectedClipId);
            if (!clip) return;
            trimSelected('end', clip.startMs + clip.durationMs - 250);
          }}
        >
          Trim out
        </button>
        <button
          type="button"
          className="btn-tool"
          disabled={!selectedClipId}
          onClick={rippleDeleteSelected}
        >
          Ripple delete
        </button>
        <button type="button" className="btn-tool" onClick={() => snapClipsToStart()}>
          Snap to start
        </button>
        <button type="button" className="btn-tool btn-tool-active" onClick={() => fitToContent()}>
          Fit to content
        </button>
        <button
          type="button"
          className="btn-tool"
          onClick={() => setActivePanel('transitions')}
          title="Add a transition between two video clips"
        >
          Transition
        </button>
        <span className="mx-1 h-4 w-px bg-fog-200" />
        <button type="button" className="btn-tool" onClick={() => zoomTimeline(clock.pxPerSecond / 1.25)}>
          Zoom −
        </button>
        <span className="text-[11px] font-semibold text-ink-600">{zoomLabel}</span>
        <button type="button" className="btn-tool" onClick={() => zoomTimeline(clock.pxPerSecond * 1.25)}>
          Zoom +
        </button>
        <span className="text-[11px] font-semibold text-ink-600">
          Length {formatDuration(durationMs)}
        </span>
        {selectedClipId && (
          <button
            type="button"
            className="btn-tool"
            onClick={() => {
              const clip =
                project.clips.find((c) => c.id === selectedClipId) ??
                project.audio.find((a) => a.id === selectedClipId);
              if (clip) moveSelected(Math.max(0, clip.startMs - 500));
            }}
          >
            Nudge −0.5s
          </button>
        )}
        {statusMessage && (
          <span className="ml-auto max-w-[220px] truncate text-[11px] text-teal-800">
            {statusMessage}
          </span>
        )}
      </div>

      <div className="panel-scroll min-h-0 flex-1 overflow-auto px-2 py-2">
        <div
          data-timeline-row
          className="relative"
          style={{ width: totalWidth, minHeight: orderedTracks.length * 48 + 28 }}
          onClick={(e) => seekFromClientX(e.clientX, e.currentTarget)}
          onDragOver={(e) => {
            if (!isFxDragEvent(e.dataTransfer)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
        >
          <div className="absolute left-0 top-0 h-5 border-b border-fog-200" style={{ width: totalWidth }}>
            {ticks.map((t, i) => (
              <div
                key={`${t}-${i}`}
                className="absolute bottom-0 top-0 border-l border-fog-200/80 pl-1 text-[9px] text-ink-600"
                style={{ left: TRACK_LABEL_WIDTH + msToPx(t, clock.pxPerSecond) }}
              >
                {formatDuration(t)}
              </div>
            ))}
          </div>

          <div
            className="pointer-events-none absolute top-0 z-20 w-0.5 bg-teal-500"
            style={{ left: playheadX, height: '100%' }}
            aria-hidden
          >
            <div className="absolute -left-1.5 top-0 h-0 w-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-teal-500" />
          </div>

          {orderedTracks.map((track, ti) => {
            const top = 24 + ti * 48;
            let items: TimelineItem[] = [];
            if (track.kind === 'audio') {
              items = project.audio
                .filter((a) => a.trackId === track.id)
                .map((a) => ({
                  id: a.id,
                  name: a.name,
                  startMs: a.startMs,
                  durationMs: a.durationMs,
                  trackId: a.trackId,
                  kind: 'audio',
                }));
            } else if (track.kind === 'transition') {
              items = project.transitions
                .filter((t) => t.type !== 'none')
                .map((t) => {
                  const to = project.clips.find((c) => c.id === t.toClipId);
                  const from = project.clips.find((c) => c.id === t.fromClipId);
                  const join = to?.startMs ?? from?.startMs ?? 0;
                  const dur = Math.max(200, t.durationMs);
                  const start =
                    t.startMs != null ? Math.max(0, t.startMs) : Math.max(0, join - dur);
                  return {
                    id: t.id,
                    name: t.type,
                    startMs: start,
                    durationMs: dur,
                    trackId: track.id,
                    kind: 'transition',
                  };
                });
            } else if (track.kind === 'effects') {
              for (const c of project.clips) {
                if (!c.effectIds?.length) continue;
                for (const eid of c.effectIds) {
                  const off = c.effectSettings?.[eid]?.offsetMs ?? 0;
                  const dur = Math.max(
                    400,
                    c.effectSettings?.[eid]?.durationMs ?? 1200,
                  );
                  items.push({
                    id: `fx-${c.id}::${eid}`,
                    name: eid,
                    startMs: c.startMs + off,
                    durationMs: Math.min(dur, Math.max(200, c.durationMs - off)),
                    trackId: track.id,
                    kind: 'effects',
                  });
                }
              }
            } else {
              items = project.clips
                .filter((c) => c.trackId === track.id)
                .map((c) => ({
                  id: c.id,
                  name: c.name,
                  startMs: c.startMs,
                  durationMs: c.durationMs,
                  trackId: c.trackId,
                  kind: track.kind,
                }));
            }

            return (
              <div
                key={track.id}
                className="absolute left-0"
                style={{ top, height: 40, width: totalWidth }}
              >
                <div
                  className="absolute left-0 top-0 flex h-full items-center truncate pr-2 text-[10px] font-semibold uppercase text-ink-600"
                  style={{ width: TRACK_LABEL_WIDTH }}
                >
                  {track.name}
                  {track.locked ? ' 🔒' : ''}
                </div>
                <div
                  className="absolute bottom-0 top-0 rounded bg-fog-100"
                  style={{ left: TRACK_LABEL_WIDTH, width: laneWidth }}
                >
                  {items.map((clip) =>
                    track.kind === 'transition' || track.kind === 'effects' ? (
                      <TimelineMetaBlock
                        key={clip.id}
                        kind={track.kind}
                        id={clip.id}
                        label={clip.name}
                        startMs={clip.startMs}
                        durationMs={clip.durationMs}
                        pxPerSecond={clock.pxPerSecond}
                        color={TRACK_COLORS[track.kind] ?? '#64748b'}
                        onSelect={() => {
                          if (track.kind === 'transition') {
                            const tr = project.transitions.find((t) => t.id === clip.id);
                            if (tr) {
                              setSelectedClipId(tr.toClipId);
                              seekTo(clip.startMs);
                            }
                            setActivePanel('transitions');
                          } else {
                            const [clipId] = clip.id.replace(/^fx-/, '').split('::');
                            if (clipId) setSelectedClipId(clipId);
                            seekTo(clip.startMs);
                            setActivePanel('effects');
                          }
                        }}
                        onCommit={(start, dur) => {
                          if (track.kind === 'transition') {
                            useVideoEditorStore.getState().moveTransitionBlock(clip.id, start, dur);
                            return;
                          }
                          const raw = clip.id.replace(/^fx-/, '');
                          const [clipId, effectId] = raw.split('::');
                          if (!clipId || !effectId) return;
                          const host = useVideoEditorStore
                            .getState()
                            .project.clips.find((c) => c.id === clipId);
                          if (!host) return;
                          const offset = Math.max(0, start - host.startMs);
                          useVideoEditorStore
                            .getState()
                            .moveEffectBlock(clipId, effectId, offset, dur);
                        }}
                      />
                    ) : (
                      <TimelineClipBlock
                        key={clip.id}
                        clip={clip}
                        selected={clip.id === selectedClipId}
                        pxPerSecond={clock.pxPerSecond}
                        onSelect={() => {
                          if (track.locked) {
                            setStatusMessage('Track is locked — unlock it in Layers');
                            return;
                          }
                          setSelectedClipId(clip.id);
                          seekTo(clip.startMs);
                        }}
                      />
                    ),
                  )}
                  {/* Transition handles between adjacent clips on this track */}
                  {track.kind === 'video'
                    ? (() => {
                        const sorted = [...items].sort((a, b) => a.startMs - b.startMs);
                        return sorted.slice(1).map((clip, i) => {
                          const prev = sorted[i]!;
                          const joinX = msToPx(clip.startMs, clock.pxPerSecond);
                          const hasTr = project.transitions.some(
                            (t) =>
                              t.fromClipId === prev.id &&
                              t.toClipId === clip.id &&
                              t.type !== 'none',
                          );
                          return (
                            <button
                              key={`tr-${prev.id}-${clip.id}`}
                              type="button"
                              title={
                                hasTr
                                  ? 'Edit transition between clips'
                                  : 'Add transition between clips'
                              }
                              className={`absolute z-10 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-md border text-[11px] font-bold shadow-sm transition ${
                                hasTr
                                  ? 'border-[var(--sn-editor-accent)] bg-[var(--sn-editor-accent)] text-white'
                                  : 'border-fog-300 bg-white text-ink-700 hover:border-[var(--sn-editor-accent)] hover:text-[var(--sn-editor-accent-deep)]'
                              }`}
                              style={{ left: joinX, top: 8 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClipId(clip.id);
                                setActivePanel('transitions');
                                seekTo(Math.max(0, clip.startMs - 400));
                              }}
                            >
                              {hasTr ? (
                                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
                                  <path
                                    fill="currentColor"
                                    d="M2 3h5l2 5-2 5H2l2-5-2-5zm7 0h5l-2 5 2 5H9l2-5-2-5z"
                                  />
                                </svg>
                              ) : (
                                '+'
                              )}
                            </button>
                          );
                        });
                      })()
                    : null}
                  {/* “+” after last clip — upload next video onto this track */}
                  {track.kind === 'video' ? (
                    <button
                      type="button"
                      title={uploading ? 'Uploading…' : 'Upload video / image'}
                      disabled={uploading}
                      className="absolute z-10 flex h-8 w-8 items-center justify-center rounded-lg border-2 border-dashed border-teal-600/50 bg-white text-lg font-bold leading-none text-teal-700 shadow-sm hover:border-teal-600 hover:bg-teal-50 disabled:opacity-60"
                      style={{
                        left: (() => {
                          if (items.length === 0) return 8;
                          const endMs = items.reduce(
                            (max, c) => Math.max(max, c.startMs + c.durationMs),
                            0,
                          );
                          return msToPx(endMs, clock.pxPerSecond) + 8;
                        })(),
                        top: 4,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        void uploadVideoAtEnd();
                      }}
                    >
                      {uploading ? '…' : '+'}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
