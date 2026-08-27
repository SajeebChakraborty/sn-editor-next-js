import { createId } from '@sn-editor/shared';

export type TrackKind =
  | 'video'
  | 'audio'
  | 'text'
  | 'overlay'
  | 'sticker'
  | 'logo'
  | 'transition'
  | 'effects';

export interface Track {
  id: string;
  kind: TrackKind;
  name: string;
  locked: boolean;
  muted: boolean;
  visible: boolean;
}

/** On-canvas text styling for text clips. */
export interface ClipTextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string;
  fontStyle: 'normal' | 'italic';
  color: string;
  align: 'left' | 'center' | 'right';
  strokeColor?: string;
  strokeWidth?: number;
}

/** Position + size as % of the preview frame (0–100). */
export interface ClipLayout {
  x: number;
  y: number;
  /** Width % of frame (media overlays). Defaults to full-bleed when omitted. */
  width?: number;
  /** Height % of frame (media overlays). Defaults to full-bleed when omitted. */
  height?: number;
}

/** CSS-filter style adjustments (CrazyHD-style). */
export interface ClipAdjust {
  grayscale: number;
  blur: number;
  brightness: number;
  contrast: number;
  saturation: number;
  sepia: number;
  hueRotate: number;
  invert: number;
}

export const DEFAULT_TEXT_STYLE = (): ClipTextStyle => ({
  fontFamily: 'Fraunces',
  fontSize: 36,
  fontWeight: 700,
  fontStyle: 'normal',
  color: '#f4f7f8',
  align: 'center',
});

export const DEFAULT_LAYOUT = (): ClipLayout => ({
  x: 50,
  y: 78,
  width: 48,
  height: 16,
});

/** Stickers / graphics — small default, not stretched to fill the frame. */
export const DEFAULT_STICKER_LAYOUT = (): ClipLayout => ({
  x: 50,
  y: 50,
  width: 16,
  height: 16,
});

export const DEFAULT_OVERLAY_LAYOUT = (): ClipLayout => ({
  x: 50,
  y: 50,
  width: 36,
  height: 36,
});

export const DEFAULT_LOGO_LAYOUT = (): ClipLayout => ({
  x: 86,
  y: 12,
  width: 14,
  height: 14,
});

/** Infer a project aspect string from media pixel size. */
export function aspectFromSize(width: number, height: number): AspectRatio {
  if (width < 1 || height < 1) return '1:1';
  const r = width / height;
  if (Math.abs(r - 1) < 0.08) return '1:1';
  if (Math.abs(r - 16 / 9) < 0.12) return '16:9';
  if (Math.abs(r - 9 / 16) < 0.12) return '9:16';
  // Custom WxH so preview + export match the source
  const max = 1920;
  const scale = Math.min(1, max / Math.max(width, height));
  return `${Math.round(width * scale)}x${Math.round(height * scale)}`;
}

export const DEFAULT_ADJUST = (): ClipAdjust => ({
  grayscale: 0,
  blur: 0,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  sepia: 0,
  hueRotate: 0,
  invert: 0,
});

export interface Clip {
  id: string;
  trackId: string;
  name: string;
  /** Start on timeline (ms). */
  startMs: number;
  /** Duration on timeline (ms). */
  durationMs: number;
  /** Offset into source media (ms). */
  sourceOffsetMs: number;
  src?: string;
  text?: string;
  textStyle?: ClipTextStyle;
  layout?: ClipLayout;
  /** Playback speed factor (0.5 / 1 / 1.5 / 2). */
  speed?: number;
  /** Named color grade preset id. */
  preset?: string;
  adjust?: ClipAdjust;
  // style / effect ids
  effectIds?: string[];
  /** Per-effect duration (ms), intensity (0–100), start offset, and Canva-style enter/exit phase. */
  effectSettings?: Record<
    string,
    {
      durationMs?: number;
      intensity?: number;
      offsetMs?: number;
      phase?: 'both' | 'enter' | 'exit';
    }
  >;
  /** Filter / preset blend strength 0–100 (default 100). */
  filterStrength?: number;
  /** Horizontal flip (Canva Flip). */
  flipX?: boolean;
  /** Clip opacity 0–100 (default 100). */
  opacity?: number;
}

export interface Transition {
  id: string;
  fromClipId: string;
  toClipId: string;
  type: string;
  durationMs: number;
  /** Absolute timeline start (ms). When set, the block can move freely like Canva. */
  startMs?: number;
}

export interface AudioClip {
  id: string;
  trackId: string;
  name: string;
  /** Optional display label in preview. */
  label?: string;
  startMs: number;
  durationMs: number;
  src: string;
  volume: number;
}

export type AspectRatio = '9:16' | '1:1' | '16:9' | string;

export interface ExportRange {
  inMs: number;
  outMs: number;
}

export interface VideoProject {
  id: string;
  fps: number;
  durationMs: number;
  aspectRatio: AspectRatio;
  tracks: Track[];
  clips: Clip[];
  transitions: Transition[];
  audio: AudioClip[];
  exportRange?: ExportRange;
  meta: { name: string; templateId?: string; createdAt: string; updatedAt: string };
}

const DEFAULT_TRACK_KINDS: TrackKind[] = [
  'video',
  'overlay',
  'text',
  'sticker',
  'logo',
  'transition',
  'effects',
  'audio',
];

function trackDisplayName(kind: TrackKind): string {
  if (kind === 'transition') return 'Transition';
  if (kind === 'effects') return 'Effects';
  return kind[0]!.toUpperCase() + kind.slice(1);
}

/** Ensure legacy projects gain Transition / Effects tracks. */
export function ensureProjectTracks(project: VideoProject): VideoProject {
  const existing = new Set(project.tracks.map((t) => t.kind));
  const missing = DEFAULT_TRACK_KINDS.filter((k) => !existing.has(k));
  if (missing.length === 0) return project;
  return {
    ...project,
    tracks: [
      ...project.tracks,
      ...missing.map((kind) => ({
        id: createId('track'),
        kind,
        name: trackDisplayName(kind),
        locked: false,
        muted: false,
        visible: true,
      })),
    ],
  };
}

export function createEmptyVideoProject(name = 'Untitled Video'): VideoProject {
  const now = new Date().toISOString();
  const tracks: Track[] = DEFAULT_TRACK_KINDS.map((kind) => ({
    id: createId('track'),
    kind,
    name: trackDisplayName(kind),
    locked: false,
    muted: false,
    visible: true,
  }));

  return {
    id: createId('vproj'),
    fps: 30,
    durationMs: 0,
    aspectRatio: '1:1',
    tracks,
    clips: [],
    transitions: [],
    audio: [],
    exportRange: { inMs: 0, outMs: 0 },
    meta: { name, createdAt: now, updatedAt: now },
  };
}
