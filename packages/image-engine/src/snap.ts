/** Snap-to-grid and smart alignment guides. */

export interface Rect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapResult {
  x: number;
  y: number;
  guides: Array<{ orientation: 'horizontal' | 'vertical'; position: number }>;
}

export function snapToGrid(value: number, gridSize: number): number {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Align moving rect edges/centers to other rects within threshold.
 */
export function smartAlign(
  moving: Rect,
  others: Rect[],
  threshold = 6,
): SnapResult {
  const edges = {
    left: moving.x,
    right: moving.x + moving.width,
    centerX: moving.x + moving.width / 2,
    top: moving.y,
    bottom: moving.y + moving.height,
    centerY: moving.y + moving.height / 2,
  };

  let x = moving.x;
  let y = moving.y;
  const guides: SnapResult['guides'] = [];

  for (const o of others) {
    if (o.id === moving.id) continue;
    const t = {
      left: o.x,
      right: o.x + o.width,
      centerX: o.x + o.width / 2,
      top: o.y,
      bottom: o.y + o.height,
      centerY: o.y + o.height / 2,
    };

    const pairsX: Array<[number, number, number]> = [
      [edges.left, t.left, t.left],
      [edges.left, t.right, t.right],
      [edges.right, t.left, t.left - moving.width],
      [edges.right, t.right, t.right - moving.width],
      [edges.centerX, t.centerX, t.centerX - moving.width / 2],
    ];
    for (const [a, b, targetX] of pairsX) {
      if (Math.abs(a - b) <= threshold) {
        x = targetX;
        guides.push({ orientation: 'vertical', position: b });
        break;
      }
    }

    const pairsY: Array<[number, number, number]> = [
      [edges.top, t.top, t.top],
      [edges.top, t.bottom, t.bottom],
      [edges.bottom, t.top, t.top - moving.height],
      [edges.bottom, t.bottom, t.bottom - moving.height],
      [edges.centerY, t.centerY, t.centerY - moving.height / 2],
    ];
    for (const [a, b, targetY] of pairsY) {
      if (Math.abs(a - b) <= threshold) {
        y = targetY;
        guides.push({ orientation: 'horizontal', position: b });
        break;
      }
    }
  }

  return { x, y, guides };
}

export function snapRectToGrid(rect: Rect, gridSize: number): Rect {
  return {
    ...rect,
    x: snapToGrid(rect.x, gridSize),
    y: snapToGrid(rect.y, gridSize),
  };
}
