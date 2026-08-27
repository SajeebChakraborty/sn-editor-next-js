/**
 * Canva-style Transitions panel — click a preset to apply at the clip join.
 */
'use client';

import { useMemo, useState } from 'react';
import { useVideoEditorStore } from '@/store/videoEditorStore';
import { TRANSITION_TYPES } from '@/lib/videoClipStyles';
import { setFxDragData, endFxDrag } from '@/lib/fxDragDrop';
import {
  TransitionDemoThumb,
  useDemoKeyframes,
  type TransitionDemoId,
} from './TransitionEffectDemos';
import { formatDuration } from '@/lib/mediaUpload';

export function VideoTransitionPanel() {
  const project = useVideoEditorStore((s) => s.project);
  const selectedClipId = useVideoEditorStore((s) => s.selectedClipId);
  const setSelectedClipId = useVideoEditorStore((s) => s.setSelectedClipId);
  const setJunctionTransition = useVideoEditorStore((s) => s.setJunctionTransition);
  const setClipTransition = useVideoEditorStore((s) => s.setClipTransition);
  const setTransitionDuration = useVideoEditorStore((s) => s.setTransitionDuration);
  const seekTo = useVideoEditorStore((s) => s.seekTo);
  const setStatusMessage = useVideoEditorStore((s) => s.setStatusMessage);
  const [demoTransition, setDemoTransition] = useState<TransitionDemoId | null>(null);
  useDemoKeyframes();

  const junctions = useMemo(() => {
    const videoTrackIds = new Set(
      project.tracks.filter((t) => t.kind === 'video').map((t) => t.id),
    );
    const clips = [...project.clips]
      .filter((c) => videoTrackIds.has(c.trackId) || Boolean(c.src && !c.text))
      .sort((a, b) => a.startMs - b.startMs || a.trackId.localeCompare(b.trackId));

    const pairs: { fromId: string; toId: string; fromName: string; toName: string; joinMs: number }[] =
      [];
    for (let i = 1; i < clips.length; i++) {
      const from = clips[i - 1]!;
      const to = clips[i]!;
      if (from.trackId === to.trackId || videoTrackIds.has(from.trackId)) {
        pairs.push({
          fromId: from.id,
          toId: to.id,
          fromName: from.name,
          toName: to.name,
          joinMs: to.startMs,
        });
      }
    }
    return pairs;
  }, [project.clips, project.tracks]);

  const activeJunction = useMemo(() => {
    if (!junctions.length) return null;
    const bySelected = junctions.find(
      (j) => j.toId === selectedClipId || j.fromId === selectedClipId,
    );
    return bySelected ?? junctions[0]!;
  }, [junctions, selectedClipId]);

  const appliedTransition = activeJunction
    ? project.transitions.find(
        (t) => t.fromClipId === activeJunction.fromId && t.toClipId === activeJunction.toId,
      ) ?? project.transitions.find((t) => t.toClipId === activeJunction.toId)
    : undefined;

  const appliedType = appliedTransition?.type ?? 'none';

  const applyType = (type: string) => {
    if (activeJunction) {
      setJunctionTransition(activeJunction.fromId, activeJunction.toId, type);
      return;
    }
    if (selectedClipId) {
      setClipTransition(selectedClipId, type);
      return;
    }
    setStatusMessage('Add two video clips, then click + between them');
  };

  return (
    <div className="space-y-3 p-3">
      <h2 className="text-sm font-bold text-ink-900">Transitions</h2>
      <p className="text-[11px] text-ink-600">
        Click <strong>+</strong> between two clips on the timeline, then pick a style — same as Canva.
      </p>

      {junctions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-fog-300 bg-fog-50 px-3 py-4 text-[11px] text-ink-600">
          Add at least <strong>two video clips</strong> on the VIDEO track to place a transition.
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">
            Clip joins
          </p>
          {junctions.map((j) => {
            const active =
              activeJunction?.fromId === j.fromId && activeJunction?.toId === j.toId;
            const hasTr = project.transitions.some(
              (t) =>
                t.fromClipId === j.fromId && t.toClipId === j.toId && t.type !== 'none',
            );
            return (
              <button
                key={`${j.fromId}-${j.toId}`}
                type="button"
                className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left text-[11px] ${
                  active
                    ? 'border-[var(--sn-editor-accent)] bg-[var(--sn-editor-accent-muted)] text-ink-900'
                    : 'border-fog-200 bg-[var(--sn-editor-panel)] text-ink-800 hover:border-[var(--sn-editor-accent-soft)]'
                }`}
                onClick={() => {
                  setSelectedClipId(j.toId);
                  seekTo(Math.max(0, j.joinMs - 400));
                }}
              >
                <span className="truncate font-medium">
                  {j.fromName} → {j.toName}
                </span>
                {hasTr ? (
                  <span className="ml-2 shrink-0 rounded bg-[var(--sn-editor-accent)] px-1.5 py-0.5 text-[9px] font-semibold text-white">
                    Set
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {TRANSITION_TYPES.map((t) => {
          const active = appliedType === t.id || (!appliedType && t.id === 'none');
          const playing = demoTransition === t.id;
          return (
            <button
              key={t.id}
              type="button"
              draggable={t.id !== 'none'}
              className={`rounded-xl border bg-fog-50 p-1.5 text-left transition ${
                active
                  ? 'border-[var(--sn-editor-accent)] ring-2 ring-[var(--sn-editor-accent)]'
                  : 'border-fog-200 hover:border-[var(--sn-editor-accent-soft)]'
              } ${t.id !== 'none' ? 'cursor-grab active:cursor-grabbing' : ''}`}
              onMouseEnter={() => setDemoTransition(t.id as TransitionDemoId)}
              onFocus={() => setDemoTransition(t.id as TransitionDemoId)}
              onDragStart={(e) => {
                if (t.id === 'none') {
                  e.preventDefault();
                  return;
                }
                setFxDragData(e.dataTransfer, {
                  kind: 'transition',
                  id: t.id,
                  label: t.label,
                });
              }}
              onDragEnd={() => endFxDrag()}
              onClick={() => applyType(t.id)}
            >
              <TransitionDemoThumb
                id={t.id as TransitionDemoId}
                label={t.label}
                active={active}
                playing={playing || demoTransition === null}
              />
              <p className="mt-1 text-center text-[10px] font-semibold text-ink-800">{t.label}</p>
            </button>
          );
        })}
      </div>

      {appliedTransition && appliedTransition.type !== 'none' ? (
        <div className="space-y-2 rounded-xl border border-fog-200 bg-white p-3">
          <label className="block text-[10px] font-semibold text-ink-600">
            <span className="mb-0.5 flex justify-between">
              <span>Duration</span>
              <span className="font-normal text-ink-500">
                {formatDuration(appliedTransition.durationMs)}
              </span>
            </span>
            <input
              type="range"
              className="w-full accent-[var(--sn-editor-accent)]"
              min={200}
              max={3000}
              step={50}
              value={appliedTransition.durationMs}
              onChange={(e) => {
                if (activeJunction) {
                  setTransitionDuration(activeJunction.toId, Number(e.target.value));
                }
              }}
            />
          </label>
          <button
            type="button"
            className="w-full rounded-lg border border-fog-200 py-2 text-[11px] font-semibold text-ink-800 hover:border-red-300 hover:text-red-700"
            onClick={() => applyType('none')}
          >
            Remove transition
          </button>
        </div>
      ) : null}
    </div>
  );
}
