import type { Clip, VideoProject } from './types';
import { createId } from '@sn-editor/shared';

function touch(project: VideoProject): VideoProject {
  return {
    ...project,
    meta: { ...project.meta, updatedAt: new Date().toISOString() },
  };
}

/** Split a clip at absolute timeline time (ms). */
export function splitClip(project: VideoProject, clipId: string, atMs: number): VideoProject {
  const clip = project.clips.find((c) => c.id === clipId);
  if (!clip) return project;
  const local = atMs - clip.startMs;
  if (local <= 0 || local >= clip.durationMs) return project;

  const left: Clip = { ...clip, durationMs: local };
  const right: Clip = {
    ...clip,
    id: createId('clip'),
    startMs: atMs,
    durationMs: clip.durationMs - local,
    sourceOffsetMs: clip.sourceOffsetMs + local,
  };

  return touch({
    ...project,
    clips: project.clips.flatMap((c) => (c.id === clipId ? [left, right] : [c])),
  });
}

/** Trim clip edges; `edge` selects which side. */
export function trimClip(
  project: VideoProject,
  clipId: string,
  edge: 'start' | 'end',
  newMs: number,
): VideoProject {
  const next = touch({
    ...project,
    clips: project.clips.map((c) => {
      if (c.id !== clipId) return c;
      if (edge === 'start') {
        const delta = newMs - c.startMs;
        if (delta <= 0 || delta >= c.durationMs) return c;
        return {
          ...c,
          startMs: newMs,
          durationMs: c.durationMs - delta,
          sourceOffsetMs: c.sourceOffsetMs + delta,
        };
      }
      const durationMs = Math.max(1, newMs - c.startMs);
      return { ...c, durationMs };
    }),
  });
  return fitProjectDuration(next);
}

/**
 * Ripple delete: remove clip and shift later clips on the same track left.
 */
export function rippleDelete(project: VideoProject, clipId: string): VideoProject {
  const clip = project.clips.find((c) => c.id === clipId);
  if (!clip) return project;
  const remaining = project.clips.filter((c) => c.id !== clipId).map((c) => {
    if (c.trackId !== clip.trackId || c.startMs < clip.startMs) return c;
    return { ...c, startMs: c.startMs - clip.durationMs };
  });
  return fitProjectDuration(touch({ ...project, clips: remaining }));
}

export function moveClip(
  project: VideoProject,
  clipId: string,
  startMs: number,
  trackId?: string,
): VideoProject {
  return fitProjectDuration(
    touch({
      ...project,
      clips: project.clips.map((c) =>
        c.id === clipId
          ? { ...c, startMs: Math.max(0, startMs), trackId: trackId ?? c.trackId }
          : c,
      ),
    }),
  );
}

export function addClip(project: VideoProject, clip: Omit<Clip, 'id'> & { id?: string }): VideoProject {
  const full: Clip = { ...clip, id: clip.id ?? createId('clip') };
  return fitProjectDuration(touch({ ...project, clips: [...project.clips, full] }));
}

/** Latest end time across clips + audio (ms). */
export function contentEndMs(project: VideoProject): number {
  let end = 0;
  for (const c of project.clips) end = Math.max(end, c.startMs + c.durationMs);
  for (const a of project.audio) end = Math.max(end, a.startMs + a.durationMs);
  return end;
}

/**
 * Set project.durationMs to the last frame of content (no padded empty tail).
 * Empty projects stay at 0 so the timeline does not fake a 15s length.
 */
export function fitProjectDuration(project: VideoProject): VideoProject {
  const durationMs = contentEndMs(project);
  if (durationMs === project.durationMs) return project;
  return touch({ ...project, durationMs });
}

/** Suggest zoom so a long timeline (~hours) still fits on screen. */
export function suggestPxPerSecond(durationMs: number, targetLanePx = 960): number {
  const seconds = Math.max(1, durationMs / 1000);
  const raw = targetLanePx / seconds;
  return Math.min(120, Math.max(0.15, Number(raw.toFixed(2))));
}

/** Timeline zoom: pixels-per-second helper. */
export function msToPx(ms: number, pxPerSecond: number): number {
  return (ms / 1000) * pxPerSecond;
}

export function pxToMs(px: number, pxPerSecond: number): number {
  return (px / pxPerSecond) * 1000;
}
