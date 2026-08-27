/**
 * Client-side video export with timeline audio mixed into WebM.
 */
'use client';

import type { AspectRatio, Clip, Track, VideoProject } from '@sn-editor/video-engine';
import { DEFAULT_LAYOUT, DEFAULT_TEXT_STYLE } from '@sn-editor/video-engine';
import { downloadBlob } from '@/lib/downloadFile';
import { resolveAdjust } from '@/lib/videoClipStyles';
import { applyTransitionToCanvas, resolveClipTransition } from '@/lib/clipTransitions';

function outputSize(aspect: AspectRatio): { width: number; height: number } {
  const custom = /^(\d+)\s*[x×]\s*(\d+)$/i.exec(String(aspect).trim());
  if (custom) {
    return {
      width: Math.max(64, Math.min(3840, Number(custom[1]))),
      height: Math.max(64, Math.min(3840, Number(custom[2]))),
    };
  }
  if (aspect === '16:9') return { width: 1280, height: 720 };
  if (aspect === '1:1') return { width: 720, height: 720 };
  if (aspect === '9:16') return { width: 720, height: 1280 };
  // Closest match for freeform ratios like "1.78" stored as ratio strings
  const parts = String(aspect).split(':').map(Number);
  if (parts.length === 2 && parts[0]! > 0 && parts[1]! > 0) {
    const r = parts[0]! / parts[1]!;
    if (r >= 1) return { width: 1280, height: Math.round(1280 / r) };
    return { width: Math.round(1280 * r), height: 1280 };
  }
  return { width: 720, height: 1280 };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function trackKind(project: VideoProject, trackId: string): string | undefined {
  return project.tracks.find((t: Track) => t.id === trackId)?.kind;
}

function isVideoClip(project: VideoProject, clip: Clip): boolean {
  if (!clip.src) return false;
  if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(clip.src)) return false;
  if (/\.(mp4|webm|mov)(\?|$)/i.test(clip.src)) return true;
  const kind = trackKind(project, clip.trackId);
  if (kind === 'video') return true;
  if (kind === 'overlay' || kind === 'logo' || kind === 'sticker') return false;
  return /video|mp4|webm|mov/i.test(clip.name);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 64)}`));
    img.src = src;
  });
}

function loadVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = src;
    const onReady = () => {
      video.removeEventListener('loadeddata', onReady);
      resolve(video);
    };
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('error', () => reject(new Error('Failed to load video')));
    video.load();
  });
}

function seekVideo(video: HTMLVideoElement, timeSec: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - timeSec) < 0.04) {
      resolve();
      return;
    }
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = Math.max(0, Math.min(timeSec, (video.duration || timeSec) - 0.001));
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  media: CanvasImageSource,
  mw: number,
  mh: number,
  cw: number,
  ch: number,
): void {
  const scale = Math.max(cw / mw, ch / mh);
  const w = mw * scale;
  const h = mh * scale;
  ctx.drawImage(media, (cw - w) / 2, (ch - h) / 2, w, h);
}

/** Object-fit: contain inside a destination rect. */
function drawContainInBox(
  ctx: CanvasRenderingContext2D,
  media: CanvasImageSource,
  mw: number,
  mh: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const scale = Math.min(dw / Math.max(1, mw), dh / Math.max(1, mh));
  const w = mw * scale;
  const h = mh * scale;
  ctx.drawImage(media, dx + (dw - w) / 2, dy + (dh - h) / 2, w, h);
}

function mediaDestRect(
  clip: Clip,
  frameW: number,
  frameH: number,
  trackKind?: string,
): { x: number; y: number; w: number; h: number; fullBleed: boolean } {
  const layout = clip.layout;
  const hasSize = layout?.width != null && layout?.height != null;
  const isOverlay =
    trackKind === 'overlay' || trackKind === 'logo' || trackKind === 'sticker' || hasSize;
  if (!isOverlay || !layout) {
    return { x: 0, y: 0, w: frameW, h: frameH, fullBleed: true };
  }
  const wp = layout.width ?? 100;
  const hp = layout.height ?? 100;
  if (wp >= 99.5 && hp >= 99.5 && (layout.x ?? 50) === 50 && (layout.y ?? 50) === 50) {
    return { x: 0, y: 0, w: frameW, h: frameH, fullBleed: true };
  }
  const w = (wp / 100) * frameW;
  const h = (hp / 100) * frameH;
  const x = ((layout.x ?? 50) / 100) * frameW - w / 2;
  const y = ((layout.y ?? 50) / 100) * frameH - h / 2;
  return { x, y, w, h, fullBleed: false };
}

function contentDurationMs(project: VideoProject): number {
  const fromClips = project.clips.reduce((max, c) => Math.max(max, c.startMs + c.durationMs), 0);
  const fromAudio = project.audio.reduce((max, a) => Math.max(max, a.startMs + a.durationMs), 0);
  return Math.max(1, fromClips, fromAudio, project.durationMs);
}

function exportWindow(project: VideoProject): { startMs: number; endMs: number; durationMs: number } {
  const full = contentDurationMs(project);
  const inMs = Math.max(0, project.exportRange?.inMs ?? 0);
  const outRaw = project.exportRange?.outMs ?? 0;
  const outMs = outRaw > inMs ? Math.min(outRaw, full) : full;
  const startMs = Math.min(inMs, outMs - 1);
  const endMs = Math.max(startMs + 1, outMs);
  return { startMs, endMs, durationMs: endMs - startMs };
}

function clipHasVisualOverrides(clip: Clip): boolean {
  if (clip.preset && clip.preset !== 'none') return true;
  if (clip.adjust) {
    const a = clip.adjust;
    if (
      a.grayscale ||
      a.blur ||
      a.sepia ||
      a.invert ||
      a.hueRotate ||
      (a.brightness != null && a.brightness !== 100) ||
      (a.contrast != null && a.contrast !== 100) ||
      (a.saturation != null && a.saturation !== 100)
    ) {
      return true;
    }
  }
  if (clip.speed && clip.speed !== 1) return true;
  return false;
}

function canvasFilterForClip(clip: Clip): string {
  const a = resolveAdjust(clip);
  return [
    `grayscale(${a.grayscale}%)`,
    `blur(${a.blur}px)`,
    `brightness(${a.brightness}%)`,
    `contrast(${a.contrast}%)`,
    `saturate(${a.saturation}%)`,
    `sepia(${a.sepia}%)`,
    `hue-rotate(${a.hueRotate}deg)`,
    `invert(${a.invert}%)`,
  ].join(' ');
}

const CLIENT_REENCODE_MAX_MS = 120_000;

export interface VideoExportProgress {
  progress: number;
  status: string;
}

function pickMime(format: VideoExportFormat = 'webm'): { mimeType: string; ext: string; note?: string } {
  if (format === 'mp4') {
    const mp4 = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4'].find((m) =>
      MediaRecorder.isTypeSupported(m),
    );
    if (mp4) return { mimeType: mp4, ext: 'mp4' };
  }
  const vp9 = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp9',
  ];
  const vp8 = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  const list = format === 'webm-vp8' ? [...vp8, ...vp9] : [...vp9, ...vp8];
  const mimeType = list.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
  return {
    mimeType,
    ext: 'webm',
    note: format === 'mp4' && mimeType ? 'MP4 not supported — exporting WebM' : undefined,
  };
}

export type VideoExportFormat = 'webm' | 'webm-vp8' | 'mp4';

export interface VideoExportOptions {
  format?: VideoExportFormat;
}

/**
 * Export timeline video + music bed (WebM / MP4 when available).
 * Honors export range, text style/position, speed, presets/adjust, transitions.
 */
export async function exportVideoProjectToDownload(
  project: VideoProject,
  onProgress?: (p: VideoExportProgress) => void,
  options?: VideoExportOptions,
): Promise<{ filename: string; mimeType: string }> {
  const format = options?.format ?? 'webm';
  const { startMs, endMs, durationMs } = exportWindow(project);
  const safeName = (project.meta.name || 'sn-editor-video').replace(/[^\w.-]+/g, '-');
  const timelineAudio = project.audio.filter((a) => {
    if (!a.src) return false;
    const track = project.tracks.find((t) => t.id === a.trackId);
    return !track?.muted;
  });
  const hasTimelineAudio = timelineAudio.length > 0;

  if (durationMs <= 0) {
    throw new Error('Nothing to export — add media or set an export range');
  }

  const videoClips = project.clips.filter((c) => {
    if (!c.src || !isVideoClip(project, c)) return false;
    const track = project.tracks.find((t) => t.id === c.trackId);
    return track?.visible !== false;
  });
  const hasGraphics = project.clips.some((c) => {
    const track = project.tracks.find((t) => t.id === c.trackId);
    if (track?.visible === false) return false;
    return (
      c.text ||
      (c.src && !isVideoClip(project, c)) ||
      clipHasVisualOverrides(c) ||
      (c.effectIds && c.effectIds.length > 0)
    );
  });
  const hasTransitions = project.transitions.some((t) => t.type !== 'none');
  const ranged = startMs > 0 || endMs < contentDurationMs(project);

  const main = [...videoClips].sort((a, b) => b.durationMs - a.durationMs)[0];
  const preferOriginal =
    format !== 'webm-vp8' &&
    !!main?.src &&
    !hasTimelineAudio &&
    !hasGraphics &&
    !hasTransitions &&
    !ranged &&
    (durationMs > CLIENT_REENCODE_MAX_MS ||
      (videoClips.length === 1 && main.src.startsWith('blob:')));

  if (preferOriginal && main?.src) {
    onProgress?.({ progress: 30, status: 'Downloading original media…' });
    const res = await fetch(main.src);
    const blob = await res.blob();
    const ext = blob.type.includes('webm') ? 'webm' : blob.type.includes('mp4') ? 'mp4' : 'mp4';
    const filename = `${safeName}.${ext}`;
    downloadBlob(blob, filename);
    onProgress?.({ progress: 100, status: 'Downloaded original media' });
    return { filename, mimeType: blob.type || 'video/mp4' };
  }

  if (durationMs > CLIENT_REENCODE_MAX_MS) {
    throw new Error(
      'Timeline longer than 2 minutes with music/overlays needs the FFmpeg worker for full export. Shorten the edit or remove extras to download the source.',
    );
  }

  const picked = pickMime(format);
  const mimeType = picked.mimeType;
  if (!mimeType) throw new Error('This browser cannot record video. Try Chrome or Edge.');
  if (picked.note) onProgress?.({ progress: 1, status: picked.note });

  const { width, height } = outputSize(project.aspectRatio);
  // Keep project fps for correct playback speed (capping caused slow exports when
  // frame paint lagged behind a forced sleep).
  const fps = Math.min(30, Math.max(15, project.fps || 30));
  const frameCount = Math.max(1, Math.ceil((durationMs / 1000) * fps));
  const frameInterval = 1000 / fps;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D not available');

  const imageCache = new Map<string, HTMLImageElement>();
  const videoCache = new Map<string, HTMLVideoElement>();
  for (const clip of project.clips) {
    if (!clip.src) continue;
    const track = project.tracks.find((t) => t.id === clip.trackId);
    if (track?.visible === false) continue;
    if (isVideoClip(project, clip)) {
      if (!videoCache.has(clip.src)) videoCache.set(clip.src, await loadVideo(clip.src));
    } else if (!imageCache.has(clip.src)) {
      imageCache.set(clip.src, await loadImage(clip.src));
    }
  }

  const audioCtx = new AudioContext();
  const dest = audioCtx.createMediaStreamDestination();
  const audioEls: HTMLAudioElement[] = [];

  for (const clip of timelineAudio) {
    const el = new Audio();
    el.crossOrigin = 'anonymous';
    el.preload = 'auto';
    el.src = clip.src;
    await new Promise<void>((resolve) => {
      el.addEventListener('canplaythrough', () => resolve(), { once: true });
      el.addEventListener('error', () => resolve(), { once: true });
      el.load();
    });
    const srcNode = audioCtx.createMediaElementSource(el);
    const gain = audioCtx.createGain();
    gain.gain.value = Math.min(1, Math.max(0, clip.volume ?? 0.85));
    srcNode.connect(gain);
    gain.connect(dest);
    audioEls.push(el);
    (el as HTMLAudioElement & { __startMs?: number }).__startMs = clip.startMs;
    (el as HTMLAudioElement & { __endMs?: number }).__endMs = clip.startMs + clip.durationMs;
  }

  if (audioCtx.state === 'suspended') await audioCtx.resume();

  // Real-time capture so MediaRecorder timestamps match wall clock (= correct speed).
  const canvasStream = canvas.captureStream(fps);
  const tracks = [...canvasStream.getVideoTracks()];
  if (hasTimelineAudio && dest.stream.getAudioTracks().length) {
    tracks.push(...dest.stream.getAudioTracks());
  }
  const combined = new MediaStream(tracks);

  const recorder = new MediaRecorder(combined, {
    mimeType,
    videoBitsPerSecond: 5_000_000,
    audioBitsPerSecond: hasTimelineAudio ? 128_000 : undefined,
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType.split(';')[0] }));
    recorder.onerror = () => reject(new Error('MediaRecorder failed'));
  });

  recorder.start(250);
  onProgress?.({
    progress: 2,
    status: hasTimelineAudio ? 'Recording video + audio…' : 'Recording frames…',
  });

  const vTrack = canvasStream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;
  const wallStart = performance.now();
  let frameIndex = 0;

  while (frameIndex < frameCount) {
    const elapsed = performance.now() - wallStart;
    // If paint is slow, skip ahead so wall-clock duration stays correct (no slow-mo).
    const expected = Math.min(frameCount - 1, Math.floor(elapsed / frameInterval));
    if (expected > frameIndex) frameIndex = expected;

    const tMs = Math.min(endMs - 1, startMs + (frameIndex / fps) * 1000);
    await paintFrame(ctx, width, height, project, tMs, imageCache, videoCache);

    for (const el of audioEls) {
      const aStart = (el as HTMLAudioElement & { __startMs?: number }).__startMs ?? 0;
      const aEnd = (el as HTMLAudioElement & { __endMs?: number }).__endMs ?? endMs;
      if (tMs >= aStart && tMs < aEnd) {
        const local = (tMs - aStart) / 1000;
        if (Math.abs(el.currentTime - local) > 0.35) {
          try {
            el.currentTime = Math.max(0, local);
          } catch {
            // ignore
          }
        }
        if (el.paused) void el.play().catch(() => undefined);
      } else if (!el.paused) {
        el.pause();
      }
    }

    vTrack?.requestFrame?.();
    frameIndex += 1;

    const nextAt = wallStart + frameIndex * frameInterval;
    const wait = nextAt - performance.now();
    if (wait > 2) await sleep(wait);

    if (frameIndex % 3 === 0 || frameIndex >= frameCount) {
      onProgress?.({
        progress: Math.round(5 + (frameIndex / frameCount) * 90),
        status: `Rendering ${Math.min(frameIndex, frameCount)}/${frameCount}`,
      });
    }
  }

  await sleep(120);
  for (const el of audioEls) el.pause();
  recorder.stop();
  combined.getTracks().forEach((t) => t.stop());
  await audioCtx.close().catch(() => undefined);

  const blob = await stopped;
  if (blob.size < 100) {
    throw new Error('Export produced an empty video.');
  }

  const filename = `${safeName}.${picked.ext}`;
  downloadBlob(blob, filename);
  onProgress?.({
    progress: 100,
    status: hasTimelineAudio
      ? `Downloaded ${picked.ext.toUpperCase()} with audio`
      : `Downloaded ${picked.ext.toUpperCase()}`,
  });

  for (const v of videoCache.values()) {
    v.pause();
    v.removeAttribute('src');
    v.load();
  }
  for (const el of audioEls) {
    el.removeAttribute('src');
    el.load();
  }

  return { filename, mimeType: blob.type || mimeType.split(';')[0]! };
}

async function paintFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  project: VideoProject,
  tMs: number,
  images: Map<string, HTMLImageElement>,
  videos: Map<string, HTMLVideoElement>,
): Promise<void> {
  ctx.fillStyle = '#0a1214';
  ctx.fillRect(0, 0, width, height);

  const active = project.clips.filter((c) => {
    if (tMs < c.startMs || tMs >= c.startMs + c.durationMs) return false;
    const track = project.tracks.find((t) => t.id === c.trackId);
    return track?.visible !== false;
  });
  const mediaClips = active.filter((c) => c.src);
  const textClips = active.filter((c) => c.text);

  for (const clip of mediaClips) {
    await drawClipMedia(ctx, width, height, project, clip, tMs, images, videos);
  }

  if (mediaClips.length === 0) {
    const g = ctx.createRadialGradient(
      width * 0.4,
      height * 0.3,
      20,
      width * 0.5,
      height * 0.5,
      width,
    );
    g.addColorStop(0, 'rgba(20,184,166,0.35)');
    g.addColorStop(1, '#0a1214');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }

  for (const clip of textClips) {
    drawTextOverlay(ctx, width, height, clip);
  }
}

async function drawClipMedia(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  project: VideoProject,
  clip: Clip,
  tMs: number,
  images: Map<string, HTMLImageElement>,
  videos: Map<string, HTMLVideoElement>,
): Promise<void> {
  if (!clip.src) return;
  const speed = clip.speed && clip.speed > 0 ? clip.speed : 1;
  const kind = trackKind(project, clip.trackId);
  const dest = mediaDestRect(clip, width, height, kind);
  const tr = resolveClipTransition(project, clip.id, tMs, clip.startMs, clip.durationMs);

  ctx.save();
  ctx.filter = canvasFilterForClip(clip);
  applyTransitionToCanvas(ctx, width, height, tr);

  if (isVideoClip(project, clip)) {
    const video = videos.get(clip.src);
    if (!video) {
      ctx.restore();
      return;
    }
    const localSec = ((tMs - clip.startMs) * speed + clip.sourceOffsetMs) / 1000;
    await seekVideo(video, localSec);
    const mw = video.videoWidth || width;
    const mh = video.videoHeight || height;
    if (dest.fullBleed) {
      drawCover(ctx, video, mw, mh, width, height);
    } else {
      drawContainInBox(ctx, video, mw, mh, dest.x, dest.y, dest.w, dest.h);
    }
    ctx.restore();
    return;
  }
  const img = images.get(clip.src);
  if (!img) {
    ctx.restore();
    return;
  }
  const mw = img.naturalWidth || width;
  const mh = img.naturalHeight || height;
  if (dest.fullBleed) {
    drawCover(ctx, img, mw, mh, width, height);
  } else {
    drawContainInBox(ctx, img, mw, mh, dest.x, dest.y, dest.w, dest.h);
  }
  ctx.restore();
}

function drawTextOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  clip: Clip,
): void {
  const text = clip.text ?? clip.name;
  const style = { ...DEFAULT_TEXT_STYLE(), ...(clip.textStyle ?? {}) };
  const layout = clip.layout ?? DEFAULT_LAYOUT();
  const x = (layout.x / 100) * width;
  const y = (layout.y / 100) * height;
  const fontPx = Math.round(style.fontSize * (width / 360));

  ctx.save();
  ctx.fillStyle = style.color;
  ctx.textAlign = style.align;
  ctx.textBaseline = 'middle';
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${fontPx}px "${style.fontFamily}", Georgia, serif`;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 12;
  if (style.strokeWidth && style.strokeColor) {
    ctx.strokeStyle = style.strokeColor;
    ctx.lineWidth = style.strokeWidth;
    ctx.strokeText(text, x, y, width * 0.9);
  }
  ctx.fillText(text, x, y, width * 0.9);
  ctx.restore();
}
