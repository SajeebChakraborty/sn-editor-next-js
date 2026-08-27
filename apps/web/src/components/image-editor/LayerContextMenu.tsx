/**
 * Right-click menu for canvas objects (images + other layers).
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { findLayer } from '@sn-editor/editor-core';
import { ImageAiTool } from '@sn-editor/ai-contracts';
import { applyImageAiEffect, applyReplaceBackgroundToLayer } from '@/lib/clientAiEffects';
import { REPLACE_BG_SCENES } from '@/lib/imageLayerEffects';
import { layersForArtboard, primaryArtboardId } from '@/lib/pageLayers';
import { formatElapsed } from '@/lib/processProgress';
import { useImageEditorStore } from '@/store/imageEditorStore';
import { useLayerAiProgressStore } from '@/store/layerAiProgressStore';

export type LayerContextMenuState = {
  x: number;
  y: number;
  layerId: string;
};

const ALIGN: { id: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'; label: string }[] = [
  { id: 'left', label: 'Align left' },
  { id: 'center', label: 'Align center' },
  { id: 'right', label: 'Align right' },
  { id: 'top', label: 'Align top' },
  { id: 'middle', label: 'Align middle' },
  { id: 'bottom', label: 'Align bottom' },
];

export function LayerContextMenu({
  menu,
  onClose,
}: {
  menu: LayerContextMenuState;
  onClose: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [jobStart, setJobStart] = useState<number | null>(null);
  const [bgOpen, setBgOpen] = useState(false);
  const [alignOpen, setAlignOpen] = useState(false);

  const doc = useImageEditorStore((s) => s.history.present);
  const clipboard = useImageEditorStore((s) => s.clipboard);
  const copySelected = useImageEditorStore((s) => s.copySelected);
  const pasteClipboard = useImageEditorStore((s) => s.pasteClipboard);
  const duplicateSelected = useImageEditorStore((s) => s.duplicateSelected);
  const removeSelected = useImageEditorStore((s) => s.removeSelected);
  const alignSelected = useImageEditorStore((s) => s.alignSelected);
  const arrangeLayer = useImageEditorStore((s) => s.arrangeLayer);
  const commit = useImageEditorStore((s) => s.commit);
  const getDocument = useImageEditorStore((s) => s.document);
  const setSelectedIds = useImageEditorStore((s) => s.setSelectedIds);

  const layer = findLayer(doc.layers, menu.layerId);
  const isImage = layer?.type === 'image' || layer?.type === 'sticker';
  const siblingIds = layersForArtboard(
    doc.layers,
    layer?.artboardId ?? primaryArtboardId(doc),
    primaryArtboardId(doc),
  ).map((l) => l.id);

  useEffect(() => {
    if (!jobStart) {
      setElapsedMs(0);
      return;
    }
    const id = window.setInterval(() => setElapsedMs(Date.now() - jobStart), 250);
    return () => window.clearInterval(id);
  }, [jobStart]);

  useEffect(() => {
    if (busy) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [busy, onClose]);

  if (!layer) return null;

  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  const startJob = (label: string, kind: 'remove-bg' | 'replace-bg') => {
    setJobStart(Date.now());
    setElapsedMs(0);
    setBusy(label);
    useLayerAiProgressStore.getState().startJob({
      layerId: layer.id,
      kind,
      label,
    });
  };

  const endJob = () => {
    setJobStart(null);
    useLayerAiProgressStore.getState().clear();
  };

  const removeBg = async () => {
    startJob('Removing background…', 'remove-bg');
    try {
      const result = await applyImageAiEffect(
        getDocument(),
        ImageAiTool.RemoveBackground,
        layer.id,
        (msg) => {
          setBusy(msg);
          useLayerAiProgressStore.getState().report(msg);
        },
      );
      commit(result.document);
      setSelectedIds([layer.id]);
      endJob();
      onClose();
    } catch (err) {
      endJob();
      setBusy(err instanceof Error ? err.message : 'Remove background failed');
    }
  };

  const replaceBg = async (
    scene: (typeof REPLACE_BG_SCENES)[number] | { color: string; label: string },
  ) => {
    if (!layer.src) return;
    startJob('Replacing background…', 'replace-bg');
    try {
      const result = await applyReplaceBackgroundToLayer(
        getDocument(),
        layer.id,
        scene,
        (msg) => {
          setBusy(msg);
          useLayerAiProgressStore.getState().report(msg);
        },
      );
      commit(result.document);
      setSelectedIds([layer.id]);
      endJob();
      onClose();
    } catch (err) {
      endJob();
      setBusy(err instanceof Error ? err.message : 'Replace background failed');
    }
  };

  const left = Math.min(menu.x, window.innerWidth - 240);
  const top = Math.min(menu.y, window.innerHeight - 400);

  return (
    <div ref={rootRef} className="layer-ctx" style={{ left, top }} role="menu">
      {busy ? (
        <div className="layer-ctx-progress">
          <p className="layer-ctx-busy">{busy}</p>
          {jobStart ? (
            <p className="layer-ctx-time">
              Process time: <strong>{formatElapsed(elapsedMs)}</strong>
              <span> · first run downloads AI model</span>
            </p>
          ) : null}
          <div className="layer-ctx-bar" aria-hidden>
            <i />
          </div>
        </div>
      ) : null}
      <button type="button" className="layer-ctx-item" onClick={() => run(copySelected)}>
        Copy
        <span>Ctrl+C</span>
      </button>
      <button
        type="button"
        className="layer-ctx-item"
        disabled={!clipboard?.length}
        onClick={() => run(pasteClipboard)}
      >
        Paste
        <span>Ctrl+V</span>
      </button>
      <button type="button" className="layer-ctx-item" onClick={() => run(duplicateSelected)}>
        Duplicate
        <span>Ctrl+D</span>
      </button>
      <button type="button" className="layer-ctx-item danger" onClick={() => run(removeSelected)}>
        Delete
      </button>

      {isImage && (
        <>
          <div className="layer-ctx-sep" />
          <button
            type="button"
            className="layer-ctx-item"
            disabled={!layer.src || Boolean(busy)}
            onClick={() => void removeBg()}
          >
            Remove background
          </button>
          <div className="layer-ctx-subwrap">
            <button
              type="button"
              className="layer-ctx-item"
              disabled={!layer.src || Boolean(busy)}
              onClick={() => {
                setBgOpen((v) => !v);
                setAlignOpen(false);
              }}
            >
              Replace background
              <span>›</span>
            </button>
            {bgOpen && (
              <div className="layer-ctx-sub">
                {REPLACE_BG_SCENES.map((scene) => (
                  <button
                    key={scene.id}
                    type="button"
                    className="layer-ctx-item"
                    onClick={() => void replaceBg(scene)}
                  >
                    <i className="layer-ctx-dot" style={{ background: scene.color }} />
                    {scene.label}
                  </button>
                ))}
                <label className="layer-ctx-item">
                  Custom color
                  <input
                    type="color"
                    defaultValue="#0f766e"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => void replaceBg({ color: e.target.value, label: 'Custom' })}
                  />
                </label>
              </div>
            )}
          </div>
        </>
      )}

      <div className="layer-ctx-sep" />
      <button
        type="button"
        className="layer-ctx-item"
        onClick={() => run(() => arrangeLayer(layer.id, 'front', siblingIds))}
      >
        Bring to front
        <span>Ctrl+Shift+]</span>
      </button>
      <button
        type="button"
        className="layer-ctx-item"
        onClick={() => run(() => arrangeLayer(layer.id, 'forward', siblingIds))}
      >
        Bring forward
        <span>Ctrl+]</span>
      </button>
      <button
        type="button"
        className="layer-ctx-item"
        onClick={() => run(() => arrangeLayer(layer.id, 'backward', siblingIds))}
      >
        Send backward
        <span>Ctrl+[</span>
      </button>
      <button
        type="button"
        className="layer-ctx-item"
        onClick={() => run(() => arrangeLayer(layer.id, 'back', siblingIds))}
      >
        Send to back
        <span>Ctrl+Shift+[</span>
      </button>

      <div className="layer-ctx-sep" />
      <div className="layer-ctx-subwrap">
        <button
          type="button"
          className="layer-ctx-item"
          onClick={() => {
            setAlignOpen((v) => !v);
            setBgOpen(false);
          }}
        >
          Align
          <span>›</span>
        </button>
        {alignOpen && (
          <div className="layer-ctx-sub">
            {ALIGN.map((a) => (
              <button
                key={a.id}
                type="button"
                className="layer-ctx-item"
                onClick={() => run(() => alignSelected(a.id))}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
