/**
 * Multi-page artboard strip — thumbnails, add / duplicate / delete page, reorder.
 * Each page owns its own layers (independent designs).
 */
'use client';

import { useImageEditorStore } from '@/store/imageEditorStore';
import { layersForArtboard, primaryArtboardId } from '@/lib/pageLayers';

export function ArtboardStrip() {
  const doc = useImageEditorStore((s) => s.history.present);
  const activeArtboardId = useImageEditorStore((s) => s.activeArtboardId);
  const setActiveArtboard = useImageEditorStore((s) => s.setActiveArtboard);
  const addArtboard = useImageEditorStore((s) => s.addArtboard);
  const duplicateActivePage = useImageEditorStore((s) => s.duplicateActivePage);
  const deleteActivePage = useImageEditorStore((s) => s.deleteActivePage);
  const reorderArtboard = useImageEditorStore((s) => s.reorderArtboard);

  const active = doc.artboards.find((a) => a.id === activeArtboardId) ?? doc.artboards[0];
  const fallback = primaryArtboardId(doc);

  return (
    <div className="flex items-center gap-2 border-t border-fog-200 bg-[var(--sn-editor-panel)]/95 px-3 py-2 backdrop-blur">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-ink-700">
        Pages
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
        {doc.artboards.map((ab, i) => {
          const isActive = ab.id === (activeArtboardId ?? doc.artboards[0]?.id);
          const thumbH = 36;
          const thumbW = Math.max(28, Math.round((thumbH * ab.width) / ab.height));
          const count = layersForArtboard(doc.layers, ab.id, fallback).length;
          return (
            <div key={ab.id} className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                title={`${ab.name} · ${ab.width}×${ab.height} · ${count} layers`}
                className={`flex flex-col items-center gap-0.5 rounded-lg border px-1.5 py-1 transition ${
                  isActive
                    ? 'border-teal-700 bg-[var(--sn-editor-accent-muted)]'
                    : 'border-fog-200 bg-fog-50 hover:border-fog-200'
                }`}
                onClick={() => setActiveArtboard(ab.id, true)}
              >
                <div
                  className="rounded border border-black/5 shadow-sm"
                  style={{
                    width: thumbW,
                    height: thumbH,
                    background: ab.background || '#ffffff',
                  }}
                />
                <span className="max-w-[4.5rem] truncate text-[9px] font-semibold text-ink-800">
                  {i + 1}. {ab.name}
                </span>
                <span className="text-[8px] text-ink-500">
                  {count === 0 ? 'Empty' : `${count} layer${count === 1 ? '' : 's'}`}
                </span>
              </button>
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  className="rounded px-1 text-[10px] text-ink-500 hover:bg-fog-100 disabled:opacity-30"
                  disabled={i === 0}
                  title="Move left"
                  onClick={() => reorderArtboard(ab.id, 'left')}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="rounded px-1 text-[10px] text-ink-500 hover:bg-fog-100 disabled:opacity-30"
                  disabled={i === doc.artboards.length - 1}
                  title="Move right"
                  onClick={() => reorderArtboard(ab.id, 'right')}
                >
                  ›
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="btn-tool btn-tool-active shrink-0"
        title="Add a blank page (independent design)"
        onClick={() => addArtboard(active?.width ?? 1080, active?.height ?? 1080)}
      >
        + Page
      </button>
      <button
        type="button"
        className="btn-tool shrink-0"
        title="Duplicate active page with its layers"
        onClick={() => duplicateActivePage()}
      >
        Duplicate
      </button>
      <button
        type="button"
        className="btn-tool shrink-0"
        title="Delete active page"
        disabled={doc.artboards.length <= 1}
        onClick={() => {
          if (window.confirm('Delete this page and its layers?')) deleteActivePage();
        }}
      >
        Delete
      </button>
    </div>
  );
}
