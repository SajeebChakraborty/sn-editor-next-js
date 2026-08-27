/**
 * Canva-style Animate panel — presets, Both / On enter / On exit, intensity.
 */
'use client';

import { useMemo, useState } from 'react';
import { useVideoEditorStore } from '@/store/videoEditorStore';
import { VIDEO_EFFECTS, type VideoEffectId } from '@/lib/clientVideoEffects';
import { setFxDragData, endFxDrag } from '@/lib/fxDragDrop';
import {
  EffectDemoThumb,
  useDemoKeyframes,
  type EffectDemoId,
} from './TransitionEffectDemos';

type AnimatePhase = 'both' | 'enter' | 'exit';

export function VideoEffectsPanel() {
  const project = useVideoEditorStore((s) => s.project);
  const selectedClipId = useVideoEditorStore((s) => s.selectedClipId);
  const applyEffect = useVideoEditorStore((s) => s.applyEffect);
  const setEffectSetting = useVideoEditorStore((s) => s.setEffectSetting);
  const setStatusMessage = useVideoEditorStore((s) => s.setStatusMessage);
  const [demoEffect, setDemoEffect] = useState<EffectDemoId | null>(null);
  const [phase, setPhase] = useState<AnimatePhase>('both');
  useDemoKeyframes();

  const selectedClip = useMemo(
    () => project.clips.find((c) => c.id === selectedClipId),
    [project.clips, selectedClipId],
  );

  const primaryEffectId = selectedClip?.effectIds?.[0];
  const primarySettings = primaryEffectId
    ? selectedClip?.effectSettings?.[primaryEffectId]
    : undefined;
  const intensity = primarySettings?.intensity ?? 100;
  const activePhase = (primarySettings?.phase as AnimatePhase | undefined) ?? phase;

  const featured = VIDEO_EFFECTS.filter((e) => e.category === 'Featured');
  const reveal = VIDEO_EFFECTS.filter((e) => e.category === 'Reveal');

  const applyPhaseToClip = (next: AnimatePhase) => {
    setPhase(next);
    if (!selectedClip?.effectIds?.length) return;
    for (const id of selectedClip.effectIds) {
      const windowMs = Math.max(400, Math.round(selectedClip.durationMs * 0.35));
      if (next === 'exit') {
        setEffectSetting(selectedClip.id, id, {
          phase: next,
          offsetMs: Math.max(0, selectedClip.durationMs - windowMs),
          durationMs: windowMs,
        });
      } else if (next === 'enter') {
        setEffectSetting(selectedClip.id, id, {
          phase: next,
          offsetMs: 0,
          durationMs: windowMs,
        });
      } else {
        setEffectSetting(selectedClip.id, id, {
          phase: next,
          offsetMs: 0,
          durationMs: selectedClip.durationMs,
        });
      }
    }
  };

  const renderGrid = (items: ReadonlyArray<(typeof VIDEO_EFFECTS)[number]>) => (
    <div className="grid grid-cols-2 gap-2">
      {items.map((fx) => {
        const active = Boolean(selectedClip?.effectIds?.includes(fx.id));
        const playing = demoEffect === fx.id;
        return (
          <button
            key={fx.id}
            type="button"
            draggable
            className={`cursor-grab rounded-xl border bg-fog-50 p-1.5 text-left transition active:cursor-grabbing ${
              active
                ? 'border-[var(--sn-editor-accent)] ring-2 ring-[var(--sn-editor-accent)]'
                : 'border-fog-200 hover:border-[var(--sn-editor-accent-soft)]'
            }`}
            onMouseEnter={() => setDemoEffect(fx.id as EffectDemoId)}
            onFocus={() => setDemoEffect(fx.id as EffectDemoId)}
            onDragStart={(e) => {
              setFxDragData(e.dataTransfer, {
                kind: 'effect',
                id: fx.id,
                label: fx.label,
              });
              e.dataTransfer.setDragImage(e.currentTarget, 40, 24);
            }}
            onDragEnd={() => endFxDrag()}
            onClick={() => {
              if (!selectedClip) {
                setStatusMessage('Select a clip on the timeline first');
                return;
              }
              const wasOn = Boolean(selectedClip.effectIds?.includes(fx.id));
              applyEffect(fx.id as VideoEffectId);
              if (!wasOn) {
                const clipId = selectedClip.id;
                const windowMs = Math.max(400, Math.round(selectedClip.durationMs * 0.35));
                if (phase === 'exit') {
                  setEffectSetting(clipId, fx.id, {
                    phase,
                    offsetMs: Math.max(0, selectedClip.durationMs - windowMs),
                    durationMs: windowMs,
                  });
                } else if (phase === 'enter') {
                  setEffectSetting(clipId, fx.id, {
                    phase,
                    offsetMs: 0,
                    durationMs: windowMs,
                  });
                } else {
                  setEffectSetting(clipId, fx.id, {
                    phase,
                    offsetMs: 0,
                    durationMs: selectedClip.durationMs,
                  });
                }
              }
            }}
          >
            <EffectDemoThumb
              id={fx.id as EffectDemoId}
              label={fx.label}
              active={active}
              playing={playing || demoEffect === null}
            />
            <p className="mt-1 text-center text-[10px] font-semibold text-ink-800">{fx.label}</p>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink-900">Animate</h2>
      </div>
      <p className="text-[11px] text-ink-600">
        Pick a motion style for the selected clip — same flow as Canva Animate.
      </p>

      {!selectedClip ? (
        <div className="rounded-xl border border-dashed border-fog-300 bg-fog-50 px-3 py-4 text-[11px] text-ink-600">
          Select a clip on the canvas or timeline to animate it.
        </div>
      ) : (
        <p className="text-[11px] font-semibold text-ink-800">Editing: {selectedClip.name}</p>
      )}

      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">Featured</p>
      {renderGrid(featured)}

      {selectedClip?.effectIds?.length ? (
        <div className="space-y-2 rounded-xl border border-fog-200 bg-white p-3">
          <div className="flex gap-1 rounded-lg bg-fog-100 p-0.5">
            {([
              ['both', 'Both'],
              ['enter', 'On enter'],
              ['exit', 'On exit'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-semibold ${
                  activePhase === id
                    ? 'bg-[var(--sn-editor-accent)] text-white'
                    : 'text-ink-700 hover:bg-white'
                }`}
                onClick={() => applyPhaseToClip(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="block text-[10px] font-semibold text-ink-600">
            <span className="mb-0.5 flex justify-between">
              <span>Intensity</span>
              <span className="font-normal text-ink-500">{intensity}%</span>
            </span>
            <input
              type="range"
              className="w-full accent-[var(--sn-editor-accent)]"
              min={0}
              max={100}
              value={intensity}
              onChange={(e) => {
                const v = Number(e.target.value);
                for (const id of selectedClip.effectIds ?? []) {
                  setEffectSetting(selectedClip.id, id, { intensity: v });
                }
              }}
            />
          </label>
          <button
            type="button"
            className="w-full rounded-lg border border-fog-200 py-2 text-[11px] font-semibold text-ink-800 hover:border-red-300 hover:text-red-700"
            onClick={() => {
              for (const id of [...(selectedClip.effectIds ?? [])]) {
                applyEffect(id as VideoEffectId);
              }
            }}
          >
            Remove animation
          </button>
        </div>
      ) : null}

      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">Reveal</p>
      {renderGrid(reveal)}
    </div>
  );
}
