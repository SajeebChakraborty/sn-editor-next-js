/** Shared geometric types for layers and artboards. */

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion';

export interface Transform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface Artboard {
  id: string;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  background: string;
}

export type LayerType = 'group' | 'image' | 'text' | 'shape' | 'sticker' | 'cta';

export interface TextEffects {
  outline?: { color: string; width: number };
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number };
  curve?: number;
  gradient?: { from: string; to: string; angle: number };
  autoResize?: boolean;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string;
  /** Konva: 'normal' | 'italic' | 'bold' | 'italic bold' — we compose from weight + italic */
  fontStyle?: 'normal' | 'italic';
  underline?: boolean;
  fill: string;
  align: 'left' | 'center' | 'right' | 'justify';
  lineHeight: number;
  letterSpacing: number;
  /** Render-time case transform (does not mutate stored text). */
  textCase?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  /** Bullet / numbered list (render-time prefix; does not mutate stored text). */
  listStyle?: 'none' | 'bullet' | 'number';
  effects?: TextEffects;
  role?: 'heading' | 'subheading' | 'body';
}

export interface LayerNode {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  transform: Transform;
  children?: LayerNode[];
  /** Which page/artboard this layer belongs to (independent per-page designs). */
  artboardId?: string;
  /** Image / sticker / logo asset URL or S3 key */
  src?: string;
  /** Unedited source — used so remove/replace BG can re-run from the original photo. */
  originalSrc?: string;
  text?: string;
  textStyle?: TextStyle;
  shape?: 'rect' | 'ellipse' | 'triangle' | 'line' | 'polygon' | 'star' | 'arrow';
  /** Corner radius for rect shapes */
  cornerRadius?: number;
  /** Line dash style */
  dash?: number[];
  /** Image adjustments (0-neutral defaults) */
  imageAdjust?: {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
    hue: number;
  };
  /** Normalized crop rect 0–1 relative to image */
  crop?: { x: number; y: number; width: number; height: number };
  /** Clip mask for images / logos */
  imageMask?: 'square' | 'rounded' | 'circle' | 'squircle';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  /** Shape gradient fill */
  shapeGradient?: { from: string; to: string; angle: number };
  /** Optional motion on images / stickers (editor preview + export later). */
  animation?: LayerAnimation;
}

export type LayerAnimationType =
  | 'none'
  | 'fade'
  | 'rise'
  | 'pan'
  | 'zoom'
  | 'bounce'
  | 'breathe'
  | 'float';

export interface LayerAnimation {
  type: LayerAnimationType;
  /** Playback length in ms (entrance) or loop cycle length. */
  durationMs?: number;
  loop?: boolean;
}

export interface AssetRef {
  id: string;
  kind: 'image' | 'video' | 'logo' | 'music' | 'icon';
  name: string;
  urlOrKey: string;
}

export interface Guide {
  id: string;
  orientation: 'horizontal' | 'vertical';
  position: number;
}

export interface DesignDocument {
  id: string;
  version: number;
  brandKitId?: string;
  artboards: Artboard[];
  /** Flat root list; groups nest via `children`. */
  layers: LayerNode[];
  assets: AssetRef[];
  guides: Guide[];
  meta: {
    name: string;
    templateId?: string;
    createdAt: string;
    updatedAt: string;
  };
}

export const DEFAULT_TRANSFORM = (): Transform => ({
  x: 0,
  y: 0,
  width: 200,
  height: 200,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
});

export const BLEND_MODES: BlendMode[] = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
];
