/**
 * Client-side video AI + effect helpers that mutate VideoProject visibly.
 */
'use client';

import type { CSSProperties } from 'react';
import { createId } from '@sn-editor/shared';
import { VideoAiTool, type VideoAiToolId } from '@sn-editor/ai-contracts';
import type { AspectRatio, Clip, VideoProject } from '@sn-editor/video-engine';

/** Canva-style Animate presets (ids stay stable for projects). */
export const VIDEO_EFFECTS = [
  { id: 'shake', label: 'Shake Zoom', hint: 'Handheld shake + punch', category: 'Featured' },
  { id: 'zoom_punch', label: 'Whip Slide', hint: 'Fast punch zoom', category: 'Featured' },
  { id: 'vhs', label: 'Old TV', hint: 'Tape / CRT vibe', category: 'Featured' },
  { id: 'glitch_flash', label: 'Chroma Wave', hint: 'RGB wave glitch', category: 'Featured' },
  { id: 'fade', label: 'Ripple', hint: 'Soft edge fade', category: 'Featured' },
  { id: 'blur_soft', label: 'Slow Wave', hint: 'Dreamy soft blur', category: 'Featured' },
  { id: 'color_grade', label: 'Brush', hint: 'Painted color grade', category: 'Reveal' },
  { id: 'glow', label: 'Ink', hint: 'Soft neon ink glow', category: 'Reveal' },
  { id: 'mirror', label: 'Mirror', hint: 'Horizontal flip', category: 'Reveal' },
  { id: 'bw_punch', label: 'Mono Punch', hint: 'High-contrast mono', category: 'Reveal' },
] as const;

export type VideoEffectId = (typeof VIDEO_EFFECTS)[number]['id'];

function trackId(project: VideoProject, kind: string): string {
  return project.tracks.find((t) => t.kind === kind)?.id ?? project.tracks[0]!.id;
}

function touch(project: VideoProject): VideoProject {
  return {
    ...project,
    meta: { ...project.meta, updatedAt: new Date().toISOString() },
  };
}

