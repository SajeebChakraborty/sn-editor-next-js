import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyVideoProject } from './types';
import { addClip, rippleDelete, splitClip } from './timeline';

describe('timeline', () => {
  it('splits and ripple-deletes', () => {
    let p = createEmptyVideoProject();
    const trackId = p.tracks[0]!.id;
    p = addClip(p, {
      trackId,
      name: 'A',
      startMs: 0,
      durationMs: 4000,
      sourceOffsetMs: 0,
    });
    assert.equal(p.durationMs, 4000);
    const id = p.clips[0]!.id;
    p = splitClip(p, id, 2000);
    assert.equal(p.clips.length, 2);
    p = rippleDelete(p, p.clips[0]!.id);
    assert.equal(p.clips.length, 1);
    assert.equal(p.clips[0]!.startMs, 0);
  });
});
