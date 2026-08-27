/**
 * Adjust duration / intensity for effects, transitions, and filters on the selected clip.
 */
'use client';

import { useMemo } from 'react';
import { useVideoEditorStore } from '@/store/videoEditorStore';
import { VIDEO_EFFECTS } from '@/lib/clientVideoEffects';
import { formatDuration } from '@/lib/mediaUpload';

export function ClipFxAdjust() {
  const project = useVideoEditorStore((s) => s.project);
  const selectedClipId = useVideoEditorStore((s) => s.selectedClipId);
  const setEffectSetting = useVideoEditorStore((s) => s.setEffectSetting);
  const setFilterStrength = useVideoEditorStore((s) => s.setFilterStrength);
  const setTransitionDuration = useVideoEditorStore((s) => s.setTransitionDuration);
  const applyEffect = useVideoEditorStore((s) => s.applyEffect);
  const patchClip = useVideoEditorStore((s) => s.patchClip);
  const setClipTransition = useVideoEditorStore((s) => s.setClipTransition);

  const clip = useMemo(
    () => project.clips.find((c) => c.id === selectedClipId),
    [project.clips, selectedClipId],
  );

  const transition = useMemo(
    () => (clip ? project.transitions.find((t) => t.toClipId === clip.id) : undefined),
    [project.transitions, clip],
  );

  if (!clip) return null;

  const effects = clip.effectIds ?? [];
  const hasFilter = Boolean(clip.preset && clip.preset !== 'none');
  const strength = clip.filterStrength ?? 100;

  if (!effects.length && !transition && !hasFilter) {
    return (
      <div className="rounded-xl border border-dashed border-fog-300 bg-fog-50 px-3 py-2 text-[10px] text-ink-500">
        Drag an effect, transition, or filter onto this clip — then adjust duration here.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-fog-200 bg-[var(--sn-editor-panel)] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-600">
        Adjust on “{clip.name}”
      </p>

      {/* Clip length (resize) */}
      <label className="block text-[10px] font-semibold text-ink-600">
        <span className="mb-0.5 flex justify-between">
          <span>Clip duration</span>
          <span className="font-normal text-ink-500">{formatDuration(clip.durationMs)}</span>
        </span>
        <input
          type="range"
          className="w-full"
          min={500}
          max={Math.max(60_000, clip.durationMs)}
          step={100}
          value={clip.durationMs}
          onChange={(e) =>
            patchClip(clip.id, { durationMs: Number(e.target.value) }, 'Clip duration')
          }
        />
      </label>

      {transition && transition.type !== 'none' ? (
        <div className="space-y-1 border-t border-fog-200 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-ink-700">
              Transition: {transition.type}
            </span>
            <button
              type="button"
              className="text-[10px] font-semibold text-red-700"
              onClick={() => setClipTransition(clip.id, 'none')}
            >
              Remove
            </button>
          </div>
          <label className="block text-[10px] font-semibold text-ink-600">
            <span className="mb-0.5 flex justify-between">
              <span>Transition duration</span>
              <span className="font-normal text-ink-500">
                {formatDuration(transition.durationMs)}
              </span>
            </span>
            <input
              type="range"
              className="w-full"
              min={200}
              max={3000}
              step={50}
              value={transition.durationMs}
              onChange={(e) => setTransitionDuration(clip.id, Number(e.target.value))}
            />
          </label>
        </div>
      ) : null}

      {hasFilter ? (
        <div className="space-y-1 border-t border-fog-200 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-ink-700">
              Filter: {(clip.preset ?? 'none').toUpperCase()}
            </span>
            <button
              type="button"
              className="text-[10px] font-semibold text-red-700"
              onClick={() =>
                patchClip(clip.id, { preset: 'none', adjust: undefined, filterStrength: 100 }, 'Filter cleared')
              }
            >
              Remove
            </button>
          </div>
          <label className="block text-[10px] font-semibold text-ink-600">
            <span className="mb-0.5 flex justify-between">
              <span>Filter strength</span>
              <span className="font-normal text-ink-500">{strength}%</span>
            </span>
            <input
              type="range"
              className="w-full"
              min={0}
              max={100}
              step={1}
              value={strength}
              onChange={(e) => setFilterStrength(clip.id, Number(e.target.value))}
            />
          </label>
        </div>
      ) : null}

      {effects.map((id) => {
        const meta = VIDEO_EFFECTS.find((e) => e.id === id);
        const settings = clip.effectSettings?.[id] ?? { durationMs: 1200, intensity: 100 };
        const dur = settings.durationMs ?? 1200;
        const intensity = settings.intensity ?? 100;
        return (
          <div key={id} className="space-y-1 border-t border-fog-200 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-ink-700">
                Effect: {meta?.label ?? id}
              </span>
              <button
                type="button"
                className="text-[10px] font-semibold text-red-700"
                onClick={() => applyEffect(id as (typeof VIDEO_EFFECTS)[number]['id'])}
              >
                Remove
              </button>
            </div>
            <label className="block text-[10px] font-semibold text-ink-600">
              <span className="mb-0.5 flex justify-between">
                <span>Effect duration</span>
                <span className="font-normal text-ink-500">{formatDuration(dur)}</span>
              </span>
              <input
                type="range"
                className="w-full"
                min={200}
                max={Math.max(clip.durationMs, 2000)}
                step={50}
                value={Math.min(dur, Math.max(clip.durationMs, 2000))}
                onChange={(e) =>
                  setEffectSetting(clip.id, id, { durationMs: Number(e.target.value) })
                }
              />
            </label>
            <label className="block text-[10px] font-semibold text-ink-600">
              <span className="mb-0.5 flex justify-between">
                <span>Intensity</span>
                <span className="font-normal text-ink-500">{intensity}%</span>
              </span>
              <input
                type="range"
                className="w-full"
                min={0}
                max={100}
                step={1}
                value={intensity}
                onChange={(e) =>
                  setEffectSetting(clip.id, id, { intensity: Number(e.target.value) })
                }
              />
            </label>
          </div>
        );
      })}
    </div>
  );
}
