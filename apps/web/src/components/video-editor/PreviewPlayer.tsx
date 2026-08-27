/**
 * Preview surface driven by PreviewClock (separate from export path).
 * Media overlays + text are draggable/resizable with the mouse.
 */
'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as REPointerEvent,
} from 'react';
import {
  DEFAULT_LAYOUT,
  DEFAULT_LOGO_LAYOUT,
  DEFAULT_OVERLAY_LAYOUT,
  DEFAULT_STICKER_LAYOUT,
  DEFAULT_TEXT_STYLE,
  type Clip,
  type ClipLayout,
} from '@sn-editor/video-engine';
import { useVideoEditorStore } from '@/store/videoEditorStore';
import { activeEffectIdsAt, previewStyleForEffects } from '@/lib/clientVideoEffects';
import { clipVisualFilter } from '@/lib/videoClipStyles';
import { formatDuration } from '@/lib/mediaUpload';
import { resolveClipTransition } from '@/lib/clipTransitions';
import { ClipContextualToolbar } from './ClipContextualToolbar';

function intensityMapFor(clip: Clip): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, s] of Object.entries(clip.effectSettings ?? {})) {
    if (s.intensity != null) out[id] = s.intensity;
  }
  return out;
}

function effectsStyleForClip(clip: Clip, currentMs: number) {
  const local = currentMs - clip.startMs;
  const ids = activeEffectIdsAt(clip, local);
  return previewStyleForEffects(ids, intensityMapFor(clip));
}

function formatTime(ms: number): string {
  return formatDuration(ms);
}

function isLikelyVideo(src: string, name: string, trackKind?: string): boolean {
  if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(src) || src.startsWith('data:image')) return false;
  if (/\.(mp4|webm|mov)(\?|$)/i.test(src)) return true;
  if (trackKind === 'overlay' || trackKind === 'logo' || trackKind === 'sticker') return false;
  if (trackKind === 'video') return !src.startsWith('data:');
  return /video|mp4|webm|mov/i.test(name);
}

function mediaLayoutFor(clip: Clip, trackKind?: string): ClipLayout {
  if (clip.layout?.width != null && clip.layout?.height != null) {
    return {
      x: clip.layout.x,
      y: clip.layout.y,
      width: clip.layout.width,
      height: clip.layout.height,
    };
  }
  if (trackKind === 'logo') return { ...DEFAULT_LOGO_LAYOUT(), ...clip.layout };
  if (trackKind === 'sticker') {
    return { ...DEFAULT_STICKER_LAYOUT(), ...clip.layout };
  }
  if (trackKind === 'overlay') {
    return { ...DEFAULT_OVERLAY_LAYOUT(), ...clip.layout };
  }
  // Full-bleed video/image until the user resizes it — keep letterboxing via object-contain
  return {
    x: clip.layout?.x ?? 50,
    y: clip.layout?.y ?? 50,
    width: clip.layout?.width ?? 100,
    height: clip.layout?.height ?? 100,
  };
}

type Gesture =
  | { mode: 'move'; id: string; moved: boolean }
  | {
      mode: 'resize';
      id: string;
      corner: 'nw' | 'ne' | 'sw' | 'se';
      moved: boolean;
      startLayout: ClipLayout;
      startX: number;
      startY: number;
      frameW: number;
      frameH: number;
    };

const HANDLES: Array<{ corner: 'nw' | 'ne' | 'sw' | 'se'; style: CSSProperties }> = [
  { corner: 'nw', style: { left: 0, top: 0, cursor: 'nwse-resize', transform: 'translate(-50%, -50%)' } },
  { corner: 'ne', style: { right: 0, top: 0, cursor: 'nesw-resize', transform: 'translate(50%, -50%)' } },
  { corner: 'sw', style: { left: 0, bottom: 0, cursor: 'nesw-resize', transform: 'translate(-50%, 50%)' } },
  { corner: 'se', style: { right: 0, bottom: 0, cursor: 'nwse-resize', transform: 'translate(50%, 50%)' } },
];

