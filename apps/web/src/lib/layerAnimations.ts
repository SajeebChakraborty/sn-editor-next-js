/**
 * Canva-like motion presets for image layers (Konva tweens).
 * Preset lists live in layerAnimationPresets.ts (SSR-safe).
 */
import Konva from 'konva';
import type { LayerAnimation } from '@sn-editor/editor-core';

export {
  IMAGE_ANIMATIONS,
  defaultAnimation,
} from './layerAnimationPresets';

type TweenHandle = { destroy: () => void };

/**
 * Plays the layer animation on a Konva node. Returns a disposer.
 */
export function playLayerAnimation(
  node: Konva.Node,
  animation: LayerAnimation | undefined,
  base: { x: number; y: number; opacity: number; scaleX: number; scaleY: number },
): TweenHandle | null {
  if (!animation || animation.type === 'none') return null;

  const duration = Math.max(0.25, (animation.durationMs ?? 900) / 1000);
  const tweens: Konva.Tween[] = [];
  let intervalId: number | null = null;

  const restore = () => {
    node.x(base.x);
    node.y(base.y);
    node.opacity(base.opacity);
    node.scaleX(base.scaleX);
    node.scaleY(base.scaleY);
    node.getLayer()?.batchDraw();
  };

  const destroy = () => {
    if (intervalId != null) window.clearInterval(intervalId);
    for (const tw of tweens) {
      try {
        tw.destroy();
      } catch {
        /* ignore */
      }
    }
    restore();
  };

  const makeTween = (attrs: Omit<Konva.TweenConfig, 'node'>) => {
    const tw = new Konva.Tween({
      duration,
      easing: Konva.Easings.EaseInOut,
      ...attrs,
      node,
    });
    tweens.push(tw);
    tw.play();
    return tw;
  };

  switch (animation.type) {
    case 'fade': {
      node.opacity(0);
      makeTween({ opacity: base.opacity });
      break;
    }
    case 'rise': {
      node.opacity(0);
      node.y(base.y + 36);
      makeTween({
        opacity: base.opacity,
        y: base.y,
        easing: Konva.Easings.EaseOut,
      });
      break;
    }
    case 'pan': {
      node.opacity(0);
      node.x(base.x - 48);
      makeTween({
        opacity: base.opacity,
        x: base.x,
        easing: Konva.Easings.EaseOut,
      });
      break;
    }
    case 'zoom': {
      node.opacity(0);
      node.scaleX(base.scaleX * 0.82);
      node.scaleY(base.scaleY * 0.82);
      makeTween({
        opacity: base.opacity,
        scaleX: base.scaleX,
        scaleY: base.scaleY,
        easing: Konva.Easings.EaseOut,
      });
      break;
    }
    case 'bounce': {
      node.opacity(0);
      node.y(base.y + 28);
      makeTween({
        opacity: base.opacity,
        y: base.y,
        easing: Konva.Easings.BounceEaseOut,
      });
      break;
    }
    case 'breathe': {
      const tw = makeTween({
        scaleX: base.scaleX * 1.04,
        scaleY: base.scaleY * 1.04,
        yoyo: true,
        easing: Konva.Easings.EaseInOut,
      });
      if (animation.loop !== false) {
        intervalId = window.setInterval(() => {
          try {
            tw.reset();
            tw.play();
          } catch {
            if (intervalId != null) window.clearInterval(intervalId);
          }
        }, duration * 2000);
      }
      break;
    }
    case 'float': {
      const tw = makeTween({
        y: base.y - 10,
        yoyo: true,
        easing: Konva.Easings.EaseInOut,
      });
      if (animation.loop !== false) {
        intervalId = window.setInterval(() => {
          try {
            tw.reset();
            tw.play();
          } catch {
            if (intervalId != null) window.clearInterval(intervalId);
          }
        }, duration * 2000);
      }
      break;
    }
    default:
      return null;
  }

  return { destroy };
}
