/**
 * Animation preset metadata (no Konva) — safe to import from SSR panels.
 */
import type { LayerAnimation, LayerAnimationType } from '@sn-editor/editor-core';

export const IMAGE_ANIMATIONS: {
  id: LayerAnimationType;
  label: string;
  loop?: boolean;
}[] = [
  { id: 'none', label: 'None' },
  { id: 'fade', label: 'Fade in' },
  { id: 'rise', label: 'Rise up' },
  { id: 'pan', label: 'Pan in' },
  { id: 'zoom', label: 'Zoom in' },
  { id: 'bounce', label: 'Bounce' },
  { id: 'breathe', label: 'Breathe', loop: true },
  { id: 'float', label: 'Float', loop: true },
];

export function defaultAnimation(type: LayerAnimationType): LayerAnimation | undefined {
  if (type === 'none') return undefined;
  const loop = type === 'breathe' || type === 'float';
  return {
    type,
    durationMs: loop ? 2200 : 900,
    loop,
  };
}
