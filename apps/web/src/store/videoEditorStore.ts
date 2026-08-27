/**
 * Zustand store for CapCut-style video editing.
 * Includes project history for Ctrl+Z / Ctrl+Y.
 */
'use client';

import { create } from 'zustand';
import {
  addClip,
  createEmptyVideoProject,
  DEFAULT_PREVIEW,
  ensureProjectTracks,
  fitProjectDuration,
  moveClip,
  rippleDelete,
  seek,
  setPlaying,
  setTimelineZoom,
  splitClip,
  suggestPxPerSecond,
  tick,
  trimClip,
  type AspectRatio,
  type AudioClip,
  type Clip,
  type PreviewClock,
  type VideoProject,
} from '@sn-editor/video-engine';
import { createId } from '@sn-editor/shared';
import {
  applyEffectToClip,
  applyVideoAiTool,
  mediaPlaceholderSrc,
  type VideoEffectId,
} from '@/lib/clientVideoEffects';
import { adjustForPreset } from '@/lib/videoClipStyles';
import type { VideoAiToolId } from '@sn-editor/ai-contracts';
import type { FxDragKind } from '@/lib/fxDragDrop';
import {
  DEFAULT_LAYOUT,
  DEFAULT_LOGO_LAYOUT,
  DEFAULT_OVERLAY_LAYOUT,
  DEFAULT_STICKER_LAYOUT,
  DEFAULT_TEXT_STYLE,
  type ClipTextStyle,
} from '@sn-editor/video-engine';

export type VideoPanel =
  | 'media'
  | 'elements'
  | 'text'
  | 'audio'
  | 'tools'
  | 'effects'
  | 'transitions'
  | 'filters'
  | 'ai'
  | 'export'
  | 'layers'
  | 'align';

const MAX_HISTORY = 60;

interface VideoEditorState {
  project: VideoProject;
  past: VideoProject[];
  future: VideoProject[];
  clock: PreviewClock;
  selectedClipId: string | null;
  activePanel: VideoPanel;
  statusMessage: string | null;

  setActivePanel: (panel: VideoPanel) => void;
  setSelectedClipId: (id: string | null) => void;
  setAspectRatio: (aspectRatio: AspectRatio) => void;
  setProjectName: (name: string) => void;
  setStatusMessage: (msg: string | null) => void;
  newProject: () => void;
  reorderTracks: (orderedIds: string[]) => void;
  alignSelected: (
    mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom',
  ) => void;

