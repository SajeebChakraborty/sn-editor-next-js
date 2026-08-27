/**
 * Resolve live CSS / canvas transition visuals for a clip at playhead time.
 * Works for multi-clip joins and single-clip intro/outro (self-transition).
 */
import type { VideoProject } from '@sn-editor/video-engine';
import type { CSSProperties } from 'react';

export interface TransitionVisual {
  opacity: number;
  transform: string;
  filter: string;
  clipPath: string;
  /** 0 = fully away, 1 = fully visible */
  visibility: number;
  activeType: string | null;
  phase: 'in' | 'out' | 'none';
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Map transition type + visibility (0 hidden → 1 shown) to style. */
export function styleFromVisibility(type: string, t: number): Omit<TransitionVisual, 'visibility' | 'activeType' | 'phase'> {
  const v = clamp01(t);
  const away = 1 - v;

  switch (type) {
    case 'none':
      return { opacity: 1, transform: 'none', filter: 'none', clipPath: 'none' };
    case 'fade':
    case 'dissolve':
      return { opacity: v, transform: 'none', filter: 'none', clipPath: 'none' };
    case 'slide_left':
      return {
        opacity: Math.max(0.15, v),
        transform: `translateX(${away * 100}%)`,
        filter: 'none',
        clipPath: 'none',
      };
    case 'slide_right':
      return {
        opacity: Math.max(0.15, v),
        transform: `translateX(${-away * 100}%)`,
        filter: 'none',
        clipPath: 'none',
      };
    case 'slide_up':
      return {
        opacity: Math.max(0.15, v),
        transform: `translateY(${away * 100}%)`,
        filter: 'none',
        clipPath: 'none',
      };
    case 'slide_down':
      return {
        opacity: Math.max(0.15, v),
        transform: `translateY(${-away * 100}%)`,
        filter: 'none',
        clipPath: 'none',
      };
    case 'zoom':
      return {
        opacity: v,
        transform: `scale(${1 + away * 0.55})`,
        filter: 'none',
        clipPath: 'none',
      };
    case 'zoom_out':
      return {
        opacity: v,
        transform: `scale(${1 - away * 0.45})`,
        filter: 'none',
        clipPath: 'none',
      };
    case 'wipe':
      return {
        opacity: 1,
        transform: 'none',
        filter: 'none',
        clipPath: `inset(0 ${(1 - v) * 100}% 0 0)`,
      };
    case 'wipe_vertical':
      return {
        opacity: 1,
        transform: 'none',
        filter: 'none',
        clipPath: `inset(${(1 - v) * 100}% 0 0 0)`,
      };
    case 'blur':
      return {
        opacity: v,
        transform: 'none',
        filter: `blur(${away * 12}px)`,
        clipPath: 'none',
      };
    case 'flash':
      return {
        opacity: v,
        transform: 'none',
        filter: v < 0.35 ? `brightness(${1 + (1 - v / 0.35) * 1.8})` : 'none',
        clipPath: 'none',
      };
    case 'spin':
      return {
        opacity: v,
        transform: `rotate(${away * -28}deg) scale(${1 + away * 0.25})`,
        filter: 'none',
        clipPath: 'none',
      };
    default:
      return { opacity: v, transform: 'none', filter: 'none', clipPath: 'none' };
  }
}

/**
 * Pick the strongest active transition for this clip at tMs.
 * - Intro: transition where toClipId === clipId (includes single-clip self-transition)
 * - Outro: transition where fromClipId === clipId (and not the same intro window)
 */
export function resolveClipTransition(
  project: VideoProject,
  clipId: string,
  tMs: number,
  startMs: number,
  durationMs: number,
): TransitionVisual {
  const endMs = startMs + durationMs;
  const intros = project.transitions.filter((t) => t.toClipId === clipId && t.type !== 'none');
  const outros = project.transitions.filter((t) => t.fromClipId === clipId && t.type !== 'none');

  // Prefer intro at the start of the clip (or custom startMs if moved)
  for (const tr of intros) {
    const d = Math.max(120, tr.durationMs || 800);
    const windowStart = tr.startMs ?? startMs;
    if (tMs >= windowStart && tMs < windowStart + d) {
      const v = clamp01((tMs - windowStart) / d);
      const styled = styleFromVisibility(tr.type, v);
      return { ...styled, visibility: v, activeType: tr.type, phase: 'in' };
    }
  }

  // Outro at the end — skip if this is a self-transition already used as intro only
  // For self-transition (from===to), also run outro in the last `d` ms
  for (const tr of outros) {
    const d = Math.max(120, tr.durationMs || 800);
    const windowStart = tr.startMs ?? endMs - d;
    if (tMs >= windowStart && tMs < windowStart + d) {
      const v = clamp01(1 - (tMs - windowStart) / d);
      const styled = styleFromVisibility(tr.type, v);
      return { ...styled, visibility: v, activeType: tr.type, phase: 'out' };
    }
  }

  return {
    opacity: 1,
    transform: 'none',
    filter: 'none',
    clipPath: 'none',
    visibility: 1,
    activeType: null,
    phase: 'none',
  };
}

export function transitionVisualToCss(vis: TransitionVisual): CSSProperties {
  const style: CSSProperties = {
    opacity: vis.opacity,
  };
  if (vis.transform && vis.transform !== 'none') style.transform = vis.transform;
  if (vis.filter && vis.filter !== 'none') style.filter = vis.filter;
  if (vis.clipPath && vis.clipPath !== 'none') style.clipPath = vis.clipPath;
  return style;
}

/** Apply transition matrix for canvas export. */
export function applyTransitionToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  vis: TransitionVisual,
): void {
  ctx.globalAlpha = Math.max(0, Math.min(1, vis.opacity));
  if (vis.filter && vis.filter !== 'none' && 'filter' in ctx) {
    (ctx as CanvasRenderingContext2D & { filter: string }).filter = vis.filter;
  }

  // Approximate transforms around frame center
  const cx = width / 2;
  const cy = height / 2;
  ctx.translate(cx, cy);

  const tr = vis.transform;
  const scaleMatch = /scale\(([^)]+)\)/.exec(tr);
  const rotMatch = /rotate\(([^)]+)deg\)/.exec(tr);
  const txMatch = /translateX\(([^)]+)%\)/.exec(tr);
  const tyMatch = /translateY\(([^)]+)%\)/.exec(tr);

  if (txMatch) ctx.translate((parseFloat(txMatch[1]!) / 100) * width, 0);
  if (tyMatch) ctx.translate(0, (parseFloat(tyMatch[1]!) / 100) * height);
  if (rotMatch) ctx.rotate((parseFloat(rotMatch[1]!) * Math.PI) / 180);
  if (scaleMatch) {
    const s = parseFloat(scaleMatch[1]!);
    ctx.scale(s, s);
  }

  ctx.translate(-cx, -cy);

  // Wipe via clip
  if (vis.clipPath.startsWith('inset(')) {
    const nums = vis.clipPath
      .replace(/inset\(|\)|%/g, '')
      .trim()
      .split(/\s+/)
      .map((n) => parseFloat(n) || 0);
    const [top = 0, right = 0, bottom = 0, left = 0] = nums;
    const x = (left / 100) * width;
    const y = (top / 100) * height;
    const w = width * (1 - left / 100 - right / 100);
    const h = height * (1 - top / 100 - bottom / 100);
    ctx.beginPath();
    ctx.rect(x, y, Math.max(0, w), Math.max(0, h));
    ctx.clip();
  }
}
