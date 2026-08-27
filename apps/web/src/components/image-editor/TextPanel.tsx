/**
 * Canva-style Text panel: search, presets, Magic Write, dynamic text, font apps.
 */
'use client';

import { useMemo, useState } from 'react';
import {
  addLayer,
  createBodyLayer,
  createHeadingLayer,
  createSubheadingLayer,
  findLayer,
} from '@sn-editor/editor-core';
import { useImageEditorStore } from '@/store/imageEditorStore';
import {
  filterCombinations,
  filterFonts,
  magicWriteStub,
  TEXT_FONTS,
  type FontCombination,
} from '@/lib/textPresets';
import { stampLayerPage } from '@/lib/pageLayers';

export function TextPanel() {
  const doc = useImageEditorStore((s) => s.history.present);
  const selectedIds = useImageEditorStore((s) => s.selectedIds);
  const activeArtboardId = useImageEditorStore((s) => s.activeArtboardId);
  const addText = useImageEditorStore((s) => s.addText);
  const updateTextStyle = useImageEditorStore((s) => s.updateTextStyle);
  const updateTextContent = useImageEditorStore((s) => s.updateTextContent);
  const setFill = useImageEditorStore((s) => s.setFill);
  const commit = useImageEditorStore((s) => s.commit);
  const setSelectedIds = useImageEditorStore((s) => s.setSelectedIds);

  const [query, setQuery] = useState('');
  const [showMagic, setShowMagic] = useState(false);
  const [magicPrompt, setMagicPrompt] = useState('');
  const [magicKind, setMagicKind] = useState<'headline' | 'body' | 'cta'>('headline');
  const [appsExpanded, setAppsExpanded] = useState(false);

  const selected = selectedIds[0] ? findLayer(doc.layers, selectedIds[0]) : undefined;
  const isText = selected && (selected.type === 'text' || selected.type === 'cta');
  const isShape = selected && selected.type === 'shape';
  const style = selected?.textStyle;
  const effects = style?.effects ?? {};

  const fonts = useMemo(() => filterFonts(query), [query]);
  const fontOptions = useMemo(() => (query.trim() ? fonts : [...TEXT_FONTS]), [query, fonts]);
  const combinations = useMemo(
    () => filterCombinations(query, appsExpanded),
    [query, appsExpanded],
  );

  const pageIndex = Math.max(
    0,
    doc.artboards.findIndex((ab) => ab.id === (activeArtboardId ?? doc.artboards[0]?.id)),
  );
  const pageLabel = String(pageIndex + 1);

  const pageId = activeArtboardId ?? doc.artboards[0]?.id;

  const addPageNumber = () => {
    const layer = stampLayerPage(createBodyLayer(pageLabel), pageId);
    layer.name = 'Page number';
    layer.textStyle = {
      ...layer.textStyle!,
      fontSize: 24,
      fontWeight: 600,
      align: 'center',
      role: 'body',
    };
    commit(addLayer(doc, layer));
    setSelectedIds([layer.id]);
  };

  const applyCombination = (combo: FontCombination) => {
    if (isText && selected) {
      updateTextStyle(selected.id, { fontFamily: combo.displayFont });
      return;
    }
    const h = stampLayerPage(createHeadingLayer(combo.name), pageId);
    h.textStyle = { ...h.textStyle!, fontFamily: combo.displayFont };
    const b = stampLayerPage(createBodyLayer('Pair with this body style'), pageId);
    b.textStyle = { ...b.textStyle!, fontFamily: combo.bodyFont };
    b.transform = { ...b.transform, y: h.transform.y + 90 };
    let next = addLayer(doc, h);
    next = addLayer(next, b);
    commit(next);
    setSelectedIds([h.id]);
  };

  const runMagicWrite = () => {
    const copy = magicWriteStub(magicPrompt, magicKind);
    const raw =
      magicKind === 'headline'
        ? createHeadingLayer(copy)
        : magicKind === 'cta'
          ? createSubheadingLayer(copy)
          : createBodyLayer(copy);
    const layer = stampLayerPage(raw, pageId);
    commit(addLayer(doc, layer));
    setSelectedIds([layer.id]);
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
          onClick={() => addText('textbox')}
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
          onClick={() => addText('heading')}
        >
          Add a heading
        </button>
        <button
          type="button"
          className="rounded-lg px-2 py-1.5 text-left text-[16px] font-semibold text-ink-800 hover:bg-fog-100"
          onClick={() => addText('subheading')}
        >
          Add a subheading
        </button>
        <button
          type="button"
          className="rounded-lg px-2 py-1.5 text-left text-[13px] font-normal text-ink-700 hover:bg-fog-100"
          onClick={() => addText('body')}
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
          onClick={addPageNumber}
        >
          <span>Page numbers</span>
          <span className="text-[11px] text-ink-500">{pageLabel}</span>
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
                {combo.displayFont} + {combo.bodyFont}
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
                  if (isText && selected) updateTextStyle(selected.id, { fontFamily: f });
                  else addText('textbox');
                }}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </section>

      {isText && selected ? (
        <div className="space-y-3 rounded-xl border border-fog-200 bg-fog-50 p-3">
          <p className="text-xs font-semibold text-ink-800">Editing: {selected.name}</p>

          <label className="block text-[11px] text-ink-600">
            Content
            <textarea
              className="mt-1 w-full rounded-lg border border-fog-200 bg-white px-2 py-1.5 text-xs"
              rows={3}
              value={selected.text ?? ''}
              onChange={(e) => updateTextContent(selected.id, e.target.value)}
            />
          </label>

          <label className="block text-[11px] text-ink-600">
            Font
            <select
              className="mt-1 w-full rounded-lg border border-fog-200 bg-white px-2 py-1.5 text-xs"
              value={style?.fontFamily ?? 'Source Sans 3'}
              onChange={(e) => updateTextStyle(selected.id, { fontFamily: e.target.value })}
            >
              {fontOptions.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>
                  {f}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[11px] text-ink-600">
            Size {style?.fontSize ?? 24}px
            <input
              type="range"
              min={10}
              max={120}
              className="mt-1 w-full"
              value={style?.fontSize ?? 24}
              onChange={(e) => updateTextStyle(selected.id, { fontSize: Number(e.target.value) })}
            />
          </label>

          <label className="block text-[11px] text-ink-600">
            Role
            <select
              className="mt-1 w-full rounded-lg border border-fog-200 bg-white px-2 py-1.5 text-xs"
              value={style?.role ?? 'body'}
              onChange={(e) =>
                updateTextStyle(selected.id, {
                  role: e.target.value as 'heading' | 'subheading' | 'body',
                  fontSize:
                    e.target.value === 'heading' ? 48 : e.target.value === 'subheading' ? 28 : 18,
                  fontWeight: e.target.value === 'heading' ? 700 : 500,
                })
              }
            >
              <option value="heading">Heading</option>
              <option value="subheading">Subheading</option>
              <option value="body">Body</option>
            </select>
          </label>

          <label className="block text-[11px] text-ink-600">
            Color
            <input
              type="color"
              className="mt-1 h-8 w-full cursor-pointer rounded border border-fog-200"
              value={style?.fill ?? '#0a1214'}
              onChange={(e) => updateTextStyle(selected.id, { fill: e.target.value })}
            />
          </label>

          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              className={`btn-tool !px-2.5 !py-1 font-bold ${
                Number(style?.fontWeight) >= 700 ? 'btn-tool-active' : ''
              }`}
              title="Bold"
              onClick={() =>
                updateTextStyle(selected.id, {
                  fontWeight: Number(style?.fontWeight) >= 700 ? 400 : 700,
                })
              }
            >
              B
            </button>
            <button
              type="button"
              className={`btn-tool !px-2.5 !py-1 italic ${
                style?.fontStyle === 'italic' ? 'btn-tool-active' : ''
              }`}
              title="Italic"
              onClick={() =>
                updateTextStyle(selected.id, {
                  fontStyle: style?.fontStyle === 'italic' ? 'normal' : 'italic',
                })
              }
            >
              I
            </button>
            <button
              type="button"
              className={`btn-tool !px-2.5 !py-1 underline ${
                style?.underline ? 'btn-tool-active' : ''
              }`}
              title="Underline"
              onClick={() =>
                updateTextStyle(selected.id, { underline: !style?.underline })
              }
            >
              U
            </button>
          </div>

          <div className="flex flex-wrap gap-1">
            {(['left', 'center', 'right', 'justify'] as const).map((align) => (
              <button
                key={align}
                type="button"
                className={`btn-tool !px-2 !py-1 text-[11px] capitalize ${
                  (style?.align ?? 'left') === align ? 'btn-tool-active' : ''
                }`}
                title={`Align ${align}`}
                onClick={() => updateTextStyle(selected.id, { align })}
              >
                {align === 'left' ? '⟸' : align === 'center' ? '⇔' : align === 'right' ? '⟹' : '☰'}
              </button>
            ))}
          </div>

          <label className="block text-[11px] text-ink-600">
            Letter spacing {style?.letterSpacing ?? 0}
            <input
              type="range"
              min={-5}
              max={40}
              className="mt-1 w-full"
              value={style?.letterSpacing ?? 0}
              onChange={(e) =>
                updateTextStyle(selected.id, { letterSpacing: Number(e.target.value) })
              }
            />
          </label>

          <label className="block text-[11px] text-ink-600">
            Line height {(style?.lineHeight ?? 1.3).toFixed(2)}
            <input
              type="range"
              min={0.8}
              max={2.5}
              step={0.05}
              className="mt-1 w-full"
              value={style?.lineHeight ?? 1.3}
              onChange={(e) =>
                updateTextStyle(selected.id, { lineHeight: Number(e.target.value) })
              }
            />
          </label>

          <label className="block text-[11px] text-ink-600">
            Text case
            <select
              className="mt-1 w-full rounded-lg border border-fog-200 bg-white px-2 py-1.5 text-xs"
              value={style?.textCase ?? 'none'}
              onChange={(e) =>
                updateTextStyle(selected.id, {
                  textCase: e.target.value as 'none' | 'uppercase' | 'lowercase' | 'capitalize',
                })
              }
            >
              <option value="none">None</option>
              <option value="uppercase">Uppercase</option>
              <option value="lowercase">Lowercase</option>
              <option value="capitalize">Capitalize</option>
            </select>
          </label>

          <fieldset className="space-y-2 rounded-lg border border-fog-200 p-2">
            <legend className="px-1 text-[11px] font-semibold text-ink-700">Outline</legend>
            <label className="flex items-center gap-2 text-[11px]">
              <input
                type="checkbox"
                checked={Boolean(effects.outline)}
                onChange={(e) =>
                  updateTextStyle(
                    selected.id,
                    {},
                    e.target.checked
                      ? { outline: { color: '#0a1214', width: 2 } }
                      : { outline: undefined },
                  )
                }
              />
              Enable outline
            </label>
            {effects.outline && (
              <div className="flex gap-2">
                <input
                  type="color"
                  value={effects.outline.color}
                  onChange={(e) =>
                    updateTextStyle(selected.id, {}, {
                      outline: { ...effects.outline!, color: e.target.value },
                    })
                  }
                />
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={effects.outline.width}
                  onChange={(e) =>
                    updateTextStyle(selected.id, {}, {
                      outline: { ...effects.outline!, width: Number(e.target.value) },
                    })
                  }
                />
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-2 rounded-lg border border-fog-200 p-2">
            <legend className="px-1 text-[11px] font-semibold text-ink-700">Shadow</legend>
            <label className="flex items-center gap-2 text-[11px]">
              <input
                type="checkbox"
                checked={Boolean(effects.shadow)}
                onChange={(e) =>
                  updateTextStyle(
                    selected.id,
                    {},
                    e.target.checked
                      ? { shadow: { color: 'rgba(0,0,0,0.35)', blur: 8, offsetX: 2, offsetY: 4 } }
                      : { shadow: undefined },
                  )
                }
              />
              Enable shadow
            </label>
            {effects.shadow && (
              <label className="block text-[11px] text-ink-600">
                Blur
                <input
                  type="range"
                  min={0}
                  max={40}
                  className="w-full"
                  value={effects.shadow.blur}
                  onChange={(e) =>
                    updateTextStyle(selected.id, {}, {
                      shadow: { ...effects.shadow!, blur: Number(e.target.value) },
                    })
                  }
                />
              </label>
            )}
          </fieldset>

          <label className="block text-[11px] text-ink-600">
            Circular path {effects.curve ?? 0}
            <input
              type="range"
              min={-50}
              max={50}
              className="w-full"
              value={effects.curve ?? 0}
              onChange={(e) =>
                updateTextStyle(selected.id, {}, { curve: Number(e.target.value) })
              }
            />
            <span className="mt-0.5 block text-[10px] text-ink-500">
              Characters follow an arc (0 = flat)
            </span>
          </label>

          <div className="flex flex-wrap gap-1">
            <span className="w-full text-[11px] text-ink-600">List</span>
            {(
              [
                ['none', 'None'],
                ['bullet', '• Bullet'],
                ['number', '1. Number'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`btn-tool !px-2 !py-1 text-[11px] ${
                  (style?.listStyle ?? 'none') === value ? 'btn-tool-active' : ''
                }`}
                onClick={() => updateTextStyle(selected.id, { listStyle: value })}
              >
                {label}
              </button>
            ))}
          </div>

          <fieldset className="space-y-2 rounded-lg border border-fog-200 p-2">
            <legend className="px-1 text-[11px] font-semibold text-ink-700">Gradient</legend>
            <label className="flex items-center gap-2 text-[11px]">
              <input
                type="checkbox"
                checked={Boolean(effects.gradient)}
                onChange={(e) =>
                  updateTextStyle(
                    selected.id,
                    {},
                    e.target.checked
                      ? { gradient: { from: '#0f766e', to: '#0a1214', angle: 90 } }
                      : { gradient: undefined },
                  )
                }
              />
              Enable gradient fill
            </label>
            {effects.gradient && (
              <div className="flex gap-2">
                <input
                  type="color"
                  value={effects.gradient.from}
                  onChange={(e) =>
                    updateTextStyle(selected.id, {}, {
                      gradient: { ...effects.gradient!, from: e.target.value },
                    })
                  }
                />
                <input
                  type="color"
                  value={effects.gradient.to}
                  onChange={(e) =>
                    updateTextStyle(selected.id, {}, {
                      gradient: { ...effects.gradient!, to: e.target.value },
                    })
                  }
                />
              </div>
            )}
          </fieldset>

          <label className="flex items-center gap-2 text-[11px] text-ink-700">
            <input
              type="checkbox"
              checked={Boolean(effects.autoResize)}
              onChange={(e) =>
                updateTextStyle(selected.id, {}, { autoResize: e.target.checked })
              }
            />
            Auto-resize text box
          </label>
        </div>
      ) : isShape && selected ? (
        <div className="space-y-3 rounded-xl border border-fog-200 bg-fog-50 p-3">
          <p className="text-xs font-semibold text-ink-800">Shape color</p>
          <label className="block text-[11px] text-ink-600">
            Fill
            <input
              type="color"
              className="mt-1 h-8 w-full cursor-pointer rounded border border-fog-200"
              value={selected.fill ?? '#0f766e'}
              onChange={(e) => setFill(selected.id, e.target.value)}
            />
          </label>
        </div>
      ) : (
        <p className="text-xs text-ink-600/70">
          Select a text layer to edit content, font, size, and color — or a shape for fill color.
        </p>
      )}
    </div>
  );
}
