/** Infinite-canvas viewport: pan + zoom around a stage. */

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, scale: 1 };

export function zoomAtPoint(
  viewport: Viewport,
  pointer: { x: number; y: number },
  deltaScale: number,
  min = 0.1,
  max = 8,
): Viewport {
  const newScale = Math.min(max, Math.max(min, viewport.scale * deltaScale));
  const worldX = (pointer.x - viewport.x) / viewport.scale;
  const worldY = (pointer.y - viewport.y) / viewport.scale;
  return {
    scale: newScale,
    x: pointer.x - worldX * newScale,
    y: pointer.y - worldY * newScale,
  };
}

export function panBy(viewport: Viewport, dx: number, dy: number): Viewport {
  return { ...viewport, x: viewport.x + dx, y: viewport.y + dy };
}

/** Zoom toward the center of the visible stage. */
export function setZoomAtCenter(
  viewport: Viewport,
  view: { width: number; height: number },
  scale: number,
  min = 0.05,
  max = 8,
): Viewport {
  const next = Math.min(max, Math.max(min, scale));
  const cx = view.width / 2;
  const cy = view.height / 2;
  return zoomAtPoint(viewport, { x: cx, y: cy }, next / viewport.scale, min, max);
}

/** Fit a page/artboard into the view with padding (Canva-style). */
export function fitRectInView(
  rect: { x: number; y: number; width: number; height: number },
  view: { width: number; height: number },
  padding = 72,
  min = 0.05,
  max = 4,
): Viewport {
  if (view.width < 40 || view.height < 40 || rect.width < 1 || rect.height < 1) {
    return DEFAULT_VIEWPORT;
  }
  const scaleX = (view.width - padding * 2) / rect.width;
  const scaleY = (view.height - padding * 2) / rect.height;
  const scale = Math.min(max, Math.max(min, Math.min(scaleX, scaleY)));
  return {
    scale,
    x: view.width / 2 - (rect.x + rect.width / 2) * scale,
    y: view.height / 2 - (rect.y + rect.height / 2) * scale,
  };
}

/** Keep current zoom; only re-center the rect in the view. */
export function centerRectInView(
  viewport: Viewport,
  rect: { x: number; y: number; width: number; height: number },
  view: { width: number; height: number },
): Viewport {
  if (view.width < 40 || view.height < 40) return viewport;
  return {
    ...viewport,
    x: view.width / 2 - (rect.x + rect.width / 2) * viewport.scale,
    y: view.height / 2 - (rect.y + rect.height / 2) * viewport.scale,
  };
}
