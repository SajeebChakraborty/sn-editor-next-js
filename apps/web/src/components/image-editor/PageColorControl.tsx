/**
 * Canva-style page / artboard / canvas background color.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useImageEditorStore } from '@/store/imageEditorStore';

const PAGE_PRESETS = [
  '#ffffff',
  '#f8fafc',
  '#f5e6d3',
  '#fef3c7',
  '#dbeafe',
  '#ede9fe',
  '#fce7f3',
  '#dcfce7',
  '#111827',
  '#0f172a',
  '#7c3aed',
  '#0f766e',
] as const;

function toPickerValue(color: string): string {
  if (color === 'transparent' || color === 'none') return '#ffffff';
  if (color.startsWith('#') && color.length >= 7) return color.slice(0, 7);
  return '#ffffff';
}

function usePageColor() {
  const doc = useImageEditorStore((s) => s.history.present);
  const activeArtboardId = useImageEditorStore((s) => s.activeArtboardId);
  const updateArtboard = useImageEditorStore((s) => s.updateArtboard);
  const artboard =
    doc.artboards.find((a) => a.id === activeArtboardId) ?? doc.artboards[0];
  const pageColor = artboard?.background ?? '#ffffff';
  const isTransparent = pageColor === 'transparent' || pageColor === 'none';

  const setPageColor = (color: string) => {
    if (!artboard) return;
    updateArtboard(artboard.id, { background: color });
  };

  return { artboard, pageColor, isTransparent, setPageColor };
}

/** Full picker — used in the left sidebar so it is always visible. */
export function PageColorPicker({ title = 'Canvas color' }: { title?: string }) {
  const { artboard, pageColor, isTransparent, setPageColor } = usePageColor();
  if (!artboard) return null;

  return (
    <div className="page-color-panel">
      <p className="page-color-title">{title}</p>
      <p className="page-color-hint">
        Changes the page background ({artboard.name}). Click a swatch or pick a custom color.
      </p>
      <div className="tb-page-presets">
        {PAGE_PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            className={`tb-page-preset${pageColor.toLowerCase().startsWith(c) ? ' on' : ''}`}
            style={{ background: c }}
            title={c}
            onClick={() => setPageColor(c)}
          />
        ))}
        <button
          type="button"
          className={`tb-page-preset tb-page-transparent${isTransparent ? ' on' : ''}`}
          title="Transparent"
          onClick={() => setPageColor('transparent')}
        />
      </div>
      <label className="tb-page-custom">
        Custom color
        <input
          type="color"
          value={toPickerValue(pageColor)}
          onChange={(e) => setPageColor(e.target.value)}
        />
      </label>
    </div>
  );
}

/** Compact toolbar button with a portal popover (not clipped by the tool strip). */
export function PageColorControl() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const { artboard, pageColor, isTransparent, setPageColor } = usePageColor();

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

  if (!artboard) return null;

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
        className={open ? 'tb-btn tb-btn-on' : 'tb-btn'}
        title="Change canvas / page color"
        onClick={toggle}
      >
        Page color
        <span
          className="tb-page-swatch"
          style={
            isTransparent
              ? undefined
              : { background: pageColor.startsWith('#') ? pageColor.slice(0, 7) : pageColor }
          }
          data-transparent={isTransparent ? '1' : undefined}
        />
      </button>
      {open &&
        createPortal(
          <div
            ref={popRef}
            className="tb-popover tb-page-popover"
            style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 80 }}
          >
            <PageColorPicker title="Page / canvas color" />
          </div>,
          document.body,
        )}
    </>
  );
}
