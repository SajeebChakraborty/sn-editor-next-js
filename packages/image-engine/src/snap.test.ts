import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { smartAlign, snapToGrid } from './snap';
import { zoomAtPoint } from './viewport';

describe('snap', () => {
  it('snaps to grid', () => {
    assert.equal(snapToGrid(13, 10), 10);
    assert.equal(snapToGrid(16, 10), 20);
  });

  it('aligns centers', () => {
    const result = smartAlign(
      { id: 'a', x: 52, y: 0, width: 100, height: 50 },
      [{ id: 'b', x: 0, y: 0, width: 200, height: 50 }],
      6,
    );
    assert.equal(result.x, 50);
  });
});

describe('viewport', () => {
  it('zooms toward pointer', () => {
    const next = zoomAtPoint({ x: 0, y: 0, scale: 1 }, { x: 100, y: 100 }, 2);
    assert.equal(next.scale, 2);
  });
});
