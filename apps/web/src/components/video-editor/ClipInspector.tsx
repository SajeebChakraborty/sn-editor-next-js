/**
 * CrazyHD-style clip inspector: speed, audio, presets, adjust, transitions, export range.
 * Also hosts text style controls when a text clip is selected.
 */
'use client';

import { useMemo, useState } from 'react';
import {
  DEFAULT_ADJUST,
  DEFAULT_LAYOUT,
  DEFAULT_TEXT_STYLE,
  type ClipAdjust,
  type ClipTextStyle,
} from '@sn-editor/video-engine';
import { useVideoEditorStore } from '@/store/videoEditorStore';
import { VIDEO_EFFECTS } from '@/lib/clientVideoEffects';
import {
  FONT_FAMILIES,
  SPEED_OPTIONS,
  TRANSITION_TYPES,
  VIDEO_PRESETS,
  adjustForPreset,
  type VideoPresetId,
} from '@/lib/videoClipStyles';
import { formatDuration } from '@/lib/mediaUpload';
import {
  EffectDemoThumb,
  TransitionDemoThumb,
  useDemoKeyframes,
  type EffectDemoId,
  type TransitionDemoId,
} from './TransitionEffectDemos';

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

function Section({
  title,
  children,
  action,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-fog-200/80 pb-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          className="flex flex-1 items-center justify-between text-left"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-600">
            {title}
          </span>
          <span className="text-[10px] text-ink-500">{open ? '▴' : '▾'}</span>
        </button>
        {action}
      </div>
      {open && children}
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  onCommit,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  onCommit?: () => void;
  display?: string;
}) {
  return (
    <label className="mb-2 block">
      <div className="mb-0.5 flex justify-between text-[11px] text-ink-700">
        <span>{label}</span>
        <span className="tabular-nums text-teal-800">{display ?? value}</span>
      </div>
      <input
        type="range"
        className="w-full accent-teal-700"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseUp={onCommit}
        onTouchEnd={onCommit}
      />
    </label>
  );
}