function placeholderSvg(label: string, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 720">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="${color}"/><stop offset="1" stop-color="#0a1214"/>
    </linearGradient></defs>
    <rect width="720" height="720" fill="url(#g)"/>
    <text x="360" y="360" text-anchor="middle" fill="#f4f7f8" font-family="system-ui,sans-serif"
      font-size="42" font-weight="700">${label}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function mediaPlaceholderSrc(
  kind: 'product' | 'broll' | 'logo',
): string {
  if (kind === 'product') return placeholderSvg('Product', '#0f766e');
  if (kind === 'broll') return placeholderSvg('B-roll', '#1e3a45');
  return placeholderSvg('Logo', '#14b8a6');
}

export function applyEffectToClip(
  project: VideoProject,
  clipId: string,
  effectId: VideoEffectId,
  mode: 'toggle' | 'add' = 'toggle',
): VideoProject {
  const clips = project.clips.map((c) => {
    if (c.id !== clipId) return c;
    const ids = new Set(c.effectIds ?? []);
    const settings = { ...(c.effectSettings ?? {}) };
    if (mode === 'add') {
      ids.add(effectId);
      if (!settings[effectId]) {
        settings[effectId] = {
          durationMs: Math.max(800, Math.round(c.durationMs * 0.4)),
          intensity: 100,
        };
      }
    } else if (ids.has(effectId)) {
      ids.delete(effectId);
      delete settings[effectId];
    } else {
      ids.add(effectId);
      settings[effectId] = {
        durationMs: Math.max(800, Math.round(c.durationMs * 0.4)),
        intensity: 100,
      };
    }
    return { ...c, effectIds: [...ids], effectSettings: settings };
  });
  return touch({ ...project, clips });
}

function phaseWindow(
  clip: Clip,
  phase: 'both' | 'enter' | 'exit' | undefined,
  durationMs: number | undefined,
): { offset: number; dur: number } {
  const clipDur = Math.max(1, clip.durationMs);
  const windowMs = Math.max(
    200,
    Math.min(clipDur, durationMs ?? Math.round(clipDur * 0.4)),
  );
  if (phase === 'exit') {
    return { offset: Math.max(0, clipDur - windowMs), dur: windowMs };
  }
  if (phase === 'enter') {
    return { offset: 0, dur: windowMs };
  }
  // both — full clip (intensity still applies)
  return { offset: 0, dur: clipDur };
}

/** Active effect ids at a local time within the clip (respects phase + offset + duration). */
export function activeEffectIdsAt(clip: Clip, localMs: number): string[] {
  const ids = clip.effectIds ?? [];
  if (!ids.length) return [];
  return ids.filter((id) => {
    const s = clip.effectSettings?.[id];
    const phase = s?.phase;
    if (phase === 'enter' || phase === 'exit' || phase === 'both') {
      const { offset, dur } = phaseWindow(clip, phase, s?.durationMs);
      return localMs >= offset && localMs <= offset + dur;
    }
    const offset = Math.max(0, s?.offsetMs ?? 0);
    const dur = s?.durationMs;
    if (dur == null || dur <= 0) return localMs >= offset;
    return localMs >= offset && localMs <= offset + dur;
  });
}

export interface VideoAiResult {
  project: VideoProject;
  message: string;
  aspectRatio?: AspectRatio;
}

export function applyVideoAiTool(
  project: VideoProject,
  tool: VideoAiToolId,
  playheadMs = 0,
): VideoAiResult {
  const now = playheadMs;

  switch (tool) {
    case VideoAiTool.MakeTikTokAd: {
      const videoTrack = trackId(project, 'video');
      const textTrack = trackId(project, 'text');
      const overlayTrack = trackId(project, 'overlay');
      const hook: Clip = {
        id: createId('clip'),
        trackId: textTrack,
        name: 'Hook',
        startMs: 0,
        durationMs: 2500,
        sourceOffsetMs: 0,
        text: 'Wait for it…',
      };
      const broll: Clip = {
        id: createId('clip'),
        trackId: overlayTrack,
        name: 'B-roll',
        startMs: 2000,
        durationMs: 3500,
        sourceOffsetMs: 0,
        src: mediaPlaceholderSrc('broll'),
        effectIds: ['zoom_punch'],
      };
      const caption: Clip = {
        id: createId('clip'),
        trackId: textTrack,
        name: 'Caption',
        startMs: 2500,
        durationMs: 4000,
        sourceOffsetMs: 0,
        text: 'This product changes everything',
      };
      const cta: Clip = {
        id: createId('clip'),
        trackId: textTrack,
        name: 'CTA',
        startMs: Math.max(project.durationMs - 3000, 8000),
        durationMs: 3000,
        sourceOffsetMs: 0,
        text: 'Shop now →',
      };
      // Keep existing video clips; assemble ad layers on top
      let clips = [...project.clips];
      if (!clips.some((c) => c.trackId === videoTrack && c.src)) {
        clips.push({
          id: createId('clip'),
          trackId: videoTrack,
          name: 'Product hero',
          startMs: 0,
          durationMs: 8000,
          sourceOffsetMs: 0,
          src: mediaPlaceholderSrc('product'),
        });
      }
      clips = [...clips, hook, broll, caption, cta];
      const audio = [
        ...project.audio,
        {
          id: createId('audio'),
          trackId: trackId(project, 'audio'),
          name: 'TikTok bed',
          startMs: 0,
          durationMs: Math.max(project.durationMs, 12000),
          src: '',
          volume: 0.7,
        },
      ];
      return {
        project: touch({
          ...project,
          aspectRatio: '9:16',
          durationMs: Math.max(project.durationMs, 12000),
          clips,
          audio,
        }),
        message: 'TikTok ad assembled (hook, B-roll, captions, CTA)',
        aspectRatio: '9:16',
      };
    }
    case VideoAiTool.AutoSubtitle:
    case VideoAiTool.AutoCaption: {
      const textTrack = trackId(project, 'text');
      const captions: Clip[] = project.clips
        .filter((c) => !c.text && (c.src || c.name))
        .slice(0, 4)
        .map((c, i) => ({
          id: createId('clip'),
          trackId: textTrack,
          name: `Caption ${i + 1}`,
          startMs: c.startMs,
          durationMs: Math.min(c.durationMs, 2800),
          sourceOffsetMs: 0,
          text: c.name.replace(/[-_]/g, ' '),
        }));
      if (captions.length === 0) {
        captions.push({
          id: createId('clip'),
          trackId: textTrack,
          name: 'Caption',
          startMs: now,
          durationMs: 3000,
          sourceOffsetMs: 0,
          text: 'Auto caption line',
        });
      }
      return {
        project: touch({ ...project, clips: [...project.clips, ...captions] }),
        message: `Added ${captions.length} caption(s)`,
      };
    }
    case VideoAiTool.AutoHighlight: {
      const clips = project.clips.map((c, i) =>
        i === 0 || c.id === project.clips.find((x) => x.src)?.id
          ? { ...c, effectIds: [...new Set([...(c.effectIds ?? []), 'zoom_punch'])] }
          : c,
      );
      return {
        project: touch({ ...project, clips }),
        message: 'Highlight zoom applied to hero clip',
      };
    }
    case VideoAiTool.RemoveSilence: {
      // Pack clips on each track with no gaps
      const byTrack = new Map<string, Clip[]>();
      for (const c of project.clips) {
        const list = byTrack.get(c.trackId) ?? [];
        list.push(c);
        byTrack.set(c.trackId, list);
      }
      const clips: Clip[] = [];
      for (const [, list] of byTrack) {
        list.sort((a, b) => a.startMs - b.startMs);
        let cursor = 0;
        for (const c of list) {
          clips.push({ ...c, startMs: cursor });
          cursor += c.durationMs;
        }
      }
      return {
        project: touch({ ...project, clips }),
        message: 'Gaps removed (clips packed)',
      };
    }
    case VideoAiTool.AiVoiceover: {
      return {
        project: touch({
          ...project,
          audio: [
            ...project.audio,
            {
              id: createId('audio'),
              trackId: trackId(project, 'audio'),
              name: 'AI Voiceover',
              startMs: now,
              durationMs: 8000,
              src: '',
              volume: 1,
            },
          ],
        }),
        message: 'AI voiceover track added',
      };
    }
    case VideoAiTool.AiTranslation: {
      const clips = project.clips.map((c) =>
        c.text
          ? { ...c, text: `${c.text} · ${c.text} (ES)`, name: `${c.name} +ES` }
          : c,
      );
      const hasText = clips.some((c) => c.text);
      if (!hasText) {
        clips.push({
          id: createId('clip'),
          trackId: trackId(project, 'text'),
          name: 'Translated',
          startMs: now,
          durationMs: 3000,
          sourceOffsetMs: 0,
          text: 'Hello · Hola',
        });
      }
      return {
        project: touch({ ...project, clips }),
        message: 'Translation captions applied',
      };
    }
    case VideoAiTool.AutoResize: {
      const next: AspectRatio =
        project.aspectRatio === '9:16'
          ? '1:1'
          : project.aspectRatio === '1:1'
            ? '16:9'
            : '9:16';
      return {
        project: touch({ ...project, aspectRatio: next }),
        message: `Resized to ${next}`,
        aspectRatio: next,
      };
    }
    case VideoAiTool.BRollSuggest: {
      const clip: Clip = {
        id: createId('clip'),
        trackId: trackId(project, 'overlay'),
        name: 'Suggested B-roll',
        startMs: now,
        durationMs: 3000,
        sourceOffsetMs: 0,
        src: mediaPlaceholderSrc('broll'),
        effectIds: ['fade'],
      };
      return {
        project: touch({ ...project, clips: [...project.clips, clip] }),
        message: 'B-roll suggestion added on Overlay',
      };
    }
    case VideoAiTool.AiTransition: {
      const sorted = [...project.clips]
        .filter((c) => project.tracks.find((t) => t.id === c.trackId)?.kind === 'video')
        .sort((a, b) => a.startMs - b.startMs);
      if (sorted.length < 2) {
        return { project, message: 'Need 2+ video clips for a transition' };
      }
      const from = sorted[0]!;
      const to = sorted[1]!;
      return {
        project: touch({
          ...project,
          transitions: [
            ...project.transitions,
            {
              id: createId('tr'),
              fromClipId: from.id,
              toClipId: to.id,
              type: 'fade',
              durationMs: 400,
            },
          ],
          clips: project.clips.map((c) =>
            c.id === to.id
              ? { ...c, effectIds: [...new Set([...(c.effectIds ?? []), 'fade'])] }
              : c,
          ),
        }),
        message: 'Fade transition added',
      };
    }
    case VideoAiTool.HookGenerator: {
      const clip: Clip = {
        id: createId('clip'),
        trackId: trackId(project, 'text'),
        name: 'Hook',
        startMs: 0,
        durationMs: 2200,
        sourceOffsetMs: 0,
        text: 'Stop scrolling — watch this',
        effectIds: ['zoom_punch'],
      };
      return {
        project: touch({ ...project, clips: [...project.clips, clip] }),
        message: 'Hook text added at 0:00',
      };
    }
    case VideoAiTool.CtaEnding: {
      const start = Math.max(0, project.durationMs - 3000);
      const clip: Clip = {
        id: createId('clip'),
        trackId: trackId(project, 'text'),
        name: 'CTA Ending',
        startMs: start,
        durationMs: 3000,
        sourceOffsetMs: 0,
        text: 'Shop now · Link in bio',
      };
      return {
        project: touch({ ...project, clips: [...project.clips, clip] }),
        message: 'CTA ending added',
      };
    }
    case VideoAiTool.BackgroundMusic: {
      return {
        project: touch({
          ...project,
          audio: [
            ...project.audio,
            {
              id: createId('audio'),
              trackId: trackId(project, 'audio'),
              name: 'AI Background Music',
              startMs: 0,
              durationMs: project.durationMs,
              src: '',
              volume: 0.55,
            },
          ],
        }),
        message: 'Background music bed added',
      };
    }
    case VideoAiTool.ProductAnimation: {
      const clip: Clip = {
        id: createId('clip'),
        trackId: trackId(project, 'logo'),
        name: 'Product anim',
        startMs: now,
        durationMs: 4000,
        sourceOffsetMs: 0,
        src: mediaPlaceholderSrc('product'),
        effectIds: ['zoom_punch', 'fade'],
      };
      return {
        project: touch({ ...project, clips: [...project.clips, clip] }),
        message: 'Product animation clip added',
      };
    }
    default:
      return { project, message: 'Tool not available yet' };
  }
}

/** CSS filter / transform hints for preview from effect ids. */
export function previewStyleForEffects(
  effectIds?: string[],
  intensityById?: Record<string, number>,
): CSSProperties {
  if (!effectIds?.length) return {};
  const style: CSSProperties = {};
  const filters: string[] = [];
  const intensity = (id: string) =>
    Math.max(0, Math.min(100, intensityById?.[id] ?? 100)) / 100;

  if (effectIds.includes('color_grade')) {
    const i = intensity('color_grade');
    filters.push(
      `saturate(${1 + 0.25 * i}) contrast(${1 + 0.1 * i}) hue-rotate(${-8 * i}deg)`,
    );
  }
  if (effectIds.includes('glitch_flash')) {
    const i = intensity('glitch_flash');
    filters.push(`saturate(${1 + 0.6 * i}) contrast(${1 + 0.35 * i})`);
  }
  if (effectIds.includes('blur_soft')) {
    filters.push(`blur(${2.5 * intensity('blur_soft')}px)`);
  }
  if (effectIds.includes('vhs')) {
    const i = intensity('vhs');
    filters.push(
      `contrast(${1 + 0.25 * i}) saturate(${1 + 0.35 * i}) hue-rotate(${6 * i}deg)`,
    );
  }
  if (effectIds.includes('glow')) {
    filters.push(`brightness(${1 + 0.12 * intensity('glow')})`);
  }
  if (effectIds.includes('bw_punch')) {
    filters.push(
      `grayscale(${intensity('bw_punch')}) contrast(${1 + 0.3 * intensity('bw_punch')})`,
    );
  }
  if (filters.length) style.filter = filters.join(' ');

  const transforms: string[] = [];
  if (effectIds.includes('zoom_punch')) {
    transforms.push(`scale(${1 + 0.08 * intensity('zoom_punch')})`);
  }
  if (effectIds.includes('mirror')) transforms.push('scaleX(-1)');
  if (effectIds.includes('shake')) {
    transforms.push(`translateX(${2 * intensity('shake')}px)`);
  }
  if (transforms.length) {
    style.transform = transforms.join(' ');
    style.transformOrigin = 'center center';
  }
  if (effectIds.includes('fade')) {
    style.opacity = 1 - 0.12 * intensity('fade');
  }
  if (effectIds.includes('glow')) {
    const i = intensity('glow');
    style.boxShadow = `0 0 ${24 * i}px rgba(20,184,166,${0.45 * i})`;
  }
  return style;
}