export function PreviewPlayer() {
  const project = useVideoEditorStore((s) => s.project);
  const clock = useVideoEditorStore((s) => s.clock);
  const tickClock = useVideoEditorStore((s) => s.tickClock);
  const togglePlay = useVideoEditorStore((s) => s.togglePlay);
  const seekTo = useVideoEditorStore((s) => s.seekTo);
  const selectedClipId = useVideoEditorStore((s) => s.selectedClipId);
  const setSelectedClipId = useVideoEditorStore((s) => s.setSelectedClipId);
  const patchClip = useVideoEditorStore((s) => s.patchClip);
  const statusMessage = useVideoEditorStore((s) => s.statusMessage);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const frameRef = useRef<HTMLDivElement>(null);
  const audioMapRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const gestureRef = useRef<Gesture | null>(null);
  const [muteVideo, setMuteVideo] = useState(true);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState('');

  useEffect(() => {
    if (!clock.playing) return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      tickClock(now - last);
      last = now;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [clock.playing, tickClock]);

  const trackById = useMemo(() => {
    const map = new Map(project.tracks.map((t) => [t.id, t]));
    return map;
  }, [project.tracks]);

  const activeClips = project.clips.filter((c) => {
    const track = trackById.get(c.trackId);
    if (track && track.visible === false) return false;
    return clock.currentMs >= c.startMs && clock.currentMs < c.startMs + c.durationMs;
  });

  const activeTextClips = activeClips.filter((c) => c.text);
  const mediaClips = activeClips.filter((c) => c.src);

  const baseMedia = useMemo(() => {
    const videoTrackIds = new Set(
      project.tracks.filter((t) => t.kind === 'video').map((t) => t.id),
    );
    return (
      mediaClips.find((c) => videoTrackIds.has(c.trackId)) ??
      mediaClips[0] ??
      null
    );
  }, [mediaClips, project.tracks]);

  const overlayMedia = mediaClips.filter((c) => c.id !== baseMedia?.id);
  const transformableMedia = useMemo(() => {
    const list: Clip[] = [];
    if (baseMedia) list.push(baseMedia);
    list.push(...overlayMedia);
    return list;
  }, [baseMedia, overlayMedia]);

  const baseTrackKind = baseMedia ? trackById.get(baseMedia.trackId)?.kind : undefined;
  const isVideoSrc =
    !!baseMedia?.src && isLikelyVideo(baseMedia.src, baseMedia.name, baseTrackKind);

  const baseLayout = baseMedia ? mediaLayoutFor(baseMedia, baseTrackKind) : null;
  const baseIsFullBleed =
    !!baseLayout && (baseLayout.width ?? 100) >= 99.5 && (baseLayout.height ?? 100) >= 99.5;

  const speed = baseMedia?.speed && baseMedia.speed > 0 ? baseMedia.speed : 1;
  const mediaFilter = baseMedia ? clipVisualFilter(baseMedia) : undefined;
  const baseTransition = baseMedia
    ? resolveClipTransition(
        project,
        baseMedia.id,
        clock.currentMs,
        baseMedia.startMs,
        baseMedia.durationMs,
      )
    : null;

  const fxStyle = baseMedia
    ? effectsStyleForClip(baseMedia, clock.currentMs)
    : previewStyleForEffects(
        activeClips.flatMap((c) =>
          activeEffectIdsAt(c, clock.currentMs - c.startMs),
        ),
      );

  // Sync main video
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !baseMedia?.src || !isVideoSrc) return;
    const localSec =
      ((clock.currentMs - baseMedia.startMs) * speed + baseMedia.sourceOffsetMs) / 1000;
    if (Math.abs(el.currentTime - localSec) > 0.25) {
      el.currentTime = Math.max(0, Math.min(localSec, (el.duration || localSec) - 0.001));
    }
    el.playbackRate = clock.playing ? speed : 1;
    el.muted = muteVideo || Boolean(trackById.get(baseMedia.trackId)?.muted);
    if (clock.playing && el.paused) void el.play().catch(() => undefined);
    if (!clock.playing && !el.paused) el.pause();
  }, [clock.currentMs, clock.playing, baseMedia, isVideoSrc, muteVideo, speed, trackById]);

  // Sync overlay videos
  useEffect(() => {
    for (const clip of overlayMedia) {
      const kind = trackById.get(clip.trackId)?.kind;
      if (!clip.src || !isLikelyVideo(clip.src, clip.name, kind)) continue;
      const el = overlayVideoRefs.current.get(clip.id);
      if (!el) continue;
      const sp = clip.speed && clip.speed > 0 ? clip.speed : 1;
      const localSec = ((clock.currentMs - clip.startMs) * sp + clip.sourceOffsetMs) / 1000;
      if (Math.abs(el.currentTime - localSec) > 0.25) {
        el.currentTime = Math.max(0, Math.min(localSec, (el.duration || localSec) - 0.001));
      }
      el.muted = true;
      el.playbackRate = clock.playing ? sp : 1;
      if (clock.playing && el.paused) void el.play().catch(() => undefined);
      if (!clock.playing && !el.paused) el.pause();
    }
  }, [overlayMedia, clock.currentMs, clock.playing, trackById]);

  useEffect(() => {
    const map = audioMapRef.current;
    const liveIds = new Set<string>();

    for (const clip of project.audio) {
      if (!clip.src) continue;
      liveIds.add(clip.id);

      let el = map.get(clip.id);
      if (!el || el.src !== clip.src) {
        if (el) {
          el.pause();
          el.src = '';
        }
        el = new Audio();
        el.preload = 'auto';
        el.src = clip.src;
        el.loop = false;
        map.set(clip.id, el);
      }

      el.volume = Math.min(1, Math.max(0, clip.volume ?? 0.85));
      const trackMuted = Boolean(trackById.get(clip.trackId)?.muted);
      const inRange =
        clock.currentMs >= clip.startMs && clock.currentMs < clip.startMs + clip.durationMs;

      if (!inRange || trackMuted) {
        if (!el.paused) el.pause();
        continue;
      }

      const localSec = (clock.currentMs - clip.startMs) / 1000;
      if (Math.abs(el.currentTime - localSec) > 0.35) {
        try {
          el.currentTime = Math.max(0, localSec);
        } catch {
          // ignore
        }
      }

      if (clock.playing && el.paused) {
        void el.play().catch((err) => {
          setAudioError(
            err instanceof Error
              ? `Audio blocked: click Play again (${err.message})`
              : 'Audio blocked — click Play',
          );
        });
      }
      if (!clock.playing && !el.paused) el.pause();
    }

    for (const [id, el] of map) {
      if (!liveIds.has(id)) {
        el.pause();
        el.removeAttribute('src');
        el.load();
        map.delete(id);
      }
    }
  }, [project.audio, clock.currentMs, clock.playing, trackById]);

  useEffect(() => {
    const map = audioMapRef.current;
    return () => {
      for (const el of map.values()) {
        el.pause();
        el.removeAttribute('src');
        el.load();
      }
      map.clear();
    };
  }, []);

  useEffect(() => {
    if (clock.playing) setAudioError(null);
  }, [clock.playing]);

  const commitLayout = useCallback(
    (id: string, message: string) => {
      const clip = useVideoEditorStore.getState().project.clips.find((c) => c.id === id);
      if (clip?.layout) patchClip(id, { layout: clip.layout }, message);
    },
    [patchClip],
  );

  const applyLiveLayout = useCallback((id: string, layout: ClipLayout) => {
    useVideoEditorStore.setState((s) => ({
      project: {
        ...s.project,
        clips: s.project.clips.map((c) => (c.id === id ? { ...c, layout } : c)),
      },
    }));
  }, []);

  const onMediaMoveDown = useCallback(
    (e: REPointerEvent, clipId: string) => {
      e.preventDefault();
      e.stopPropagation();
      const state = useVideoEditorStore.getState();
      const clip = state.project.clips.find((c) => c.id === clipId);
      const track = clip ? state.project.tracks.find((t) => t.id === clip.trackId) : undefined;
      if (track?.locked) {
        state.setStatusMessage('Track is locked — unlock it in Layers');
        setSelectedClipId(clipId);
        return;
      }
      setSelectedClipId(clipId);
      gestureRef.current = { mode: 'move', id: clipId, moved: false };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [setSelectedClipId],
  );

  const onResizeDown = useCallback(
    (e: REPointerEvent, clip: Clip, corner: 'nw' | 'ne' | 'sw' | 'se') => {
      e.preventDefault();
      e.stopPropagation();
      if (!frameRef.current) return;
      const track = trackById.get(clip.trackId);
      if (track?.locked) {
        useVideoEditorStore.getState().setStatusMessage('Track is locked — unlock it in Layers');
        setSelectedClipId(clip.id);
        return;
      }
      const rect = frameRef.current.getBoundingClientRect();
      const kind = track?.kind;
      const layout = mediaLayoutFor(clip, kind);
      setSelectedClipId(clip.id);
      gestureRef.current = {
        mode: 'resize',
        id: clip.id,
        corner,
        moved: false,
        startLayout: { ...layout },
        startX: e.clientX,
        startY: e.clientY,
        frameW: rect.width,
        frameH: rect.height,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [setSelectedClipId, trackById],
  );

  const onGestureMove = useCallback(
    (e: REPointerEvent) => {
      const g = gestureRef.current;
      if (!g || !frameRef.current) return;
      const rect = frameRef.current.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;

      if (g.mode === 'move') {
        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        g.moved = true;
        const clip = useVideoEditorStore.getState().project.clips.find((c) => c.id === g.id);
        const kind = clip ? trackById.get(clip.trackId)?.kind : undefined;
        const prev = clip ? mediaLayoutFor(clip, kind) : DEFAULT_OVERLAY_LAYOUT();
        applyLiveLayout(g.id, { ...prev, x, y });
        return;
      }

      // resize from corner — keep opposite corner fixed
      const dxPct = ((e.clientX - g.startX) / g.frameW) * 100;
      const dyPct = ((e.clientY - g.startY) / g.frameH) * 100;
      const { startLayout: s, corner } = g;
      const w0 = s.width ?? 40;
      const h0 = s.height ?? 40;
      const left0 = s.x - w0 / 2;
      const top0 = s.y - h0 / 2;
      const right0 = s.x + w0 / 2;
      const bottom0 = s.y + h0 / 2;

      let left = left0;
      let top = top0;
      let right = right0;
      let bottom = bottom0;

      if (corner.includes('e')) right = Math.max(left + 8, right0 + dxPct);
      if (corner.includes('w')) left = Math.min(right - 8, left0 + dxPct);
      if (corner.includes('s')) bottom = Math.max(top + 8, bottom0 + dyPct);
      if (corner.includes('n')) top = Math.min(bottom - 8, top0 + dyPct);

      left = Math.max(0, Math.min(92, left));
      top = Math.max(0, Math.min(92, top));
      right = Math.max(left + 8, Math.min(100, right));
      bottom = Math.max(top + 8, Math.min(100, bottom));

      g.moved = true;
      applyLiveLayout(g.id, {
        x: (left + right) / 2,
        y: (top + bottom) / 2,
        width: right - left,
        height: bottom - top,
      });
    },
    [applyLiveLayout, trackById],
  );

  const onGestureUp = useCallback(() => {
    const g = gestureRef.current;
    gestureRef.current = null;
    if (!g?.moved) return;
    if (g.mode === 'resize') {
      const clip = useVideoEditorStore.getState().project.clips.find((c) => c.id === g.id);
      if (clip?.text && clip.layout?.height && g.startLayout.height) {
        const scale = (clip.layout.height ?? 14) / Math.max(4, g.startLayout.height ?? 14);
        const prevSize = clip.textStyle?.fontSize ?? 36;
        const nextSize = Math.max(12, Math.min(160, Math.round(prevSize * scale)));
        patchClip(
          g.id,
          {
            layout: clip.layout,
            textStyle: { ...DEFAULT_TEXT_STYLE(), ...(clip.textStyle ?? {}), fontSize: nextSize },
          },
          'Text resized',
        );
        return;
      }
      commitLayout(g.id, 'Media resized');
      return;
    }
    commitLayout(g.id, 'Media moved');
  }, [commitLayout, patchClip]);

  const onTextPointerDown = useCallback(
    (e: REPointerEvent<HTMLParagraphElement>, clipId: string) => {
      e.preventDefault();
      e.stopPropagation();
      const state = useVideoEditorStore.getState();
      const clip = state.project.clips.find((c) => c.id === clipId);
      const track = clip ? state.project.tracks.find((t) => t.id === clip.trackId) : undefined;
      if (track?.locked) {
        state.setStatusMessage('Track is locked — unlock it in Layers');
        setSelectedClipId(clipId);
        return;
      }
      setSelectedClipId(clipId);
      gestureRef.current = { mode: 'move', id: clipId, moved: false };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [setSelectedClipId],
  );

  const onTextPointerMove = useCallback(
    (e: REPointerEvent<HTMLParagraphElement>) => {
      if (!gestureRef.current || gestureRef.current.mode !== 'move' || !frameRef.current) return;
      const rect = frameRef.current.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      gestureRef.current.moved = true;
      const id = gestureRef.current.id;
      const clip = useVideoEditorStore.getState().project.clips.find((c) => c.id === id);
      applyLiveLayout(id, { ...(clip?.layout ?? DEFAULT_LAYOUT()), x, y });
    },
    [applyLiveLayout],
  );

  const onTextPointerUp = useCallback(() => {
    const g = gestureRef.current;
    gestureRef.current = null;
    if (!g?.moved || g.mode !== 'move') return;
    commitLayout(g.id, 'Text moved');
  }, [commitLayout]);

  const activeAudio = project.audio.filter(
    (a) =>
      Boolean(a.src) &&
      clock.currentMs >= a.startMs &&
      clock.currentMs < a.startMs + a.durationMs &&
      !trackById.get(a.trackId)?.muted,
  );

  const silentBeds = project.audio.filter((a) => !a.src);
  const ratio = project.aspectRatio;
  const customSize = /^(\d+)\s*[x×]\s*(\d+)$/i.exec(String(ratio).trim());
  // Fit the full frame inside the preview well (never clip top/bottom).
  const frameStyle: CSSProperties = customSize
    ? {
        aspectRatio: `${customSize[1]} / ${customSize[2]}`,
        height: 'min(100%, 560px)',
        width: 'auto',
        maxWidth: '100%',
        maxHeight: '100%',
      }
    : ratio === '16:9'
      ? {
          aspectRatio: '16 / 9',
          width: 'min(100%, 720px)',
          maxWidth: '100%',
          maxHeight: '100%',
          height: 'auto',
        }
      : ratio === '1:1'
        ? {
            aspectRatio: '1 / 1',
            height: 'min(100%, min(100cqw, 560px))',
            width: 'auto',
            maxWidth: '100%',
            maxHeight: '100%',
          }
        : {
            aspectRatio: '9 / 16',
            height: '100%',
            maxHeight: '100%',
            width: 'auto',
            maxWidth: '100%',
          };

  const exportIn = project.exportRange?.inMs ?? 0;
  const exportOut =
    project.exportRange?.outMs && project.exportRange.outMs > 0
      ? project.exportRange.outMs
      : null;

  const renderMediaBox = (clip: Clip, zIndex: number, isBase: boolean) => {
    const kind = trackById.get(clip.trackId)?.kind;
    const layout = mediaLayoutFor(clip, kind);
    const selected = clip.id === selectedClipId;
    const videoLike = isLikelyVideo(clip.src ?? '', clip.name, kind);
    const w = layout.width ?? 40;
    const h = layout.height ?? 40;
    const fullBleed = isBase && w >= 99.5 && h >= 99.5;
    const tr = resolveClipTransition(
      project,
      clip.id,
      clock.currentMs,
      clip.startMs,
      clip.durationMs,
    );
    const fx = effectsStyleForClip(clip, clock.currentMs);
    const filters = [fx.filter, clipVisualFilter(clip), tr.filter !== 'none' ? tr.filter : '']
      .filter(Boolean)
      .join(' ');
    const flip = clip.flipX ? ' scaleX(-1)' : '';
    const transform = [
      'translate(-50%, -50%)',
      tr.transform !== 'none' ? tr.transform : '',
      fx.transform ?? '',
      flip,
    ]
      .filter(Boolean)
      .join(' ');
    const baseOpacity = (clip.opacity ?? 100) / 100;

    return (
      <div
        key={clip.id}
        role="button"
        tabIndex={0}
        className={`absolute touch-none ${
          selected ? 'z-30 ring-2 ring-inset ring-[var(--sn-editor-accent)]' : 'z-10'
        } ${fullBleed ? '' : 'cursor-grab active:cursor-grabbing'}`}
        style={{
          left: `${layout.x}%`,
          top: `${layout.y}%`,
          width: `${w}%`,
          height: `${h}%`,
          transform,
          transformOrigin: 'center center',
          zIndex: selected ? 40 : zIndex,
          opacity: tr.opacity * baseOpacity,
          filter: filters || undefined,
          clipPath: tr.clipPath !== 'none' ? tr.clipPath : undefined,
          transition: clock.playing ? undefined : 'opacity 80ms linear',
          boxSizing: 'border-box',
        }}
        onPointerDown={(e) => onMediaMoveDown(e, clip.id)}
        onPointerMove={onGestureMove}
        onPointerUp={onGestureUp}
        onPointerCancel={onGestureUp}
      >
        {videoLike ? (
          <video
            ref={(el) => {
              if (isBase) {
                videoRef.current = el;
              } else if (el) {
                overlayVideoRefs.current.set(clip.id, el);
              } else {
                overlayVideoRefs.current.delete(clip.id);
              }
            }}
            src={clip.src}
            className="pointer-events-none h-full w-full object-contain"
            muted={isBase ? muteVideo || Boolean(trackById.get(clip.trackId)?.muted) : true}
            playsInline
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={clip.src}
            alt={clip.name}
            className="pointer-events-none h-full w-full object-contain"
            draggable={false}
          />
        )}

        {selected &&
          HANDLES.map((hnd) => (
            <span
              key={hnd.corner}
              className="absolute z-50 h-3 w-3 rounded-sm border-2 border-white bg-teal-500 shadow"
              style={hnd.style}
              onPointerDown={(e) => onResizeDown(e, clip, hnd.corner)}
              onPointerMove={onGestureMove}
              onPointerUp={onGestureUp}
              onPointerCancel={onGestureUp}
            />
          ))}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden px-1">
      <ClipContextualToolbar />
      <div className="relative min-h-0 w-full flex-1" style={{ containerType: 'size' }}>
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <div
        ref={frameRef}
        className="video-preview-frame relative overflow-hidden rounded-xl border border-white/10 bg-ink-950 shadow-panel"
        style={{
          ...frameStyle,
          transform: `scale(${previewZoom})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Background fill when no media / full-bleed filters */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            ...fxStyle,
            opacity: 1,
          }}
        >
          {!baseMedia?.src && (
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 40% 30%, rgba(20,184,166,0.35), transparent 45%), linear-gradient(160deg,#0a1214,#1e3a45)',
              }}
            />
          )}
        </div>

        {transformableMedia.map((clip, i) =>
          renderMediaBox(clip, 10 + i, clip.id === baseMedia?.id),
        )}

        {activeClips.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-fog-100/50">
            Upload media from the Media panel
          </p>
        )}

        {activeTextClips.map((c) => {
          const style = { ...DEFAULT_TEXT_STYLE(), ...(c.textStyle ?? {}) };
          const layout = c.layout ?? DEFAULT_LAYOUT();
          const selected = c.id === selectedClipId;
          const boxW = layout.width ?? 40;
          const boxH = layout.height ?? 14;
          const editing = editingTextId === c.id;

          if (editing) {
            return (
              <textarea
                key={c.id}
                autoFocus
                value={editingTextValue}
                className="absolute z-40 resize-none rounded border-2 border-teal-400 bg-black/70 p-1 text-center text-fog-100 outline-none"
                style={{
                  left: `${layout.x}%`,
                  top: `${layout.y}%`,
                  width: `${boxW}%`,
                  minHeight: `${boxH}%`,
                  transform: 'translate(-50%, -50%)',
                  fontFamily: `"${style.fontFamily}", Georgia, serif`,
                  fontSize: style.fontSize,
                  fontWeight: style.fontWeight,
                  color: style.color,
                }}
                onChange={(e) => setEditingTextValue(e.target.value)}
                onBlur={() => {
                  patchClip(c.id, { text: editingTextValue || 'Text', name: (editingTextValue || 'Text').slice(0, 24) }, 'Text edited');
                  setEditingTextId(null);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Escape') {
                    setEditingTextId(null);
                  }
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    (e.target as HTMLTextAreaElement).blur();
                  }
                }}
              />
            );
          }

          return (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              className={`absolute z-20 touch-none select-none ${
                selected ? 'ring-2 ring-inset ring-[var(--sn-editor-accent)]' : ''
              }`}
              style={{
                left: `${layout.x}%`,
                top: `${layout.y}%`,
                width: `${boxW}%`,
                height: `${boxH}%`,
                transform: 'translate(-50%, -50%)',
                boxSizing: 'border-box',
              }}
              onPointerDown={(e) => onTextPointerDown(e as unknown as REPointerEvent<HTMLParagraphElement>, c.id)}
              onPointerMove={onTextPointerMove as unknown as (e: REPointerEvent<HTMLDivElement>) => void}
              onPointerUp={onTextPointerUp}
              onPointerCancel={onTextPointerUp}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setSelectedClipId(c.id);
                setEditingTextId(c.id);
                setEditingTextValue(c.text ?? '');
              }}
            >
              <p
                className="flex h-full w-full cursor-grab items-center justify-center whitespace-pre-wrap drop-shadow active:cursor-grabbing"
                style={{
                  fontFamily: `"${style.fontFamily}", Georgia, serif`,
                  fontSize: style.fontSize,
                  fontWeight: style.fontWeight,
                  fontStyle: style.fontStyle,
                  color: style.color,
                  textAlign: style.align,
                  lineHeight: 1.15,
                  margin: 0,
                  WebkitTextStroke:
                    style.strokeWidth && style.strokeColor
                      ? `${style.strokeWidth}px ${style.strokeColor}`
                      : undefined,
                  ...effectsStyleForClip(c, clock.currentMs),
                }}
              >
                {c.text}
              </p>
              {selected &&
                HANDLES.map((hnd) => (
                  <span
                    key={hnd.corner}
                    className="absolute z-50 h-3 w-3 rounded-sm border-2 border-white bg-teal-500 shadow"
                    style={hnd.style}
                    onPointerDown={(e) => onResizeDown(e, c, hnd.corner)}
                    onPointerMove={onGestureMove}
                    onPointerUp={onGestureUp}
                    onPointerCancel={onGestureUp}
                  />
                ))}
            </div>
          );
        })}

        {activeAudio.length > 0 && (
          <div className="absolute left-3 top-3 z-50 rounded bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-teal-200">
            ♪ {activeAudio.map((a) => a.label?.trim() || a.name).join(' · ')}
          </div>
        )}

        {exportOut != null && exportOut > exportIn && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-50 h-0.5 bg-amber-400/80" />
        )}

        <div className="pointer-events-none absolute bottom-3 left-3 z-50 rounded bg-black/40 px-2 py-0.5 text-[11px] text-fog-100">
          {speed !== 1 && <span className="text-teal-200">{speed}x</span>}
          {baseTransition?.activeType && (
            <span className="ml-1 text-teal-200">
              · {baseTransition.phase} {baseTransition.activeType}
            </span>
          )}
        </div>
      </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-1.5 py-2">
        <div className="flex items-center justify-center gap-3">
          <span className="min-w-[3.25rem] text-right text-xs font-semibold tabular-nums text-ink-700">
            {formatTime(clock.currentMs)}
          </span>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--sn-editor-border)] bg-white text-ink-900 shadow-md transition hover:border-[var(--sn-editor-accent)] hover:text-[var(--sn-editor-accent-deep)]"
            onClick={togglePlay}
            aria-label={clock.playing ? 'Pause' : 'Play'}
          >
            {clock.playing ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path fill="currentColor" d="M7 5h3v14H7zm7 0h3v14h-3z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path fill="currentColor" d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <span className="min-w-[3.25rem] text-left text-xs font-semibold tabular-nums text-ink-700">
            {formatTime(project.durationMs)}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" className="btn-tool" onClick={() => seekTo(0)}>
            Restart
          </button>
          <button
            type="button"
            className="btn-tool"
            onClick={() => seekTo(Math.min(project.durationMs, clock.currentMs + 1000))}
          >
            +1s
          </button>
          <button
            type="button"
            className={muteVideo ? 'btn-tool' : 'btn-tool btn-tool-active'}
            title="Toggle video clip soundtrack (music bed stays independent)"
            onClick={() => setMuteVideo((m) => !m)}
          >
            {muteVideo ? 'Video muted' : 'Video sound on'}
          </button>
          <span className="mx-1 h-4 w-px bg-fog-200" />
          <button
            type="button"
            className="btn-tool"
            title="Zoom out preview"
            onClick={() => setPreviewZoom((z) => Math.max(0.5, Number((z / 1.15).toFixed(2))))}
          >
            Zoom −
          </button>
          <span className="min-w-[3rem] text-center text-[11px] font-semibold text-ink-600">
            {Math.round(previewZoom * 100)}%
          </span>
          <button
            type="button"
            className="btn-tool"
            title="Zoom in preview"
            onClick={() => setPreviewZoom((z) => Math.min(2.5, Number((z * 1.15).toFixed(2))))}
          >
            Zoom +
          </button>
          <button
            type="button"
            className="btn-tool"
            onClick={() => setPreviewZoom(1)}
            title="Reset preview zoom"
          >
            Fit
          </button>
        </div>
        <p className="max-w-md text-center text-[11px] text-ink-500">
          Space = play/pause · Drag media to move · corner handles to resize
        </p>
        {silentBeds.length > 0 && (
          <p className="max-w-md text-center text-[11px] text-amber-700">
            “{silentBeds.map((a) => a.name).join(', ')}” has no audio file — use Upload audio file.
          </p>
        )}
        {audioError && (
          <p className="max-w-md text-center text-[11px] text-amber-700">{audioError}</p>
        )}
        {statusMessage && (
          <p className="max-w-md text-center text-[11px] text-[var(--sn-editor-accent-deep)]">
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  );
}
