/**
 * Editor tool strip — grouped actions with clear visual hierarchy.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useImageEditorStore } from '@/store/imageEditorStore';
import { fileToLocalUpload, persistAssetToApi, pickFiles } from '@/lib/mediaUpload';
import { addLayer, createLayer, findLayer, type LayerNode } from '@sn-editor/editor-core';
import { stampLayerPage } from '@/lib/pageLayers';
import { PageColorControl } from './PageColorControl';

const RESIZE_PRESETS = [
  { label: '1:1', w: 1080, h: 1080 },
  { label: 'Story', w: 1080, h: 1920 },
  { label: 'Landscape', w: 1920, h: 1080 },
] as const;

const SHAPE_COLOR_PRESETS = [
  '#0f766e',
  '#8b3dff',
  '#db2777',
  '#f59e0b',
  '#0891b2',
  '#ef4444',
  '#111827',
  '#ffffff',
  '#7c3aed',
  '#10b981',
];

function hexOf(value: string | undefined, fallback: string) {
  if (value?.startsWith('#')) return value.slice(0, 7);
  return fallback;
}

function ShapeColorControl({
  selected,
  onChange,
}: {
  selected: LayerNode;
  onChange: (hex: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const value = hexOf(
    selected.type === 'text' || selected.type === 'cta'
      ? selected.textStyle?.fill
      : selected.fill ?? selected.stroke,
    selected.type === 'text' || selected.type === 'cta' ? '#0a1214' : '#0f766e',
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({
        top: rect.bottom + 8,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - 240)),
      });
    }
    setOpen((v) => !v);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={open ? 'tb-btn tb-btn-on tb-color-btn' : 'tb-btn tb-color-btn'}
        title="Change shape / fill color"
        onClick={toggle}
      >
        Color
        <span className="tb-page-swatch" style={{ background: value }} />
      </button>
      {open &&
        createPortal(
          <div
            ref={popRef}
            className="tb-popover tb-page-popover"
            style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 200 }}
          >
            <p className="tb-popover-label">Shape color</p>
            <div className="tb-page-presets">
              {SHAPE_COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`tb-page-preset${value.toLowerCase() === c ? ' on' : ''}`}
                  style={{ background: c }}
                  title={c}
                  onClick={() => onChange(c)}
                />
              ))}
            </div>
            <label className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-ink-600">
              Custom
              <input
                type="color"
                className="h-8 w-full cursor-pointer rounded border border-fog-200"
                value={value}
                onChange={(e) => onChange(e.target.value)}
              />
            </label>
          </div>,
          document.body,
        )}
    </>
  );
}

export function Toolbar() {
  const undo = useImageEditorStore((s) => s.undo);
  const redo = useImageEditorStore((s) => s.redo);
  const canUndo = useImageEditorStore((s) => s.history.past.length > 0);
  const canRedo = useImageEditorStore((s) => s.history.future.length > 0);
  const viewport = useImageEditorStore((s) => s.viewport);
  const setViewport = useImageEditorStore((s) => s.setViewport);
  const snapEnabled = useImageEditorStore((s) => s.snapEnabled);
  const setSnapEnabled = useImageEditorStore((s) => s.setSnapEnabled);
  const gridVisible = useImageEditorStore((s) => s.gridVisible);
  const setGridVisible = useImageEditorStore((s) => s.setGridVisible);
  const rulersVisible = useImageEditorStore((s) => s.rulersVisible);
  const setRulersVisible = useImageEditorStore((s) => s.setRulersVisible);
  const addShape = useImageEditorStore((s) => s.addShape);
  const addText = useImageEditorStore((s) => s.addText);
  const addArtboard = useImageEditorStore((s) => s.addArtboard);
  const alignSelected = useImageEditorStore((s) => s.alignSelected);
  const distributeSelected = useImageEditorStore((s) => s.distributeSelected);
  const magicResize = useImageEditorStore((s) => s.magicResize);
  const setFill = useImageEditorStore((s) => s.setFill);
  const updateTextStyle = useImageEditorStore((s) => s.updateTextStyle);
  const setLeftTab = useImageEditorStore((s) => s.setLeftTab);
  const selectedIds = useImageEditorStore((s) => s.selectedIds);
  const doc = useImageEditorStore((s) => s.history.present);
  const activeArtboardId = useImageEditorStore((s) => s.activeArtboardId);
  const commit = useImageEditorStore((s) => s.commit);
  const document = useImageEditorStore((s) => s.document);
  const setSelectedIds = useImageEditorStore((s) => s.setSelectedIds);

  const [showResize, setShowResize] = useState(false);
  const activeAb =
    doc.artboards.find((a) => a.id === activeArtboardId) ?? doc.artboards[0];
  const [rw, setRw] = useState(activeAb?.width ?? 1080);
  const [rh, setRh] = useState(activeAb?.height ?? 1080);

  const zoomPct = Math.round(viewport.scale * 100);
  const selected = selectedIds[0] ? findLayer(doc.layers, selectedIds[0]) : undefined;

  const onColorChange = (hex: string) => {
    if (!selected) return;
    if (selected.type === 'text' || selected.type === 'cta') {
      updateTextStyle(selected.id, { fill: hex });
      return;
    }
    setFill(selected.id, hex);
  };

  const uploadImage = async () => {
    const files = await pickFiles({
      accept: 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml',
      multiple: false,
    });
    const file = files[0];
    if (!file) return;
    const upload = await fileToLocalUpload(file, 'image');
    await persistAssetToApi(upload);
    const d = document();
    const ab = d.artboards.find((a) => a.id === activeArtboardId) ?? d.artboards[0];
    const w = Math.min(upload.width ?? 400, ab?.width ? ab.width - 80 : 400);
    const h = Math.min(upload.height ?? 300, ab?.height ? ab.height - 80 : 300);
    const layer = stampLayerPage(
      createLayer({
        type: 'image',
        name: upload.name,
        src: upload.url,
        transform: {
          x: 40,
          y: 40,
          width: w,
          height: h,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        },
      }),
      ab?.id,
    );
    commit(addLayer(d, layer));
    setSelectedIds([layer.id]);
  };

  const applyMagicResize = (w: number, h: number) => {
    magicResize(w, h);
    setRw(w);
    setRh(h);
    setShowResize(false);
  };

  return (
    <div className="tb-strip">
      <div className="tb-group" role="group" aria-label="History">
        <button type="button" className="tb-icon" disabled={!canUndo} onClick={undo} title="Undo (Ctrl+Z)">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 14H4v-5M4.5 13.5A8 8 0 1 1 7 18.5"
            />
          </svg>
        </button>
        <button type="button" className="tb-icon" disabled={!canRedo} onClick={redo} title="Redo (Ctrl+Y)">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 14h5v-5M19.5 13.5A8 8 0 1 0 17 18.5"
            />
          </svg>
        </button>
      </div>

      <div className="tb-group" role="group" aria-label="Zoom">
        <button
          type="button"
          className="tb-icon"
          title="Zoom out"
          onClick={() =>
            setViewport({
              ...viewport,
              scale: Math.max(0.05, viewport.scale / 1.15),
            })
          }
        >
          −
        </button>
        <span className="tb-zoom">{zoomPct}%</span>
        <button
          type="button"
          className="tb-icon"
          title="Zoom in"
          onClick={() =>
            setViewport({
              ...viewport,
              scale: Math.min(8, viewport.scale * 1.15),
            })
          }
        >
          +
        </button>
      </div>

      <div className="tb-group" role="group" aria-label="Insert">
        <button type="button" className="tb-btn" onClick={() => addShape('rect')} title="Rectangle">
          Shape
        </button>
        <button type="button" className="tb-btn" onClick={() => addShape('ellipse')} title="Ellipse">
          Ellipse
        </button>
        <button
          type="button"
          className="tb-btn"
          title="Add text"
          onClick={() => {
            addText('heading');
            setLeftTab('text');
          }}
        >
          Text
        </button>
        <button type="button" className="tb-btn tb-btn-primary" onClick={uploadImage} title="Upload image">
          Upload
        </button>
        <button type="button" className="tb-btn" onClick={() => setLeftTab('assets')} title="Uploads library">
          Library
        </button>
        <button
          type="button"
          className="tb-btn"
          title="Add artboard"
          onClick={() => addArtboard()}
        >
          Artboard
        </button>
      </div>

      <div className="tb-group relative" role="group" aria-label="Resize">
        <button
          type="button"
          className={showResize ? 'tb-btn tb-btn-on' : 'tb-btn'}
          title="Magic Resize"
          onClick={() => {
            setRw(activeAb?.width ?? 1080);
            setRh(activeAb?.height ?? 1080);
            setShowResize((v) => !v);
          }}
        >
          Resize
        </button>
        {showResize && (
          <div className="tb-popover">
            <p className="tb-popover-label">Magic Resize</p>
            <div className="mb-2 flex flex-wrap gap-1">
              {RESIZE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="tb-btn"
                  onClick={() => applyMagicResize(p.w, p.h)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                className="tb-input"
                value={rw}
                min={32}
                onChange={(e) => setRw(Number(e.target.value) || 32)}
              />
              <span className="text-xs text-ink-500">×</span>
              <input
                type="number"
                className="tb-input"
                value={rh}
                min={32}
                onChange={(e) => setRh(Number(e.target.value) || 32)}
              />
              <button
                type="button"
                className="tb-btn tb-btn-primary"
                onClick={() => applyMagicResize(rw, rh)}
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="tb-group" role="group" aria-label="Page color">
        <PageColorControl />
      </div>

      <div className="tb-group" role="group" aria-label="View aids">
        <button
          type="button"
          className={snapEnabled ? 'tb-btn tb-btn-on' : 'tb-btn'}
          onClick={() => setSnapEnabled(!snapEnabled)}
          title="Smart snap"
        >
          Snap
        </button>
        <button
          type="button"
          className={gridVisible ? 'tb-btn tb-btn-on' : 'tb-btn'}
          onClick={() => setGridVisible(!gridVisible)}
          title="Grid"
        >
          Grid
        </button>
        <button
          type="button"
          className={rulersVisible ? 'tb-btn tb-btn-on' : 'tb-btn'}
          onClick={() => setRulersVisible(!rulersVisible)}
          title="Rulers"
        >
          Rulers
        </button>
      </div>

      <div className="tb-group" role="group" aria-label="Align">
        {(
          [
            ['left', '⟸', 'Align left'],
            ['center', '⇔', 'Align center'],
            ['right', '⟹', 'Align right'],
            ['top', '⇑', 'Align top'],
            ['middle', '⇕', 'Align middle'],
            ['bottom', '⇓', 'Align bottom'],
          ] as const
        ).map(([mode, icon, title]) => (
          <button
            key={mode}
            type="button"
            className="tb-icon"
            disabled={!selectedIds.length}
            title={title}
            onClick={() => alignSelected(mode)}
          >
            {icon}
          </button>
        ))}
        <button
          type="button"
          className="tb-icon"
          disabled={selectedIds.length < 3}
          title="Distribute horizontally"
          onClick={() => distributeSelected('horizontal')}
        >
          ⇄
        </button>
        <button
          type="button"
          className="tb-icon"
          disabled={selectedIds.length < 3}
          title="Distribute vertically"
          onClick={() => distributeSelected('vertical')}
        >
          ⇅
        </button>
      </div>

      {selected &&
        (selected.type === 'shape' || selected.type === 'text' || selected.type === 'cta') && (
          <div className="tb-group" role="group" aria-label="Color">
            <ShapeColorControl selected={selected} onChange={onColorChange} />
          </div>
        )}
    </div>
  );
}