  /** Push a project mutation onto undo history. */
  commit: (next: VideoProject, message?: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  addMediaClip: (
    name: string,
    durationMs?: number,
    trackKind?: string,
    src?: string,
  ) => void;
  addPlaceholderClip: (kind: 'product' | 'broll' | 'logo') => void;
  addTextClip: (text: string, textStyle?: Partial<ClipTextStyle>) => void;
  addAudioClip: (name: string, src?: string, durationMs?: number) => void;

  splitAtPlayhead: () => void;
  trimSelected: (edge: 'start' | 'end', newMs: number) => void;
  trimClipById: (clipId: string, edge: 'start' | 'end', newMs: number) => void;
  rippleDeleteSelected: () => void;
  moveSelected: (startMs: number) => void;
  moveClipById: (clipId: string, startMs: number) => void;
  snapClipsToStart: () => void;
  fitToContent: () => void;

  toggleTrackMute: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
  toggleTrackVisible: (trackId: string) => void;
  removeClip: (clipId: string) => void;

  applyEffect: (effectId: VideoEffectId) => void;
  applyFxToClip: (clipId: string, kind: FxDragKind, id: string) => void;
  setEffectSetting: (
    clipId: string,
    effectId: string,
    patch: {
      durationMs?: number;
      intensity?: number;
      offsetMs?: number;
      phase?: 'both' | 'enter' | 'exit';
    },
  ) => void;
  setFilterStrength: (clipId: string, strength: number) => void;
  setTransitionDuration: (toClipId: string, durationMs: number) => void;
  /** Move/resize a transition block on the Transition track (Canva-style). */
  moveTransitionBlock: (transitionId: string, startMs: number, durationMs: number) => void;
  /** Move/resize an effect block on the Effects track. */
  moveEffectBlock: (
    clipId: string,
    effectId: string,
    offsetMs: number,
    durationMs: number,
  ) => void;
  runVideoAi: (tool: VideoAiToolId) => string;

  /** Patch any clip fields (text style, layout, speed, adjust, preset…). */
  patchClip: (clipId: string, patch: Partial<Clip>, message?: string) => void;
  patchAudio: (audioId: string, patch: Partial<AudioClip>, message?: string) => void;
  setExportRange: (inMs: number, outMs: number) => void;
  setClipTransition: (clipId: string, type: string, durationMs?: number) => void;
  /** Apply a transition in the middle of two video clips (from → to). */
  setJunctionTransition: (
    fromClipId: string,
    toClipId: string,
    type: string,
    durationMs?: number,
  ) => void;

  seekTo: (ms: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  tickClock: (deltaMs: number) => void;
  zoomTimeline: (pxPerSecond: number) => void;
}

function trackIdForKind(project: VideoProject, kind: string): string {
  return project.tracks.find((t) => t.kind === kind)?.id ?? project.tracks[0]!.id;
}

function isAudioId(project: VideoProject, id: string): boolean {
  return project.audio.some((a) => a.id === id);
}

function trackForClip(project: VideoProject, clipId: string) {
  const clip = project.clips.find((c) => c.id === clipId);
  if (clip) return project.tracks.find((t) => t.id === clip.trackId);
  const audio = project.audio.find((a) => a.id === clipId);
  if (audio) return project.tracks.find((t) => t.id === audio.trackId);
  return undefined;
}

function isLockedClip(project: VideoProject, clipId: string): boolean {
  return Boolean(trackForClip(project, clipId)?.locked);
}

function trimAudio(
  project: VideoProject,
  clipId: string,
  edge: 'start' | 'end',
  newMs: number,
): VideoProject {
  const audio = project.audio.map((a) => {
    if (a.id !== clipId) return a;
    if (edge === 'start') {
      const delta = newMs - a.startMs;
      if (delta <= 0 || delta >= a.durationMs) return a;
      return { ...a, startMs: newMs, durationMs: a.durationMs - delta };
    }
    return { ...a, durationMs: Math.max(1, newMs - a.startMs) };
  });
  return fitProjectDuration({
    ...project,
    audio,
    meta: { ...project.meta, updatedAt: new Date().toISOString() },
  });
}

function moveAudio(project: VideoProject, clipId: string, startMs: number): VideoProject {
  return fitProjectDuration({
    ...project,
    audio: project.audio.map((a) =>
      a.id === clipId ? { ...a, startMs: Math.max(0, startMs) } : a,
    ),
    meta: { ...project.meta, updatedAt: new Date().toISOString() },
  });
}

/** Keep visual clips at 0 when possible — never let audio import shove video right. */
function pinVideoStarts(project: VideoProject): VideoProject {
  const videoTrackIds = new Set(
    project.tracks.filter((t) => t.kind === 'video').map((t) => t.id),
  );
  const onVideo = project.clips.filter((c) => videoTrackIds.has(c.trackId));
  if (onVideo.length === 0) return project;
  const minStart = Math.min(...onVideo.map((c) => c.startMs));
  if (minStart <= 0) return project;
  return {
    ...project,
    clips: project.clips.map((c) =>
      videoTrackIds.has(c.trackId)
        ? { ...c, startMs: Math.max(0, c.startMs - minStart) }
        : c,
    ),
  };
}

export const useVideoEditorStore = create<VideoEditorState>((set, get) => ({
  project: ensureProjectTracks(createEmptyVideoProject('Untitled Ad')),
  past: [],
  future: [],
  clock: { ...DEFAULT_PREVIEW },
  selectedClipId: null,
  activePanel: 'media',
  statusMessage: null,

  setActivePanel: (panel) => set({ activePanel: panel }),
  setSelectedClipId: (id) => set({ selectedClipId: id }),
  setStatusMessage: (msg) => set({ statusMessage: msg }),

  setProjectName: (name) => {
    const { project } = get();
    const next = name.trim() || 'Untitled Ad';
    get().commit(
      {
        ...project,
        meta: { ...project.meta, name: next, updatedAt: new Date().toISOString() },
      },
      'Renamed project',
    );
  },

  reorderTracks: (orderedIds) => {
    const { project } = get();
    const byId = new Map(project.tracks.map((t) => [t.id, t]));
    const next = orderedIds.map((id) => byId.get(id)).filter(Boolean) as typeof project.tracks;
    for (const t of project.tracks) {
      if (!orderedIds.includes(t.id)) next.push(t);
    }
    get().commit(
      {
        ...project,
        tracks: next,
        meta: { ...project.meta, updatedAt: new Date().toISOString() },
      },
      'Reordered tracks',
    );
  },

  alignSelected: (mode) => {
    const { project, selectedClipId } = get();
    if (!selectedClipId) {
      set({ statusMessage: 'Select a text or overlay clip to align' });
      return;
    }
    if (isLockedClip(project, selectedClipId)) {
      set({ statusMessage: 'Track is locked' });
      return;
    }
    const clip = project.clips.find((c) => c.id === selectedClipId);
    if (!clip) {
      set({ statusMessage: 'Select a visual clip to align' });
      return;
    }
    const layout = {
      x: clip.layout?.x ?? 50,
      y: clip.layout?.y ?? 50,
      width: clip.layout?.width,
      height: clip.layout?.height,
    };
    const w = layout.width ?? (clip.text ? 30 : 40);
    const h = layout.height ?? (clip.text ? 12 : 40);
    if (mode === 'left') layout.x = w / 2;
    if (mode === 'center') layout.x = 50;
    if (mode === 'right') layout.x = 100 - w / 2;
    if (mode === 'top') layout.y = h / 2;
    if (mode === 'middle') layout.y = 50;
    if (mode === 'bottom') layout.y = 100 - h / 2;
    get().patchClip(selectedClipId, { layout }, `Aligned ${mode}`);
  },

  setAspectRatio: (aspectRatio) => {
    const { project } = get();
    get().commit(
      {
        ...project,
        aspectRatio,
        meta: { ...project.meta, updatedAt: new Date().toISOString() },
      },
      `Aspect ${aspectRatio}`,
    );
  },

  newProject: () =>
    set({
      project: ensureProjectTracks(createEmptyVideoProject('Untitled Ad')),
      past: [],
      future: [],
      clock: { ...DEFAULT_PREVIEW },
      selectedClipId: null,
      activePanel: 'media',
      statusMessage: 'New project created',
    }),

  commit: (next, message) => {
    const { project, past } = get();
    set({
      past: [...past.slice(-(MAX_HISTORY - 1)), project],
      project: ensureProjectTracks(next),
      future: [],
      statusMessage: message ?? get().statusMessage,
      clock: {
        ...get().clock,
        currentMs: Math.min(get().clock.currentMs, Math.max(0, next.durationMs)),
      },
    });
  },

  undo: () => {
    const { past, project, future } = get();
    if (past.length === 0) {
      set({ statusMessage: 'Nothing to undo' });
      return;
    }
    const previous = past[past.length - 1]!;
    set({
      past: past.slice(0, -1),
      future: [project, ...future].slice(0, MAX_HISTORY),
      project: previous,
      statusMessage: 'Undo',
      clock: {
        ...get().clock,
        currentMs: Math.min(get().clock.currentMs, previous.durationMs),
      },
    });
  },

  redo: () => {
    const { past, project, future } = get();
    if (future.length === 0) {
      set({ statusMessage: 'Nothing to redo' });
      return;
    }
    const [next, ...rest] = future;
    set({
      past: [...past, project].slice(-MAX_HISTORY),
      future: rest,
      project: next!,
      statusMessage: 'Redo',
      clock: {
        ...get().clock,
        currentMs: Math.min(get().clock.currentMs, next!.durationMs),
      },
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  addMediaClip: (name, durationMs = 4000, trackKind = 'video', src) => {
    const { project, clock } = get();
    const trackId = trackIdForKind(project, trackKind);
    const onTrack = project.clips.filter((c) => c.trackId === trackId);
    // First clip on a track always starts at 0 — prevents "video out of frame" gap
    const lastOnTrack =
      onTrack.length === 0
        ? 0
        : onTrack.reduce((max, c) => Math.max(max, c.startMs + c.durationMs), 0);
    const layout =
      trackKind === 'logo'
        ? DEFAULT_LOGO_LAYOUT()
        : trackKind === 'sticker'
          ? DEFAULT_STICKER_LAYOUT()
          : trackKind === 'overlay'
            ? DEFAULT_OVERLAY_LAYOUT()
            : trackKind === 'video'
              ? { x: 50, y: 50, width: 100, height: 100 }
              : undefined;
    const clip: Omit<Clip, 'id'> = {
      trackId,
      name,
      startMs: lastOnTrack,
      durationMs: Math.max(1, durationMs),
      sourceOffsetMs: 0,
      src,
      layout,
    };
    let next = addClip(project, clip);
    // Keep primary video flush-left at frame 0
    if (trackKind === 'video') {
      next = pinVideoStarts(next);
    }
    next = fitProjectDuration(next);
    const px = suggestPxPerSecond(next.durationMs);
    get().commit(next, `Added “${name}”`);
    if (next.durationMs > 60_000) {
      set({ clock: setTimelineZoom(clock, px) });
    }
    const added = next.clips[next.clips.length - 1];
    set({
      selectedClipId: added?.id ?? null,
      clock: {
        ...get().clock,
        currentMs: trackKind === 'video' && onTrack.length === 0 ? 0 : Math.min(get().clock.currentMs, next.durationMs),
      },
    });
  },

  addPlaceholderClip: (kind) => {
    const map = {
      product: { name: 'Product Clip', track: 'video', src: mediaPlaceholderSrc('product'), dur: 5000 },
      broll: { name: 'B-roll', track: 'overlay', src: mediaPlaceholderSrc('broll'), dur: 3000 },
      logo: { name: 'Logo bumper', track: 'logo', src: mediaPlaceholderSrc('logo'), dur: 2000 },
    } as const;
    const cfg = map[kind];
    get().addMediaClip(cfg.name, cfg.dur, cfg.track, cfg.src);
  },

  addTextClip: (text, textStyle) => {
    const { project } = get();
    const trackId = trackIdForKind(project, 'text');
    const next = addClip(project, {
      trackId,
      name: text.slice(0, 24) || 'Text',
      startMs: 0,
      durationMs: 3000,
      sourceOffsetMs: 0,
      text,
      textStyle: { ...DEFAULT_TEXT_STYLE(), ...textStyle },
      layout: DEFAULT_LAYOUT(),
    });
    get().commit(next, `Text “${text}” added`);
    set({
      selectedClipId: next.clips[next.clips.length - 1]?.id ?? null,
      activePanel: 'text',
      clock: { ...get().clock, currentMs: 0 },
    });
  },

  addAudioClip: (name, src, durationMs = 12_000) => {
    const { project } = get();
    const trackId = trackIdForKind(project, 'audio');
    // Always start music at 0 when it's the first bed — keeps video aligned at frame 0
    const existing = project.audio.filter((a) => a.trackId === trackId);
    const startMs =
      existing.length === 0
        ? 0
        : existing.reduce((max, a) => Math.max(max, a.startMs + a.durationMs), 0);
    const audio = {
      id: createId('audio'),
      trackId,
      name,
      startMs,
      durationMs: Math.max(1, durationMs),
      src: src ?? '',
      volume: 0.8,
    };
    // Pin video clips to the left — audio must never visually shove the video frame right
    const pinned = pinVideoStarts(project);
    const next = fitProjectDuration({
      ...pinned,
      audio: [...pinned.audio, audio],
      meta: { ...pinned.meta, updatedAt: new Date().toISOString() },
    });
    get().commit(next, `Audio “${name}” added`);
    set({
      selectedClipId: audio.id,
      clock: { ...get().clock, currentMs: 0 },
    });
  },

  splitAtPlayhead: () => {
    const { project, selectedClipId, clock } = get();
    if (!selectedClipId || isAudioId(project, selectedClipId)) {
      set({ statusMessage: 'Select a video/overlay clip to split' });
      return;
    }
    get().commit(splitClip(project, selectedClipId, clock.currentMs), 'Clip split');
  },

  trimSelected: (edge, newMs) => {
    const { selectedClipId } = get();
    if (!selectedClipId) {
      set({ statusMessage: 'Select a clip to trim' });
      return;
    }
    get().trimClipById(selectedClipId, edge, newMs);
  },

  trimClipById: (clipId, edge, newMs) => {
    const { project } = get();
    if (isLockedClip(project, clipId)) {
      set({ statusMessage: 'Track is locked — unlock it in Layers' });
      return;
    }
    if (isAudioId(project, clipId)) {
      get().commit(trimAudio(project, clipId, edge, newMs), 'Trimmed audio');
      return;
    }
    get().commit(
      trimClip(project, clipId, edge, newMs),
      edge === 'start' ? 'Trimmed in' : 'Trimmed out',
    );
  },

  rippleDeleteSelected: () => {
    const { project, selectedClipId } = get();
    if (!selectedClipId) {
      set({ statusMessage: 'Select a clip to delete' });
      return;
    }
    if (isLockedClip(project, selectedClipId)) {
      set({ statusMessage: 'Track is locked — unlock it in Layers' });
      return;
    }
    if (isAudioId(project, selectedClipId)) {
      get().commit(
        fitProjectDuration({
          ...project,
          audio: project.audio.filter((a) => a.id !== selectedClipId),
          meta: { ...project.meta, updatedAt: new Date().toISOString() },
        }),
        'Audio deleted',
      );
      set({ selectedClipId: null });
      return;
    }
    get().commit(rippleDelete(project, selectedClipId), 'Clip deleted (ripple)');
    set({ selectedClipId: null });
  },

  moveSelected: (startMs) => {
    const { selectedClipId } = get();
    if (!selectedClipId) return;
    get().moveClipById(selectedClipId, startMs);
  },

  moveClipById: (clipId, startMs) => {
    const { project } = get();
    if (isLockedClip(project, clipId)) {
      set({ statusMessage: 'Track is locked — unlock it in Layers' });
      return;
    }
    if (isAudioId(project, clipId)) {
      get().commit(moveAudio(project, clipId, startMs), 'Moved audio');
      return;
    }
    get().commit(moveClip(project, clipId, startMs), 'Moved clip');
  },

  snapClipsToStart: () => {
    const { project } = get();
    const offsets = new Map<string, number>();
    for (const track of project.tracks) {
      const onTrack = project.clips.filter((c) => c.trackId === track.id);
      if (onTrack.length === 0) continue;
      offsets.set(track.id, Math.min(...onTrack.map((c) => c.startMs)));
    }
    const clips = project.clips.map((c) => {
      const off = offsets.get(c.trackId) ?? 0;
      if (off <= 0) return c;
      return { ...c, startMs: Math.max(0, c.startMs - off) };
    });
    const audioOffsets = new Map<string, number>();
    for (const track of project.tracks) {
      const onTrack = project.audio.filter((a) => a.trackId === track.id);
      if (onTrack.length === 0) continue;
      audioOffsets.set(track.id, Math.min(...onTrack.map((a) => a.startMs)));
    }
    const audio = project.audio.map((a) => {
      const off = audioOffsets.get(a.trackId) ?? 0;
      if (off <= 0) return a;
      return { ...a, startMs: Math.max(0, a.startMs - off) };
    });
    const changed =
      clips.some((c, i) => c.startMs !== project.clips[i]?.startMs) ||
      audio.some((a, i) => a.startMs !== project.audio[i]?.startMs);
    get().commit(
      fitProjectDuration({
        ...project,
        clips,
        audio,
        meta: { ...project.meta, updatedAt: new Date().toISOString() },
      }),
      changed ? 'Snapped clips to start' : 'Already at start',
    );
    set({ clock: { ...get().clock, currentMs: 0 } });
  },

  fitToContent: () => {
    const next = fitProjectDuration(pinVideoStarts(get().project));
    const px = suggestPxPerSecond(Math.max(next.durationMs, 1000));
    get().commit(
      next,
      next.durationMs > 0 ? `Fitted to ${Math.round(next.durationMs / 1000)}s` : 'Empty timeline',
    );
    set({ clock: setTimelineZoom(get().clock, px) });
  },

  toggleTrackMute: (trackId) => {
    const { project } = get();
    get().commit({
      ...project,
      tracks: project.tracks.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t)),
    });
  },

  toggleTrackLock: (trackId) => {
    const { project } = get();
    get().commit({
      ...project,
      tracks: project.tracks.map((t) => (t.id === trackId ? { ...t, locked: !t.locked } : t)),
    });
  },

  toggleTrackVisible: (trackId) => {
    const { project } = get();
    get().commit({
      ...project,
      tracks: project.tracks.map((t) =>
        t.id === trackId ? { ...t, visible: !t.visible } : t,
      ),
    });
  },

  removeClip: (clipId) => {
    const { project, selectedClipId } = get();
    if (isLockedClip(project, clipId)) {
      set({ statusMessage: 'Track is locked — unlock it in Layers' });
      return;
    }
    get().commit(
      fitProjectDuration({
        ...project,
        clips: project.clips.filter((c) => c.id !== clipId),
        audio: project.audio.filter((a) => a.id !== clipId),
        meta: { ...project.meta, updatedAt: new Date().toISOString() },
      }),
      'Clip removed',
    );
    if (selectedClipId === clipId) set({ selectedClipId: null });
  },

  applyEffect: (effectId) => {
    const { project, selectedClipId } = get();
    let targetId = selectedClipId;
    if (!targetId || isAudioId(project, targetId)) {
      const media = project.clips.find((c) => {
        const kind = project.tracks.find((t) => t.id === c.trackId)?.kind;
        return kind === 'video' || kind === 'overlay' || Boolean(c.src);
      });
      targetId = media?.id ?? null;
    }
    if (!targetId) {
      set({ statusMessage: 'Add a video or image clip first' });
      return;
    }
    const next = applyEffectToClip(project, targetId, effectId, 'toggle');
    const clip = next.clips.find((c) => c.id === targetId);
    const on = clip?.effectIds?.includes(effectId);
    set({ selectedClipId: targetId });
    get().commit(next, on ? `Effect “${effectId}” on` : `Effect “${effectId}” off`);
  },

  applyFxToClip: (clipId, kind, id) => {
    const { project } = get();
    const clip = project.clips.find((c) => c.id === clipId);
    if (!clip) {
      set({ statusMessage: 'Drop onto a video clip' });
      return;
    }
    set({ selectedClipId: clipId });

    if (kind === 'effect') {
      const next = applyEffectToClip(project, clipId, id as VideoEffectId, 'add');
      get().commit(next, `Effect “${id}” added`);
      set({ statusMessage: `Effect “${id}” on “${clip.name}” — adjust duration below` });
      return;
    }

    if (kind === 'filter') {
      get().patchClip(
        clipId,
        {
          preset: id,
          adjust: adjustForPreset(id),
          filterStrength: clip.filterStrength ?? 100,
        },
        `Filter: ${id}`,
      );
      set({ statusMessage: `Filter “${id}” on “${clip.name}”` });
      return;
    }

    // transition — place between previous video clip and this one
    get().setClipTransition(clipId, id);
  },

  setEffectSetting: (clipId, effectId, patch) => {
    const { project } = get();
    const clip = project.clips.find((c) => c.id === clipId);
    if (!clip) return;
    const prev = clip.effectSettings?.[effectId] ?? { durationMs: 1200, intensity: 100 };
    const effectSettings = {
      ...(clip.effectSettings ?? {}),
      [effectId]: { ...prev, ...patch },
    };
    get().patchClip(clipId, { effectSettings }, 'Effect adjusted');
  },

  setFilterStrength: (clipId, strength) => {
    get().patchClip(
      clipId,
      { filterStrength: Math.max(0, Math.min(100, strength)) },
      'Filter strength',
    );
  },

  setTransitionDuration: (toClipId, durationMs) => {
    const { project } = get();
    const transitions = project.transitions.map((t) =>
      t.toClipId === toClipId
        ? { ...t, durationMs: Math.max(200, Math.min(5000, durationMs)) }
        : t,
    );
    get().commit(
      {
        ...project,
        transitions,
        meta: { ...project.meta, updatedAt: new Date().toISOString() },
      },
      'Transition duration',
    );
  },

  moveTransitionBlock: (transitionId, startMs, durationMs) => {
    const { project } = get();
    const tr = project.transitions.find((t) => t.id === transitionId);
    if (!tr) return;
    const dur = Math.max(200, Math.min(8000, Math.round(durationMs)));
    const start = Math.max(0, Math.round(startMs));
    const transitions = project.transitions.map((t) =>
      t.id === transitionId ? { ...t, startMs: start, durationMs: dur } : t,
    );
    get().commit(
      {
        ...project,
        transitions,
        meta: { ...project.meta, updatedAt: new Date().toISOString() },
      },
      'Moved transition',
    );
    set({ statusMessage: `Transition start ${Math.round(start / 100) / 10}s` });
  },

  moveEffectBlock: (clipId, effectId, offsetMs, durationMs) => {
    const { project } = get();
    const clip = project.clips.find((c) => c.id === clipId);
    if (!clip) return;
    const maxDur = Math.max(200, clip.durationMs);
    const off = Math.max(0, Math.min(maxDur - 200, Math.round(offsetMs)));
    const dur = Math.max(200, Math.min(maxDur - off, Math.round(durationMs)));
    const prev = clip.effectSettings?.[effectId] ?? { durationMs: 1200, intensity: 100 };
    const effectSettings = {
      ...(clip.effectSettings ?? {}),
      [effectId]: { ...prev, offsetMs: off, durationMs: dur },
    };
    get().patchClip(clipId, { effectSettings }, 'Moved effect');
    set({ statusMessage: `Effect start +${Math.round(off / 100) / 10}s` });
  },

  runVideoAi: (tool) => {
    const { project, clock } = get();
    const result = applyVideoAiTool(project, tool, clock.currentMs);
    const next = fitProjectDuration(pinVideoStarts(result.project));
    get().commit(next, result.message);
    if (next.durationMs > 60_000) {
      set({ clock: setTimelineZoom(get().clock, suggestPxPerSecond(next.durationMs)) });
    }
    return result.message;
  },

  patchClip: (clipId, patch, message) => {
    const { project } = get();
    if (isLockedClip(project, clipId) && (patch.layout || patch.startMs != null || patch.durationMs != null)) {
      set({ statusMessage: 'Track is locked — unlock it in Layers' });
      return;
    }
    const next = {
      ...project,
      clips: project.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
      meta: { ...project.meta, updatedAt: new Date().toISOString() },
    };
    get().commit(fitProjectDuration(next), message);
  },

  patchAudio: (audioId, patch, message) => {
    const { project } = get();
    get().commit(
      fitProjectDuration({
        ...project,
        audio: project.audio.map((a) => (a.id === audioId ? { ...a, ...patch } : a)),
        meta: { ...project.meta, updatedAt: new Date().toISOString() },
      }),
      message,
    );
  },

  setExportRange: (inMs, outMs) => {
    const { project } = get();
    const lo = Math.max(0, Math.min(inMs, outMs));
    const hi = Math.max(lo, Math.max(inMs, outMs));
    get().commit(
      {
        ...project,
        exportRange: { inMs: lo, outMs: Math.min(hi, Math.max(project.durationMs, hi)) },
        meta: { ...project.meta, updatedAt: new Date().toISOString() },
      },
      'Export range updated',
    );
  },

  setClipTransition: (clipId, type, durationMs = 900) => {
    const { project } = get();
    const clips = [...project.clips]
      .filter((c) => {
        const kind = project.tracks.find((t) => t.id === c.trackId)?.kind;
        return kind === 'video' || kind === 'overlay' || Boolean(c.src);
      })
      .sort((a, b) => a.startMs - b.startMs);

    let targetId = clipId;
    if (!clips.some((c) => c.id === targetId)) {
      targetId = clips[0]?.id ?? '';
    }
    const idx = clips.findIndex((c) => c.id === targetId);
    const from = idx > 0 ? clips[idx - 1] : null;
    const to = clips[idx] ?? clips[0] ?? null;
    if (!to) {
      set({ statusMessage: 'Add a video clip first to apply a transition' });
      return;
    }
    // Prefer a real join between two clips when possible
    if (from) {
      get().setJunctionTransition(from.id, to.id, type, durationMs);
      return;
    }
    const transitions = project.transitions.filter(
      (t) => t.toClipId !== to.id && t.fromClipId !== to.id,
    );
    if (type !== 'none') {
      transitions.push({
        id: createId('tr'),
        fromClipId: to.id,
        toClipId: to.id,
        type,
        durationMs: Math.max(400, durationMs),
        startMs: Math.max(0, to.startMs),
      });
    }
    set({ selectedClipId: to.id });
    get().commit(
      {
        ...project,
        transitions,
        meta: { ...project.meta, updatedAt: new Date().toISOString() },
      },
      type === 'none' ? 'Transition cleared' : `Transition: ${type}`,
    );
    if (type !== 'none') {
      set((s) => ({
        clock: seek(s.clock, to.startMs, s.project.durationMs),
        statusMessage: `Intro transition “${type}” on “${to.name}” — add a 2nd clip to place it between clips`,
      }));
    }
  },

  setJunctionTransition: (fromClipId, toClipId, type, durationMs = 900) => {
    const { project } = get();
    const from = project.clips.find((c) => c.id === fromClipId);
    const to = project.clips.find((c) => c.id === toClipId);
    if (!from || !to) {
      set({ statusMessage: 'Select two video clips to add a transition between them' });
      return;
    }
    const transitions = project.transitions.filter(
      (t) => !(t.fromClipId === from.id && t.toClipId === to.id) && t.toClipId !== to.id,
    );
    if (type !== 'none') {
      const dur = Math.max(400, durationMs);
      transitions.push({
        id: createId('tr'),
        fromClipId: from.id,
        toClipId: to.id,
        type,
        durationMs: dur,
        startMs: Math.max(0, to.startMs - dur),
      });
    }
    set({ selectedClipId: to.id });
    get().commit(
      {
        ...project,
        transitions,
        meta: { ...project.meta, updatedAt: new Date().toISOString() },
      },
      type === 'none'
        ? 'Transition cleared'
        : `Transition “${type}” between “${from.name}” → “${to.name}”`,
    );
    if (type !== 'none') {
      // Seek near the join so Play shows the mid-clip transition
      const joinMs = Math.max(0, to.startMs - Math.min(durationMs / 2, 400));
      set((s) => ({
        clock: seek(s.clock, joinMs, s.project.durationMs),
        statusMessage: `Transition “${type}” at join — press Play`,
      }));
    }
  },

  seekTo: (ms) => set((s) => ({ clock: seek(s.clock, ms, s.project.durationMs) })),

  play: () => set((s) => ({ clock: setPlaying(s.clock, true) })),
  pause: () => set((s) => ({ clock: setPlaying(s.clock, false) })),
  togglePlay: () => set((s) => ({ clock: setPlaying(s.clock, !s.clock.playing) })),

  tickClock: (deltaMs) =>
    set((s) => ({ clock: tick(s.clock, deltaMs, s.project.durationMs) })),

  zoomTimeline: (pxPerSecond) =>
    set((s) => ({ clock: setTimelineZoom(s.clock, pxPerSecond) })),
}));
