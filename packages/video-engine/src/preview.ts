/**
 * Preview clock — kept separate from export so timeline UI stays responsive.
 * Export workers never read this; they render from VideoProject JSON + assets.
 */
export interface PreviewClock {
  currentMs: number;
  playing: boolean;
  pxPerSecond: number;
}

export const DEFAULT_PREVIEW: PreviewClock = {
  currentMs: 0,
  playing: false,
  pxPerSecond: 40,
};

export function seek(clock: PreviewClock, ms: number, durationMs: number): PreviewClock {
  return { ...clock, currentMs: Math.min(durationMs, Math.max(0, ms)) };
}

export function setPlaying(clock: PreviewClock, playing: boolean): PreviewClock {
  return { ...clock, playing };
}

export function tick(clock: PreviewClock, deltaMs: number, durationMs: number): PreviewClock {
  if (!clock.playing) return clock;
  const next = clock.currentMs + deltaMs;
  if (next >= durationMs) return { ...clock, currentMs: durationMs, playing: false };
  return { ...clock, currentMs: next };
}

export function setTimelineZoom(clock: PreviewClock, pxPerSecond: number): PreviewClock {
  return { ...clock, pxPerSecond: Math.min(400, Math.max(0.15, pxPerSecond)) };
}
