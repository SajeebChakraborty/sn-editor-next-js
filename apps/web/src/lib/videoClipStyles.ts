/**
 * Visual presets + CSS filter helpers for video clip adjust / grade.
 */
import type { Clip, ClipAdjust } from '@sn-editor/video-engine';
import { DEFAULT_ADJUST } from '@sn-editor/video-engine';

export const SPEED_OPTIONS = [0.5, 1, 1.5, 2] as const;

export const VIDEO_PRESETS = [
  { id: 'none', label: 'None' },
  { id: 'mono', label: 'Mono' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'vintage', label: 'Vintage' },
  { id: 'vivid', label: 'Vivid' },
  { id: 'cinema', label: 'Cinema' },
  { id: 'dramatic', label: 'Dramatic' },
  { id: 'soft', label: 'Soft' },
  { id: 'matte', label: 'Matte' },
  { id: 'warm', label: 'Warm' },
  { id: 'cool', label: 'Cool' },
  { id: 'fade', label: 'Fade' },
  { id: 'bright', label: 'Bright' },
  { id: 'moody', label: 'Moody' },
  { id: 'crisp', label: 'Crisp' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'landscape', label: 'Landscape' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'emerald', label: 'Emerald' },
  { id: 'frost', label: 'Frost' },
  { id: 'noir', label: 'Noir' },
  { id: 'polaroid', label: 'Polaroid' },
  { id: 'kodachrome', label: 'Kodachrome' },
  { id: 'technicolor', label: 'Technicolor' },
  { id: 'brownie', label: 'Brownie' },
] as const;

export type VideoPresetId = (typeof VIDEO_PRESETS)[number]['id'];

export const TRANSITION_TYPES = [
  { id: 'none', label: 'None', hint: 'Hard cut' },
  { id: 'fade', label: 'Fade', hint: 'Soft fade in' },
  { id: 'dissolve', label: 'Dissolve', hint: 'Cross dissolve' },
  { id: 'slide_left', label: 'Slide Left', hint: 'Push from right' },
  { id: 'slide_right', label: 'Slide Right', hint: 'Push from left' },
  { id: 'slide_up', label: 'Slide Up', hint: 'Push from bottom' },
  { id: 'slide_down', label: 'Slide Down', hint: 'Push from top' },
  { id: 'zoom', label: 'Zoom In', hint: 'Punch zoom' },
  { id: 'zoom_out', label: 'Zoom Out', hint: 'Pull back' },
  { id: 'wipe', label: 'Wipe', hint: 'Horizontal wipe' },
  { id: 'wipe_vertical', label: 'Wipe Vert', hint: 'Vertical wipe' },
  { id: 'blur', label: 'Blur', hint: 'Blur through' },
  { id: 'flash', label: 'Flash', hint: 'White flash' },
  { id: 'spin', label: 'Spin', hint: 'Rotate in' },
] as const;

export const PRESET_ADJUST: Record<string, Partial<ClipAdjust>> = {
  none: {},
  mono: { saturation: 0 },
  sepia: { sepia: 70, saturation: 90 },
  vintage: { sepia: 45, contrast: 90, brightness: 95, saturation: 80 },
  vivid: { saturation: 140, contrast: 115 },
  cinema: { contrast: 120, saturation: 85, brightness: 95 },
  dramatic: { contrast: 140, brightness: 90, saturation: 110 },
  soft: { brightness: 110, contrast: 90, blur: 0.4 },
  matte: { contrast: 85, saturation: 80, brightness: 105 },
  warm: { hueRotate: -12, saturation: 115, brightness: 105 },
  cool: { hueRotate: 18, saturation: 110 },
  fade: { brightness: 115, contrast: 80, saturation: 70 },
  bright: { brightness: 130, contrast: 105 },
  moody: { brightness: 80, contrast: 120, saturation: 70 },
  crisp: { contrast: 125, saturation: 105 },
  portrait: { saturation: 95, brightness: 108, contrast: 105 },
  landscape: { saturation: 120, contrast: 110 },
  sunset: { hueRotate: -25, saturation: 130, brightness: 105 },
  ocean: { hueRotate: 160, saturation: 110 },
  emerald: { hueRotate: 100, saturation: 120 },
  frost: { brightness: 120, saturation: 60, blur: 0.3 },
  noir: { grayscale: 100, contrast: 130 },
  polaroid: { sepia: 25, contrast: 90, brightness: 110 },
  kodachrome: { saturation: 130, contrast: 115, hueRotate: -5 },
  technicolor: { saturation: 160, contrast: 120, hueRotate: 10 },
  brownie: { sepia: 55, contrast: 95, brightness: 95 },
};

export function adjustForPreset(id: string): ClipAdjust {
  if (!id || id === 'none') return DEFAULT_ADJUST();
  return { ...DEFAULT_ADJUST(), ...(PRESET_ADJUST[id] ?? {}) };
}

export function resolveAdjust(clip: Clip): ClipAdjust {
  if (clip.adjust) return { ...DEFAULT_ADJUST(), ...clip.adjust };
  return adjustForPreset(clip.preset ?? 'none');
}

export function adjustToCssFilter(adjust: ClipAdjust): string {
  const parts = [
    `grayscale(${adjust.grayscale}%)`,
    `blur(${adjust.blur}px)`,
    `brightness(${adjust.brightness}%)`,
    `contrast(${adjust.contrast}%)`,
    `saturate(${adjust.saturation}%)`,
    `sepia(${adjust.sepia}%)`,
    `hue-rotate(${adjust.hueRotate}deg)`,
    `invert(${adjust.invert}%)`,
  ];
  return parts.join(' ');
}

export function clipVisualFilter(clip: Clip): string {
  const strength = Math.max(0, Math.min(100, clip.filterStrength ?? 100)) / 100;
  if (strength <= 0) return '';
  if (strength >= 0.999) return adjustToCssFilter(resolveAdjust(clip));
  const full = resolveAdjust(clip);
  const base = DEFAULT_ADJUST();
  const blend = (a: number, b: number) => a + (b - a) * strength;
  return adjustToCssFilter({
    grayscale: blend(base.grayscale, full.grayscale),
    blur: blend(base.blur, full.blur),
    brightness: blend(base.brightness, full.brightness),
    contrast: blend(base.contrast, full.contrast),
    saturation: blend(base.saturation, full.saturation),
    sepia: blend(base.sepia, full.sepia),
    hueRotate: blend(base.hueRotate, full.hueRotate),
    invert: blend(base.invert, full.invert),
  });
}

export const FONT_FAMILIES = [
  'Fraunces',
  'Source Sans 3',
  'Georgia',
  'Arial',
  'Courier New',
  'Impact',
  'Verdana',
] as const;