export function ClipInspector() {
  useDemoKeyframes();
  const project = useVideoEditorStore((s) => s.project);
  const selectedClipId = useVideoEditorStore((s) => s.selectedClipId);
  const patchClip = useVideoEditorStore((s) => s.patchClip);
  const patchAudio = useVideoEditorStore((s) => s.patchAudio);
  const setExportRange = useVideoEditorStore((s) => s.setExportRange);
  const setClipTransition = useVideoEditorStore((s) => s.setClipTransition);
  const applyEffect = useVideoEditorStore((s) => s.applyEffect);
  const setStatusMessage = useVideoEditorStore((s) => s.setStatusMessage);
  const setSelectedClipId = useVideoEditorStore((s) => s.setSelectedClipId);

  const [demoTransition, setDemoTransition] = useState<TransitionDemoId | null>('fade');
  const [demoEffect, setDemoEffect] = useState<EffectDemoId | null>('zoom_punch');

  const selectedClip = project.clips.find((c) => c.id === selectedClipId) ?? null;
  const selectedAudio = project.audio.find((a) => a.id === selectedClipId) ?? null;
  const trackKind = selectedClip
    ? project.tracks.find((t) => t.id === selectedClip.trackId)?.kind
    : selectedAudio
      ? 'audio'
      : null;

  const textStyle: ClipTextStyle = useMemo(
    () => ({ ...DEFAULT_TEXT_STYLE(), ...(selectedClip?.textStyle ?? {}) }),
    [selectedClip],
  );
  const adjust: ClipAdjust = useMemo(
    () => ({ ...DEFAULT_ADJUST(), ...(selectedClip?.adjust ?? {}) }),
    [selectedClip],
  );

  const exportIn = project.exportRange?.inMs ?? 0;
  const exportOut =
    project.exportRange?.outMs && project.exportRange.outMs > 0
      ? project.exportRange.outMs
      : project.durationMs;

  const transitionForSelected = selectedClip
    ? project.transitions.find((t) => t.toClipId === selectedClip.id)
    : undefined;

  const isVideoLike =
    trackKind === 'video' ||
    (!!selectedClip?.src && /\.(mp4|webm|mov)(\?|$)/i.test(selectedClip.src));
  const isText = Boolean(selectedClip?.text) || trackKind === 'text';

  const updateTextStyle = (partial: Partial<ClipTextStyle>, message?: string) => {
    if (!selectedClip) return;
    patchClip(
      selectedClip.id,
      { textStyle: { ...textStyle, ...partial } },
      message ?? 'Text style updated',
    );
  };

  const updateAdjust = (partial: Partial<ClipAdjust>, commitMsg?: string) => {
    if (!selectedClip) return;
    const next = { ...adjust, ...partial };
    if (commitMsg) {
      patchClip(selectedClip.id, { adjust: next }, commitMsg);
    } else {
      // Live update without flooding undo — commit on pointer up via patchClip
      useVideoEditorStore.setState((s) => ({
        project: {
          ...s.project,
          clips: s.project.clips.map((c) =>
            c.id === selectedClip.id ? { ...c, adjust: next } : c,
          ),
        },
      }));
    }
  };

  const commitAdjust = () => {
    if (!selectedClip) return;
    const clip = useVideoEditorStore.getState().project.clips.find((c) => c.id === selectedClip.id);
    if (!clip?.adjust) return;
    patchClip(selectedClip.id, { adjust: clip.adjust }, 'Adjust updated');
  };

  const applyPreset = (id: VideoPresetId) => {
    if (!selectedClip) {
      setStatusMessage('Select a video clip first');
      return;
    }
    patchClip(
      selectedClip.id,
      { preset: id, adjust: adjustForPreset(id) },
      `Preset: ${id}`,
    );
  };

  return (
    <div className="space-y-3 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-600">Inspector</h2>
      <p className="text-[11px] text-ink-600">
        {selectedClip
          ? `Selected: ${selectedClip.name}`
          : selectedAudio
            ? `Audio: ${selectedAudio.name}`
            : 'Select a clip on the timeline to edit properties.'}
      </p>

      {/* ——— Text style ——— */}
      {isText && selectedClip && (
        <Section title="Text style">
          <label className="mb-2 block text-[11px] text-ink-700">
            Content
            <input
              className="mt-1 w-full rounded-lg border border-fog-200 px-2 py-1.5 text-xs"
              value={selectedClip.text ?? ''}
              onChange={(e) =>
                patchClip(
                  selectedClip.id,
                  { text: e.target.value, name: e.target.value.slice(0, 24) || 'Text' },
                  'Text edited',
                )
              }
            />
          </label>
          <label className="mb-2 block text-[11px] text-ink-700">
            Font
            <select
              className="mt-1 w-full rounded-lg border border-fog-200 px-2 py-1.5 text-xs"
              value={textStyle.fontFamily}
              onChange={(e) => updateTextStyle({ fontFamily: e.target.value }, 'Font changed')}
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <SliderRow
            label="Font size"
            value={textStyle.fontSize}
            min={12}
            max={120}
            step={1}
            onChange={(v) => {
              useVideoEditorStore.setState((s) => ({
                project: {
                  ...s.project,
                  clips: s.project.clips.map((c) =>
                    c.id === selectedClip.id
                      ? { ...c, textStyle: { ...textStyle, fontSize: v } }
                      : c,
                  ),
                },
              }));
            }}
            onCommit={() => {
              const c = useVideoEditorStore
                .getState()
                .project.clips.find((x) => x.id === selectedClip.id);
              if (c?.textStyle) patchClip(selectedClip.id, { textStyle: c.textStyle }, 'Font size');
            }}
            display={`${textStyle.fontSize}px`}
          />
          <label className="mb-2 block text-[11px] text-ink-700">
            Color
            <input
              type="color"
              className="mt-1 h-8 w-full cursor-pointer rounded border border-fog-200"
              value={textStyle.color}
              onChange={(e) => updateTextStyle({ color: e.target.value }, 'Text color')}
            />
          </label>
          <div className="mb-2 flex flex-wrap gap-1">
            <button
              type="button"
              className={`btn-tool !px-2 !py-1 text-[11px] ${
                Number(textStyle.fontWeight) >= 700 ? 'btn-tool-active' : ''
              }`}
              onClick={() =>
                updateTextStyle(
                  { fontWeight: Number(textStyle.fontWeight) >= 700 ? 400 : 700 },
                  'Bold',
                )
              }
            >
              Bold
            </button>
            <button
              type="button"
              className={`btn-tool !px-2 !py-1 text-[11px] ${
                textStyle.fontStyle === 'italic' ? 'btn-tool-active' : ''
              }`}
              onClick={() =>
                updateTextStyle(
                  { fontStyle: textStyle.fontStyle === 'italic' ? 'normal' : 'italic' },
                  'Italic',
                )
              }
            >
              Italic
            </button>
            {(['left', 'center', 'right'] as const).map((a) => (
              <button
                key={a}
                type="button"
                className={`btn-tool !px-2 !py-1 text-[11px] capitalize ${
                  textStyle.align === a ? 'btn-tool-active' : ''
                }`}
                onClick={() => updateTextStyle({ align: a }, `Align ${a}`)}
              >
                {a}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-ink-500">Drag the text on the preview to reposition.</p>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <SliderRow
              label="X %"
              value={selectedClip.layout?.x ?? DEFAULT_LAYOUT().x}
              min={0}
              max={100}
              step={1}
              onChange={(v) => {
                const layout = { ...(selectedClip.layout ?? DEFAULT_LAYOUT()), x: v };
                useVideoEditorStore.setState((s) => ({
                  project: {
                    ...s.project,
                    clips: s.project.clips.map((c) =>
                      c.id === selectedClip.id ? { ...c, layout } : c,
                    ),
                  },
                }));
              }}
              onCommit={() => {
                const c = useVideoEditorStore
                  .getState()
                  .project.clips.find((x) => x.id === selectedClip.id);
                if (c?.layout) patchClip(selectedClip.id, { layout: c.layout }, 'Text position');
              }}
            />
            <SliderRow
              label="Y %"
              value={selectedClip.layout?.y ?? DEFAULT_LAYOUT().y}
              min={0}
              max={100}
              step={1}
              onChange={(v) => {
                const layout = { ...(selectedClip.layout ?? DEFAULT_LAYOUT()), y: v };
                useVideoEditorStore.setState((s) => ({
                  project: {
                    ...s.project,
                    clips: s.project.clips.map((c) =>
                      c.id === selectedClip.id ? { ...c, layout } : c,
                    ),
                  },
                }));
              }}
              onCommit={() => {
                const c = useVideoEditorStore
                  .getState()
                  .project.clips.find((x) => x.id === selectedClip.id);
                if (c?.layout) patchClip(selectedClip.id, { layout: c.layout }, 'Text position');
              }}
            />
          </div>
        </Section>
      )}

      {/* ——— Speed ——— */}
      {(isVideoLike || selectedClip) && !isText && (
        <Section title="Speed factor">
          <div className="flex flex-wrap gap-1.5">
            {SPEED_OPTIONS.map((sp) => {
              const active = (selectedClip?.speed ?? 1) === sp;
              return (
                <button
                  key={sp}
                  type="button"
                  disabled={!selectedClip}
                  className={`btn-tool !px-3 !py-1.5 text-xs ${active ? 'btn-tool-active' : ''}`}
                  onClick={() =>
                    selectedClip &&
                    patchClip(selectedClip.id, { speed: sp }, `Speed ${sp}x`)
                  }
                >
                  {sp}x
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {/* ——— Audio level / label ——— */}
      {(selectedAudio || trackKind === 'audio') && selectedAudio && (
        <Section title="Audio level">
          <SliderRow
            label="Volume"
            value={Math.round((selectedAudio.volume ?? 0.85) * 100)}
            min={0}
            max={100}
            step={1}
            display={`${Math.round((selectedAudio.volume ?? 0.85) * 100)}%`}
            onChange={(v) => {
              useVideoEditorStore.setState((s) => ({
                project: {
                  ...s.project,
                  audio: s.project.audio.map((a) =>
                    a.id === selectedAudio.id ? { ...a, volume: v / 100 } : a,
                  ),
                },
              }));
            }}
            onCommit={() => {
              const cur = useVideoEditorStore
                .getState()
                .project.audio.find((a) => a.id === selectedAudio.id);
              if (cur) patchAudio(selectedAudio.id, { volume: cur.volume }, 'Audio level');
            }}
          />
          <label className="block text-[11px] text-ink-700">
            Audio label
            <input
              className="mt-1 w-full rounded-lg border border-fog-200 px-2 py-1.5 text-xs"
              placeholder="Shown on preview"
              value={selectedAudio.label ?? ''}
              onChange={(e) =>
                patchAudio(selectedAudio.id, { label: e.target.value }, 'Audio label')
              }
            />
          </label>
        </Section>
      )}

      {/* Show audio controls when video selected too — pick first audio */}
      {!selectedAudio && project.audio.length > 0 && (
        <Section title="Audio level" defaultOpen={false}>
          <p className="mb-2 text-[10px] text-ink-500">
            Select an audio clip on the timeline, or adjust the first bed:
          </p>
          {(() => {
            const a = project.audio[0]!;
            return (
              <>
                <SliderRow
                  label={a.name}
                  value={Math.round((a.volume ?? 0.85) * 100)}
                  min={0}
                  max={100}
                  step={1}
                  display={`${Math.round((a.volume ?? 0.85) * 100)}%`}
                  onChange={(v) => {
                    useVideoEditorStore.setState((s) => ({
                      project: {
                        ...s.project,
                        audio: s.project.audio.map((x) =>
                          x.id === a.id ? { ...x, volume: v / 100 } : x,
                        ),
                      },
                    }));
                  }}
                  onCommit={() => {
                    const cur = useVideoEditorStore.getState().project.audio.find((x) => x.id === a.id);
                    if (cur) patchAudio(a.id, { volume: cur.volume }, 'Audio level');
                  }}
                />
                <label className="block text-[11px] text-ink-700">
                  Audio label
                  <input
                    className="mt-1 w-full rounded-lg border border-fog-200 px-2 py-1.5 text-xs"
                    value={a.label ?? ''}
                    onChange={(e) => patchAudio(a.id, { label: e.target.value }, 'Audio label')}
                  />
                </label>
              </>
            );
          })()}
        </Section>
      )}

      {/* ——— Presets ——— */}
      {selectedClip && !isText && (
        <Section
          title="Presets"
          action={
            <span className="text-[10px] text-teal-800">
              {VIDEO_PRESETS.length} effects · {(selectedClip.preset ?? 'none').toUpperCase()}
            </span>
          }
        >
          <div className="grid grid-cols-3 gap-1.5">
            {VIDEO_PRESETS.map((p) => {
              const active = (selectedClip.preset ?? 'none') === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`rounded-lg px-1.5 py-1.5 text-[10px] font-semibold ${
                    active
                      ? 'bg-ink-900 text-white'
                      : 'bg-fog-100 text-ink-700 hover:bg-fog-200'
                  }`}
                  onClick={() => applyPreset(p.id)}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {/* ——— Adjust ——— */}
      {selectedClip && !isText && (
        <Section
          title="Adjust"
          action={
            <button
              type="button"
              className="text-[10px] font-semibold text-teal-700"
              onClick={() =>
                patchClip(
                  selectedClip.id,
                  { adjust: DEFAULT_ADJUST(), preset: 'none' },
                  'Adjust reset',
                )
              }
            >
              Reset
            </button>
          }
        >
          {ADJUST_FIELDS.map((f) => (
            <SliderRow
              key={f.key}
              label={f.label}
              value={adjust[f.key]}
              min={f.min}
              max={f.max}
              step={f.step}
              onChange={(v) => updateAdjust({ [f.key]: v })}
              onCommit={commitAdjust}
            />
          ))}
        </Section>
      )}

      {/* ——— Clip transitions (always visible with live demos) ——— */}
      <Section title="Clip transitions">
        <p className="mb-2 text-[10px] text-ink-500">
          Hover a card to preview the demo, then click <strong>Apply</strong>. Play from the start of
          the clip to see the transition on your video (~0.9s intro + outro).
        </p>
        <div className="grid grid-cols-2 gap-2">
          {TRANSITION_TYPES.map((t) => {
            const active =
              (transitionForSelected?.type ?? 'none') === t.id ||
              (!transitionForSelected && t.id === 'none');
            const playing = demoTransition === t.id;
            return (
              <div
                key={t.id}
                className="rounded-lg border border-fog-200 bg-fog-50 p-1.5"
                onMouseEnter={() => setDemoTransition(t.id as TransitionDemoId)}
                onFocus={() => setDemoTransition(t.id as TransitionDemoId)}
              >
                <TransitionDemoThumb
                  id={t.id as TransitionDemoId}
                  label={t.label}
                  active={active}
                  playing={playing || demoTransition === null}
                />
                <p className="mt-1 text-[9px] leading-tight text-ink-500">{t.hint}</p>
                <button
                  type="button"
                  className={`mt-1 w-full rounded-md px-1.5 py-1 text-[10px] font-semibold ${
                    active ? 'bg-teal-700 text-white' : 'bg-white text-ink-800 hover:bg-teal-700/10'
                  }`}
                  onClick={() => {
                    const target =
                      selectedClip?.id ??
                      project.clips.find((c) => {
                        const k = project.tracks.find((tr) => tr.id === c.trackId)?.kind;
                        return k === 'video' || Boolean(c.src);
                      })?.id;
                    if (!target) {
                      setStatusMessage('Add a video clip first');
                      return;
                    }
                    setSelectedClipId(target);
                    setClipTransition(target, t.id);
                  }}
                >
                  {active ? 'Applied' : 'Apply'}
                </button>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ——— Motion / FX (always visible with demos) ——— */}
      <Section title="Motion effects">
        <p className="mb-2 text-[10px] text-ink-500">
          Preview the demo on hover, then Apply to toggle the effect on your clip.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {VIDEO_EFFECTS.map((fx) => {
            const active = Boolean(selectedClip?.effectIds?.includes(fx.id));
            const playing = demoEffect === fx.id;
            return (
              <div
                key={fx.id}
                className="rounded-lg border border-fog-200 bg-fog-50 p-1.5"
                onMouseEnter={() => setDemoEffect(fx.id as EffectDemoId)}
                onFocus={() => setDemoEffect(fx.id as EffectDemoId)}
              >
                <EffectDemoThumb
                  id={fx.id as EffectDemoId}
                  label={fx.label}
                  active={active}
                  playing={playing || demoEffect === null}
                />
                <p className="mt-1 text-[9px] leading-tight text-ink-500">{fx.hint}</p>
                <button
                  type="button"
                  className={`mt-1 w-full rounded-md px-1.5 py-1 text-[10px] font-semibold ${
                    active ? 'bg-teal-700 text-white' : 'bg-white text-ink-800 hover:bg-teal-700/10'
                  }`}
                  onClick={() => applyEffect(fx.id)}
                >
                  {active ? 'On — click off' : 'Apply'}
                </button>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ——— Export range ——— */}
      <Section title="Export range">
        <div className="space-y-2 rounded-lg border border-fog-200 bg-fog-50 px-3 py-2">
          <SliderRow
            label="In Point"
            value={exportIn}
            min={0}
            max={Math.max(project.durationMs, 1)}
            step={100}
            display={formatDuration(exportIn)}
            onChange={(v) =>
              useVideoEditorStore.setState((s) => ({
                project: {
                  ...s.project,
                  exportRange: {
                    inMs: v,
                    outMs: Math.max(v, s.project.exportRange?.outMs ?? s.project.durationMs),
                  },
                },
              }))
            }
            onCommit={() => {
              const r = useVideoEditorStore.getState().project.exportRange;
              if (r) setExportRange(r.inMs, r.outMs);
            }}
          />
          <SliderRow
            label="Out Point"
            value={exportOut}
            min={0}
            max={Math.max(project.durationMs, 1)}
            step={100}
            display={formatDuration(exportOut)}
            onChange={(v) =>
              useVideoEditorStore.setState((s) => ({
                project: {
                  ...s.project,
                  exportRange: {
                    inMs: Math.min(v, s.project.exportRange?.inMs ?? 0),
                    outMs: v,
                  },
                },
              }))
            }
            onCommit={() => {
              const r = useVideoEditorStore.getState().project.exportRange;
              if (r) setExportRange(r.inMs, r.outMs);
            }}
          />
          <button
            type="button"
            className="btn-tool w-full text-[11px]"
            onClick={() => setExportRange(0, project.durationMs)}
          >
            Full timeline
          </button>
        </div>
      </Section>
    </div>
  );
}
