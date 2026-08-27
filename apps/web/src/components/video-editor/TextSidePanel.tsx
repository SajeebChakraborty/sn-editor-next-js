/**
 * Canva-style Text side panel for the video editor.
 */
'use client';

import { useMemo, useState } from 'react';
import { DEFAULT_TEXT_STYLE, type ClipTextStyle } from '@sn-editor/video-engine';
import { useVideoEditorStore } from '@/store/videoEditorStore';
import { FONT_FAMILIES } from '@/lib/videoClipStyles';
import {
  filterCombinations,
  filterFonts,
  magicWriteStub,
  TEXT_PRESET_COPY,
  TEXT_PRESET_STYLES,
  type FontCombination,
  type TextPresetRole,
} from '@/lib/textPresets';

export function TextSidePanel() {
  const addTextClip = useVideoEditorStore((s) => s.addTextClip);
  const selectedClipId = useVideoEditorStore((s) => s.selectedClipId);
  const project = useVideoEditorStore((s) => s.project);
  const patchClip = useVideoEditorStore((s) => s.patchClip);
  const setActivePanel = useVideoEditorStore((s) => s.setActivePanel);

  const [query, setQuery] = useState('');
  const [showMagic, setShowMagic] = useState(false);
  const [magicPrompt, setMagicPrompt] = useState('');
  const [magicKind, setMagicKind] = useState<'headline' | 'body' | 'cta'>('headline');
  const [appsExpanded, setAppsExpanded] = useState(false);

  const selected = project.clips.find(
    (c) => c.id === selectedClipId && typeof c.text === 'string',
  );
  const style: ClipTextStyle = { ...DEFAULT_TEXT_STYLE(), ...(selected?.textStyle ?? {}) };

  const fonts = useMemo(() => filterFonts(query), [query]);
  const combinations = useMemo(
    () => filterCombinations(query, appsExpanded),
    [query, appsExpanded],
  );

  const captionCount = project.clips.filter((c) => typeof c.text === 'string').length;
  const pageLabel = String(captionCount + 1);

  const updateStyle = (partial: Partial<ClipTextStyle>, message?: string) => {
    if (!selected) return;
    patchClip(selected.id, { textStyle: { ...style, ...partial } }, message ?? 'Text style');
  };

  const addPreset = (role: TextPresetRole) => {
    const preset = TEXT_PRESET_STYLES[role];
    addTextClip(TEXT_PRESET_COPY[role], {
      fontFamily: preset.fontFamily,
      fontSize: preset.fontSize,
      fontWeight: preset.fontWeight,
      color: '#f4f7f8',
      align: role === 'textbox' || role === 'body' ? 'left' : 'center',
    });
  };

  const applyCombination = (combo: FontCombination) => {
    if (selected) {
      updateStyle({ fontFamily: combo.displayFont }, `Font ${combo.name}`);
      return;
    }
    addTextClip(combo.name, {
      fontFamily: combo.displayFont,
      fontSize: 40,
      fontWeight: 700,
    });
  };

  const runMagicWrite = () => {
    const copy = magicWriteStub(magicPrompt, magicKind);
    const role: TextPresetRole =
      magicKind === 'headline' ? 'heading' : magicKind === 'cta' ? 'subheading' : 'body';
    const preset = TEXT_PRESET_STYLES[role];
    addTextClip(copy, {
      fontFamily: preset.fontFamily,
      fontSize: preset.fontSize,
      fontWeight: preset.fontWeight,
    });
    setShowMagic(false);
    setMagicPrompt('');
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-600">Text</h2>

      <label className="block">
        <span className="sr-only">Search fonts and combinations</span>
        <input
          type="search"
          className="w-full rounded-lg border border-fog-200 bg-white px-2.5 py-2 text-xs text-ink-800 placeholder:text-ink-500"
          placeholder="Search fonts and combinations"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="w-full rounded-lg bg-teal-700 px-3 py-2.5 text-left text-sm font-semibold text-white hover:bg-teal-800"
          onClick={() => addPreset('textbox')}
        >
          Add a text box
        </button>
        <button
          type="button"
          className="btn-tool flex w-full items-center gap-2 text-left"
          onClick={() => setShowMagic((v) => !v)}
        >
          <span aria-hidden>✧</span>
          Magic Write
        </button>
      </div>

      {showMagic && (
        <div className="space-y-2 rounded-xl border border-fog-200 bg-fog-50 p-3">
          <p className="text-[11px] font-semibold text-ink-800">Magic Write</p>
          <textarea
            className="w-full rounded-lg border border-fog-200 bg-white px-2 py-1.5 text-xs"
            rows={2}
            placeholder="What should the copy be about?"
            value={magicPrompt}
            onChange={(e) => setMagicPrompt(e.target.value)}
          />
          <div className="flex flex-wrap gap-1">
            {(['headline', 'body', 'cta'] as const).map((k) => (
              <button
                key={k}
                type="button"
                className={`btn-tool !px-2 !py-1 text-[11px] capitalize ${
                  magicKind === k ? 'btn-tool-active' : ''
                }`}
                onClick={() => setMagicKind(k)}
              >
                {k}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="w-full rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800"
            onClick={runMagicWrite}
          >
            Generate &amp; add
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <button
          type="button"
          className="rounded-lg px-2 py-2 text-left text-[22px] font-bold leading-tight text-ink-900 hover:bg-fog-100"
          onClick={() => addPreset('heading')}
        >
          Add a heading
        </button>
        <button
          type="button"
          className="rounded-lg px-2 py-1.5 text-left text-[16px] font-semibold text-ink-800 hover:bg-fog-100"
          onClick={() => addPreset('subheading')}
        >
          Add a subheading
        </button>
        <button
          type="button"
          className="rounded-lg px-2 py-1.5 text-left text-[13px] font-normal text-ink-700 hover:bg-fog-100"
          onClick={() => addPreset('body')}
        >
          Add a little bit of body text
        </button>
      </div>

      <section className="space-y-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-600">
          Dynamic text
        </h3>
        <button
          type="button"
          className="btn-tool flex w-full items-center justify-between text-left"
          onClick={() =>
            addTextClip(pageLabel, {
              fontSize: 28,
              fontWeight: 600,
              align: 'center',
            })
          }
        >
          <span>Caption marker</span>
          <span className="text-[11px] text-ink-500">{pageLabel}</span>
        </button>
        <button
          type="button"
          className="btn-tool w-full text-left"
          onClick={() =>
            addTextClip('Hook: Wait for it…', { fontSize: 36, fontWeight: 700 })
          }
        >
          Add hook text
        </button>
        <button
          type="button"
          className="btn-tool w-full text-left"
          onClick={() => addTextClip('Shop now', { fontSize: 28, fontWeight: 600 })}
        >
          Add CTA text
        </button>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-600">
            Apps
          </h3>
          <button
            type="button"
            className="text-[11px] font-medium text-teal-700 hover:underline"
            onClick={() => setAppsExpanded((v) => !v)}
          >
            {appsExpanded ? 'Show less' : 'See all'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {combinations.map((combo) => (
            <button
              key={combo.id}
              type="button"
              className="flex flex-col items-start gap-0.5 rounded-xl border border-fog-200 bg-white p-2.5 text-left hover:border-teal-600/40 hover:bg-fog-50"
              onClick={() => applyCombination(combo)}
            >
              <span
                className="text-sm font-bold text-ink-900"
                style={{ fontFamily: combo.displayFont }}
              >
                {combo.name}
              </span>
              <span className="text-[10px] text-ink-600" style={{ fontFamily: combo.bodyFont }}>
                {combo.displayFont}
              </span>
            </button>
          ))}
        </div>
        {query.trim() && fonts.length > 0 && (
          <div className="space-y-1 border-t border-fog-200 pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-600">Fonts</p>
            {fonts.map((f) => (
              <button
                key={f}
                type="button"
                className="block w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-fog-100"
                style={{ fontFamily: f }}
                onClick={() => {
                  if (selected) updateStyle({ fontFamily: f }, 'Font');
                  else addTextClip('Text', { fontFamily: f, fontSize: 18, fontWeight: 400 });
                }}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </section>

      {selected ? (
        <div className="mt-1 space-y-2 border-t border-fog-200 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-600">
            Style “{selected.name}”
          </p>
          <label className="block text-[11px] text-ink-700">
            Content
            <input
              className="mt-1 w-full rounded-lg border border-fog-200 px-2 py-1.5 text-xs"
              value={selected.text ?? ''}
              onChange={(e) =>
                patchClip(
                  selected.id,
                  { text: e.target.value, name: e.target.value.slice(0, 24) || 'Text' },
                  'Text edited',
                )
              }
            />
          </label>
          <label className="block text-[11px] text-ink-700">
            Font
            <select
              className="mt-1 w-full rounded-lg border border-fog-200 px-2 py-1.5 text-xs"
              value={style.fontFamily}
              onChange={(e) => updateStyle({ fontFamily: e.target.value }, 'Font')}
            >
              {[...new Set([...FONT_FAMILIES, ...fonts])].map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[11px] text-ink-700">
            Size {style.fontSize}px
            <input
              type="range"
              className="mt-1 w-full accent-teal-700"
              min={12}
              max={120}
              value={style.fontSize}
              onChange={(e) => {
                const fontSize = Number(e.target.value);
                useVideoEditorStore.setState((s) => ({
                  project: {
                    ...s.project,
                    clips: s.project.clips.map((c) =>
                      c.id === selected.id
                        ? { ...c, textStyle: { ...style, fontSize } }
                        : c,
                    ),
                  },
                }));
              }}
              onMouseUp={() => {
                const c = useVideoEditorStore
                  .getState()
                  .project.clips.find((x) => x.id === selected.id);
                if (c?.textStyle) patchClip(selected.id, { textStyle: c.textStyle }, 'Font size');
              }}
            />
          </label>
          <label className="block text-[11px] text-ink-700">
            Color
            <input
              type="color"
              className="mt-1 h-8 w-full cursor-pointer rounded border border-fog-200"
              value={style.color}
              onChange={(e) => updateStyle({ color: e.target.value }, 'Color')}
            />
          </label>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              className={`btn-tool !px-2 !py-1 text-[11px] ${
                Number(style.fontWeight) >= 700 ? 'btn-tool-active' : ''
              }`}
              onClick={() =>
                updateStyle({ fontWeight: Number(style.fontWeight) >= 700 ? 400 : 700 }, 'Bold')
              }
            >
              Bold
            </button>
            <button
              type="button"
              className={`btn-tool !px-2 !py-1 text-[11px] ${
                style.fontStyle === 'italic' ? 'btn-tool-active' : ''
              }`}
              onClick={() =>
                updateStyle(
                  { fontStyle: style.fontStyle === 'italic' ? 'normal' : 'italic' },
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
                  style.align === a ? 'btn-tool-active' : ''
                }`}
                onClick={() => updateStyle({ align: a }, `Align ${a}`)}
              >
                {a}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-ink-500">
            Drag text on the preview to move it. Open Effects for more options.
          </p>
          <button
            type="button"
            className="btn-tool w-full text-[11px]"
            onClick={() => setActivePanel('effects')}
          >
            Open full inspector →
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-ink-600">
          Add text, then select it on the timeline to style color, size, and font. Drag on the
          preview to reposition.
        </p>
      )}
    </div>
  );
}
