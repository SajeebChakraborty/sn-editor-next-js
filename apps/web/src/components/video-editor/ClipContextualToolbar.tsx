/**
 * Canva-style floating toolbar above the preview when a clip is selected.
 */
'use client';

import { useMemo, useState } from 'react';
import { useVideoEditorStore } from '@/store/videoEditorStore';
import { SPEED_OPTIONS } from '@/lib/videoClipStyles';
import { formatDuration } from '@/lib/mediaUpload';

export function ClipContextualToolbar() {
  const project = useVideoEditorStore((s) => s.project);
  const selectedClipId = useVideoEditorStore((s) => s.selectedClipId);
  const setActivePanel = useVideoEditorStore((s) => s.setActivePanel);
  const patchClip = useVideoEditorStore((s) => s.patchClip);
  const removeClip = useVideoEditorStore((s) => s.removeClip);
  const toggleTrackLock = useVideoEditorStore((s) => s.toggleTrackLock);
  const [speedOpen, setSpeedOpen] = useState(false);

  const clip = useMemo(
    () => project.clips.find((c) => c.id === selectedClipId),
    [project.clips, selectedClipId],
  );

  const track = useMemo(
    () => (clip ? project.tracks.find((t) => t.id === clip.trackId) : undefined),
    [project.tracks, clip],
  );

  if (!clip) return null;

  const isText = Boolean(clip.text);
  const speed = clip.speed ?? 1;
  const opacity = clip.opacity ?? 100;

  return (
    <div
      className="mb-2 flex max-w-full flex-wrap items-center justify-center gap-0.5 rounded-xl border border-[var(--sn-editor-border)] bg-white px-1.5 py-1 shadow-sm"
      role="toolbar"
      aria-label="Clip tools"
    >
      <button
        type="button"
        className="canva-ctx-btn"
        onClick={() => setActivePanel(isText ? 'text' : 'media')}
      >
        Edit
      </button>
      <span className="canva-ctx-dur" title="Clip duration">
        {formatDuration(clip.durationMs)}
      </span>
      {!isText && (
        <>
          <button
            type="button"
            className="canva-ctx-btn"
            title="Background remover (coming soon)"
            onClick={() => setActivePanel('filters')}
          >
            BG Remover
          </button>
          <button
            type="button"
            className="canva-ctx-btn"
            onClick={() => setActivePanel('audio')}
          >
            Audio tools
          </button>
          <div className="relative">
            <button
              type="button"
              className="canva-ctx-btn"
              onClick={() => setSpeedOpen((o) => !o)}
            >
              Speed {speed}×
            </button>
            {speedOpen && (
              <div className="absolute left-0 top-full z-40 mt-1 flex flex-col rounded-lg border border-fog-200 bg-white py-1 shadow-lg">
                {SPEED_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`px-3 py-1.5 text-left text-[11px] font-semibold hover:bg-[var(--sn-editor-accent-muted)] ${
                      speed === s ? 'text-[var(--sn-editor-accent-deep)]' : 'text-ink-800'
                    }`}
                    onClick={() => {
                      patchClip(clip.id, { speed: s }, 'Speed');
                      setSpeedOpen(false);
                    }}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            className="canva-ctx-btn"
            onClick={() => setActivePanel('filters')}
          >
            Filter
          </button>
          <button
            type="button"
            className="canva-ctx-btn"
            title="Flip horizontal"
            onClick={() =>
              patchClip(clip.id, { flipX: !clip.flipX }, clip.flipX ? 'Unflip' : 'Flip')
            }
          >
            Flip
          </button>
        </>
      )}
      <button
        type="button"
        className="canva-ctx-btn canva-ctx-btn-accent"
        onClick={() => setActivePanel('effects')}
      >
        Animate
      </button>
      <button
        type="button"
        className="canva-ctx-btn"
        onClick={() => setActivePanel('align')}
      >
        Position
      </button>
      <label className="canva-ctx-btn flex cursor-pointer items-center gap-1" title="Transparency">
        <span className="sr-only">Opacity</span>
        <input
          type="range"
          min={10}
          max={100}
          value={opacity}
          className="w-14 accent-[var(--sn-editor-accent)]"
          onChange={(e) =>
            patchClip(clip.id, { opacity: Number(e.target.value) }, 'Opacity')
          }
        />
      </label>
      {track && (
        <button
          type="button"
          className="canva-ctx-btn"
          title={track.locked ? 'Unlock track' : 'Lock track'}
          onClick={() => toggleTrackLock(track.id)}
        >
          {track.locked ? 'Unlock' : 'Lock'}
        </button>
      )}
      <button
        type="button"
        className="canva-ctx-btn canva-ctx-btn-danger"
        title="Delete clip"
        onClick={() => removeClip(clip.id)}
      >
        Delete
      </button>
    </div>
  );
}
