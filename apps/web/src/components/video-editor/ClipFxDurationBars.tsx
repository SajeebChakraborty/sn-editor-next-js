/**
 * Mouse-resizable duration bars for transitions & effects on a timeline clip.
 */
'use client';

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { msToPx, pxToMs } from '@sn-editor/video-engine';
import { useVideoEditorStore } from '@/store/videoEditorStore';
import { VIDEO_EFFECTS } from '@/lib/clientVideoEffects';
import { formatDuration } from '@/lib/mediaUpload';

const FX_COLORS = ['#a78bfa', '#f472b6', '#38bdf8', '#fbbf24', '#34d399'];

export function ClipFxDurationBars({
  clipId,
  clipDurationMs,
  pxPerSecond,
}: {
  clipId: string;
  clipDurationMs: number;
  pxPerSecond: number;
}) {
  const projectClip = useVideoEditorStore((s) => s.project.clips.find((c) => c.id === clipId));
  const transition = useVideoEditorStore((s) =>
    s.project.transitions.find((t) => t.toClipId === clipId && t.type !== 'none'),
  );
  const setEffectSetting = useVideoEditorStore((s) => s.setEffectSetting);
  const setTransitionDuration = useVideoEditorStore((s) => s.setTransitionDuration);
  const setActivePanel = useVideoEditorStore((s) => s.setActivePanel);
  const setSelectedClipId = useVideoEditorStore((s) => s.setSelectedClipId);

  const dragRef = useRef<{
    kind: 'transition' | 'effect';
    effectId?: string;
    originX: number;
    originMs: number;
  } | null>(null);
  const draftMsRef = useRef<number | null>(null);
  const [draftMs, setDraftMs] = useState<{ key: string; ms: number } | null>(null);

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dMs = pxToMs(e.clientX - drag.originX, pxPerSecond);
      const next = Math.max(
        200,
        Math.min(clipDurationMs, Math.round(drag.originMs + dMs)),
      );
      draftMsRef.current = next;
      const key = drag.kind === 'transition' ? 'tr' : `fx:${drag.effectId}`;
      setDraftMs({ key, ms: next });
    },
    [pxPerSecond, clipDurationMs],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent) => {
      const drag = dragRef.current;
      dragRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (!drag) {
        setDraftMs(null);
        draftMsRef.current = null;
        return;
      }
      const ms =
        draftMsRef.current ??
        Math.max(
          200,
          Math.min(
            clipDurationMs,
            Math.round(drag.originMs + pxToMs(e.clientX - drag.originX, pxPerSecond)),
          ),
        );
      if (drag.kind === 'transition') {
        setTransitionDuration(clipId, ms);
      } else if (drag.effectId) {
        setEffectSetting(clipId, drag.effectId, { durationMs: ms });
      }
      setDraftMs(null);
      draftMsRef.current = null;
    },
    [clipId, clipDurationMs, pxPerSecond, setTransitionDuration, setEffectSetting],
  );

  const startResize =
    (kind: 'transition' | 'effect', originMs: number, effectId?: string) =>
    (e: ReactPointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setSelectedClipId(clipId);
      if (kind === 'transition') setActivePanel('transitions');
      else setActivePanel('effects');
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = { kind, effectId, originX: e.clientX, originMs };
      setDraftMs({
        key: kind === 'transition' ? 'tr' : `fx:${effectId}`,
        ms: originMs,
      });
    };

  if (!projectClip && !transition) return null;

  const effects = projectClip?.effectIds ?? [];
  const hasFilter = Boolean(projectClip?.preset && projectClip.preset !== 'none');

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0 z-[6]">
      {/* Transition duration — purple bar from clip start */}
      {transition ? (
        <div
          className="pointer-events-auto absolute bottom-0 left-0 h-2 rounded-bl-md bg-violet-400/90"
          style={{
            width: Math.max(
              6,
              msToPx(
                draftMs?.key === 'tr' ? draftMs.ms : transition.durationMs,
                pxPerSecond,
              ),
            ),
          }}
          title={`Transition ${transition.type} · ${formatDuration(
            draftMs?.key === 'tr' ? draftMs.ms : transition.durationMs,
          )} — drag edge to resize`}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedClipId(clipId);
            setActivePanel('transitions');
          }}
        >
          <span className="pointer-events-none absolute -top-3 left-0 rounded bg-violet-700 px-0.5 text-[7px] font-bold text-white">
            TR
          </span>
          <div
            className="absolute inset-y-0 right-0 z-10 w-2 cursor-ew-resize rounded-r bg-white/70 hover:bg-white"
            onPointerDown={startResize('transition', transition.durationMs)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>
      ) : null}

      {/* Effect duration bars — stacked above clip bottom */}
      {effects.map((id, i) => {
        const settings = projectClip?.effectSettings?.[id];
        const baseMs = settings?.durationMs ?? Math.round(clipDurationMs * 0.4);
        const key = `fx:${id}`;
        const ms = draftMs?.key === key ? draftMs.ms : baseMs;
        const label = VIDEO_EFFECTS.find((e) => e.id === id)?.label ?? id;
        const color = FX_COLORS[i % FX_COLORS.length]!;
        return (
          <div
            key={id}
            className="pointer-events-auto absolute left-0 h-1.5 rounded-sm"
            style={{
              bottom: 8 + i * 5,
              width: Math.max(6, msToPx(Math.min(ms, clipDurationMs), pxPerSecond)),
              background: color,
            }}
            title={`${label} · ${formatDuration(ms)} — drag edge to resize duration`}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedClipId(clipId);
              setActivePanel('effects');
            }}
          >
            <div
              className="absolute inset-y-0 right-0 z-10 w-1.5 cursor-ew-resize bg-white/80 hover:bg-white"
              onPointerDown={startResize('effect', baseMs, id)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          </div>
        );
      })}

      {/* Filter marker (whole-clip look — resize clip edges to change length) */}
      {hasFilter ? (
        <div
          className="pointer-events-auto absolute right-1 top-0.5 rounded bg-amber-500/90 px-0.5 text-[7px] font-bold text-ink-900"
          title={`Filter ${(projectClip?.preset ?? '').toUpperCase()} · strength ${projectClip?.filterStrength ?? 100}% — open Filter panel to adjust`}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedClipId(clipId);
            setActivePanel('filters');
          }}
        >
          FLT
        </div>
      ) : null}
    </div>
  );
}
