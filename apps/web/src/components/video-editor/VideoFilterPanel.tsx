/**
 * Color / look filters (presets + adjust) for the selected video clip.
 */
'use client';

import { useMemo } from 'react';
import { DEFAULT_ADJUST, type ClipAdjust } from '@sn-editor/video-engine';
import { useVideoEditorStore } from '@/store/videoEditorStore';
import {
  VIDEO_PRESETS,
  adjustForPreset,
  resolveAdjust,
  type VideoPresetId,
} from '@/lib/videoClipStyles';
import { setFxDragData, endFxDrag } from '@/lib/fxDragDrop';
import { ClipFxAdjust } from './ClipFxAdjust';

const ADJUST_FIELDS: {
  key: keyof ClipAdjust;
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: 'grayscale', label: 'Grayscale', min: 0, max: 100, step: 1 },
  { key: 'blur', label: 'Blur', min: 0, max: 10, step: 0.1 },
  { key: 'brightness', label: 'Brightness', min: 0, max: 200, step: 1 },
  { key: 'contrast', label: 'Contrast', min: 0, max: 200, step: 1 },
  { key: 'saturation', label: 'Saturation', min: 0, max: 200, step: 1 },
  { key: 'sepia', label: 'Sepia', min: 0, max: 100, step: 1 },
  { key: 'hueRotate', label: 'Hue Rotate', min: -180, max: 180, step: 1 },
  { key: 'invert', label: 'Invert', min: 0, max: 100, step: 1 },
];

export function VideoFilterPanel() {
  const project = useVideoEditorStore((s) => s.project);
  const selectedClipId = useVideoEditorStore((s) => s.selectedClipId);
  const patchClip = useVideoEditorStore((s) => s.patchClip);
  const setStatusMessage = useVideoEditorStore((s) => s.setStatusMessage);

  const selectedClip = useMemo(
    () => project.clips.find((c) => c.id === selectedClipId),
    [project.clips, selectedClipId],
  );
  const isText = Boolean(selectedClip?.text);
  const adjust = selectedClip && !isText ? resolveAdjust(selectedClip) : DEFAULT_ADJUST();

  const applyPreset = (id: string) => {
    if (!selectedClip || isText) {
      setStatusMessage('Select a video clip to apply a filter');
      return;
    }
    patchClip(
      selectedClip.id,
      { preset: id as VideoPresetId, adjust: adjustForPreset(id) },
      `Filter: ${id}`,
    );
  };

  const updateAdjust = (patch: Partial<ClipAdjust>) => {
    if (!selectedClip || isText) return;
    patchClip(
      selectedClip.id,
      { adjust: { ...adjust, ...patch }, preset: 'none' },
      undefined,
    );
  };

  const commitAdjust = () => {
    if (!selectedClip || isText) return;
    const cur = useVideoEditorStore.getState().project.clips.find((c) => c.id === selectedClip.id);
    if (cur?.adjust) patchClip(selectedClip.id, { adjust: cur.adjust }, 'Filter adjust');
  };

  return (
    <div className="space-y-3 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-600">Filters</h2>
      <p className="text-[11px] text-ink-600">
        Drag a filter onto a timeline clip, or click to apply. Adjust strength and clip duration
        below.
      </p>

      {!selectedClip || isText ? (
        <div className="space-y-2">
          <div className="rounded-xl border border-dashed border-fog-300 bg-fog-50 px-3 py-4 text-[11px] text-ink-600">
            Drag a filter onto a timeline clip, or select a video clip first.
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {VIDEO_PRESETS.filter((p) => p.id !== 'none').map((p) => (
              <button
                key={p.id}
                type="button"
                draggable
                className="cursor-grab rounded-lg bg-fog-100 px-1.5 py-1.5 text-[10px] font-semibold text-ink-700 active:cursor-grabbing hover:bg-fog-200"
                onDragStart={(e) =>
                  setFxDragData(e.dataTransfer, {
                    kind: 'filter',
                    id: p.id,
                    label: p.label,
                  })
                }
                onDragEnd={() => endFxDrag()}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <p className="text-[11px] font-semibold text-ink-800">
            Editing: {selectedClip.name}
            <span className="ml-1 font-normal text-ink-500">
              ({(selectedClip.preset ?? 'none').toUpperCase()})
            </span>
          </p>

          <div className="grid grid-cols-3 gap-1.5">
            {VIDEO_PRESETS.map((p) => {
              const active = (selectedClip.preset ?? 'none') === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  draggable={p.id !== 'none'}
                  className={`cursor-grab rounded-lg px-1.5 py-1.5 text-[10px] font-semibold active:cursor-grabbing ${
                    active
                      ? 'bg-ink-900 text-white'
                      : 'bg-fog-100 text-ink-700 hover:bg-fog-200'
                  }`}
                  onDragStart={(e) => {
                    if (p.id === 'none') {
                      e.preventDefault();
                      return;
                    }
                    setFxDragData(e.dataTransfer, {
                      kind: 'filter',
                      id: p.id,
                      label: p.label,
                    });
                  }}
                  onDragEnd={() => endFxDrag()}
                  onClick={() => applyPreset(p.id)}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="space-y-2 border-t border-fog-200 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-600">
                Adjust
              </span>
              <button
                type="button"
                className="text-[10px] font-semibold text-teal-700"
                onClick={() =>
                  patchClip(
                    selectedClip.id,
                    { adjust: DEFAULT_ADJUST(), preset: 'none' },
                    'Filter reset',
                  )
                }
              >
                Reset
              </button>
            </div>
            {ADJUST_FIELDS.map((f) => (
              <label key={f.key} className="block text-[10px] font-semibold text-ink-600">
                <span className="mb-0.5 flex justify-between">
                  <span>{f.label}</span>
                  <span className="font-normal text-ink-500">{adjust[f.key]}</span>
                </span>
                <input
                  type="range"
                  className="w-full"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={adjust[f.key]}
                  onChange={(e) => updateAdjust({ [f.key]: Number(e.target.value) })}
                  onPointerUp={commitAdjust}
                  onBlur={commitAdjust}
                />
              </label>
            ))}
          </div>
        </>
      )}

      <ClipFxAdjust />
    </div>
  );
}
