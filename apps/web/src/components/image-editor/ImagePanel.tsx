/**
 * Image / sticker properties: crop, filters, flip, replace, background, animation.
 */
'use client';

import { useEffect, useState } from 'react';
import { findLayer, type LayerAnimationType } from '@sn-editor/editor-core';
import { ImageAiTool } from '@sn-editor/ai-contracts';
import { applyImageAiEffect, applyReplaceBackgroundToLayer } from '@/lib/clientAiEffects';
import { REPLACE_BG_SCENES } from '@/lib/imageLayerEffects';
import { defaultAnimation, IMAGE_ANIMATIONS } from '@/lib/layerAnimationPresets';
import { warmBackgroundRemoval } from '@/lib/mlBackgroundRemoval';
import { formatElapsed } from '@/lib/processProgress';
import { fileToLocalUpload, persistAssetToApi, pickFiles } from '@/lib/mediaUpload';
import { useImageEditorStore } from '@/store/imageEditorStore';
import { useLayerAiProgressStore } from '@/store/layerAiProgressStore';
import { PremiumGate } from '@/components/auth/PremiumGate';

type CropRect = { x: number; y: number; width: number; height: number };

const DEFAULT_ADJUST = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  blur: 0,
  hue: 0,
};

function clampCrop(next: CropRect): CropRect {
  const x = Math.max(0, Math.min(0.95, next.x));
  const y = Math.max(0, Math.min(0.95, next.y));
  const width = Math.max(0.05, Math.min(1 - x, next.width));
  const height = Math.max(0.05, Math.min(1 - y, next.height));
  return { x, y, width, height };
}

export function ImagePanel() {
  const doc = useImageEditorStore((s) => s.history.present);
  const selectedIds = useImageEditorStore((s) => s.selectedIds);
  const updateLayerProps = useImageEditorStore((s) => s.updateLayerProps);
  const updateTransform = useImageEditorStore((s) => s.updateTransform);
  const commit = useImageEditorStore((s) => s.commit);
  const document = useImageEditorStore((s) => s.document);
  const setSelectedIds = useImageEditorStore((s) => s.setSelectedIds);

  const selected = selectedIds[0] ? findLayer(doc.layers, selectedIds[0]) : undefined;
  const isImage = selected && (selected.type === 'image' || selected.type === 'sticker');

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [jobStart, setJobStart] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    setStatus(null);
    setJobStart(null);
  }, [selected?.id]);

  useEffect(() => {
    if (!jobStart) {
      setElapsedMs(0);
      return;
    }
    const id = window.setInterval(() => setElapsedMs(Date.now() - jobStart), 250);
    return () => window.clearInterval(id);
  }, [jobStart]);

  useEffect(() => {
    if (!isImage) return;
    void warmBackgroundRemoval();
  }, [isImage]);

  if (!isImage || !selected) {
    return (
      <div className="border-b border-fog-200 p-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-600">Image</h2>
        <p className="mt-2 text-[11px] text-ink-600/70">Select an image to crop, filter, or replace.</p>
      </div>
    );
  }

  const adjust = { ...DEFAULT_ADJUST, ...selected.imageAdjust };
  const activeAnim = selected.animation?.type ?? 'none';

  const resetCrop = () => {
    updateLayerProps(selected.id, { crop: undefined });
  };

  const setAdjust = (key: keyof typeof DEFAULT_ADJUST, value: number) => {
    updateLayerProps(selected.id, {
      imageAdjust: { ...adjust, [key]: value },
    });
  };

  const resetAdjust = () => {
    updateLayerProps(selected.id, { imageAdjust: { ...DEFAULT_ADJUST } });
  };

  const setSize = (patch: Partial<{ x: number; y: number; width: number; height: number; rotation: number }>) => {
    updateTransform(selected.id, patch);
  };

  const flipH = () => {
    updateTransform(selected.id, { scaleX: -selected.transform.scaleX });
  };

  const flipV = () => {
    updateTransform(selected.id, { scaleY: -selected.transform.scaleY });
  };

  const setAnimation = (type: LayerAnimationType) => {
    updateLayerProps(selected.id, { animation: defaultAnimation(type) });
    // Retrigger by rewriting animation object even for same type
    if (type !== 'none') {
      window.setTimeout(() => {
        updateLayerProps(selected.id, {
          animation: { ...defaultAnimation(type)! },
        });
      }, 0);
    }
  };

  const replaceImage = async () => {
    const files = await pickFiles({
      accept: 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml',
      multiple: false,
    });
    const file = files[0];
    if (!file) return;
    setBusy(true);
    try {
      const upload = await fileToLocalUpload(file, 'image');
      await persistAssetToApi(upload);
      updateLayerProps(selected.id, { src: upload.url, name: upload.name, originalSrc: upload.url });
      setStatus('Image replaced');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Replace failed');
    } finally {
      setBusy(false);
    }
  };

  const removeBackground = async () => {
    setBusy(true);
    const started = Date.now();
    setJobStart(started);
    setStatus('Removing background…');
    useLayerAiProgressStore.getState().startJob({
      layerId: selected.id,
      kind: 'remove-bg',
      label: 'Removing background…',
    });
    try {
      const result = await applyImageAiEffect(
        document(),
        ImageAiTool.RemoveBackground,
        selected.id,
        (msg) => {
          setStatus(msg);
          useLayerAiProgressStore.getState().report(msg);
        },
      );
      commit(result.document);
      setSelectedIds([selected.id]);
      setStatus(`${result.message} · took ${formatElapsed(Date.now() - started)}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Background remove failed');
    } finally {
      setBusy(false);
      setJobStart(null);
      useLayerAiProgressStore.getState().clear();
    }
  };

  const replaceBackground = async (scene: (typeof REPLACE_BG_SCENES)[number]) => {
    setBusy(true);
    const started = Date.now();
    setJobStart(started);
    setStatus('Replacing background…');
    useLayerAiProgressStore.getState().startJob({
      layerId: selected.id,
      kind: 'replace-bg',
      label: 'Replacing background…',
    });
    try {
      const result = await applyReplaceBackgroundToLayer(
        document(),
        selected.id,
        scene,
        (msg) => {
          setStatus(msg);
          useLayerAiProgressStore.getState().report(msg);
        },
      );
      commit(result.document);
      setSelectedIds([selected.id]);
      setStatus(`Background replaced · took ${formatElapsed(Date.now() - started)}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Replace background failed');
    } finally {
      setBusy(false);
      setJobStart(null);
      useLayerAiProgressStore.getState().clear();
    }
  };

  return (
    <div className="flex flex-col gap-3 border-b border-fog-200 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-600">Image</h2>
      <p className="text-xs font-semibold text-ink-800">Editing: {selected.name}</p>

      <div className="space-y-2 rounded-xl border border-fog-200 bg-[var(--sn-editor-panel)] p-3">
        <p className="text-[11px] font-semibold text-ink-800">Size &amp; position</p>
        <div className="layer-geom">
          {(
            [
              ['X', 'x', selected.transform.x],
              ['Y', 'y', selected.transform.y],
              ['Rotate', 'rotation', selected.transform.rotation],
            ] as const
          ).map(([label, key, value]) => (
            <label key={key} className="layer-geom-field">
              {label}
              <input
                type="number"
                className="layer-geom-input"
                value={Math.round(value)}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  setSize({ [key]: n });
                }}
              />
            </label>
          ))}
        </div>
        <div className="layer-geom layer-geom-size">
          <label className="layer-geom-field">
            Width
            <input
              type="number"
              className="layer-geom-input"
              min={8}
              value={Math.round(selected.transform.width)}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                setSize({ width: Math.max(8, n) });
              }}
            />
          </label>
          <label className="layer-geom-field">
            Height
            <input
              type="number"
              className="layer-geom-input"
              min={8}
              value={Math.round(selected.transform.height)}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                setSize({ height: Math.max(8, n) });
              }}
            />
          </label>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-fog-200 bg-[var(--sn-editor-panel)] p-3">
        <p className="text-[11px] font-semibold text-ink-800">Logo / image shape</p>
        <p className="text-[10px] text-ink-500">Clip the photo or logo into a frame.</p>
        <div className="grid grid-cols-4 gap-1">
          {(
            [
              ['square', 'Square'],
              ['rounded', 'Rounded'],
              ['circle', 'Circle'],
              ['squircle', 'Soft'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`btn-tool !px-1 !py-1.5 text-[10px] ${
                (selected.imageMask ?? 'square') === id ? 'btn-tool-active' : ''
              }`}
              onClick={() => updateLayerProps(selected.id, { imageMask: id })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-fog-200 bg-[var(--sn-editor-panel)] p-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-ink-800">Crop</p>
          <button type="button" className="text-[10px] font-semibold text-teal-800" onClick={resetCrop}>
            Reset
          </button>
        </div>
        <p className="text-[10px] text-ink-500">
          Drag a slider to crop the photo. The canvas updates immediately.
        </p>
        {(
          [
            ['x', 'X offset'],
            ['y', 'Y offset'],
            ['width', 'Width'],
            ['height', 'Height'],
          ] as const
        ).map(([key, label]) => {
          const crop = clampCrop(selected.crop ?? { x: 0, y: 0, width: 1, height: 1 });
          return (
            <label key={key} className="block text-[11px] font-semibold text-ink-700">
              {label} {Math.round(crop[key] * 100)}%
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                className="mt-1 w-full"
                value={crop[key]}
                onChange={(e) => {
                  const next = clampCrop({ ...crop, [key]: Number(e.target.value) });
                  updateLayerProps(selected.id, { crop: next });
                }}
              />
            </label>
          );
        })}
      </div>

      <PremiumGate feature="image.filters" label="Image filters">
        <div className="space-y-2 rounded-xl border border-fog-200 bg-[var(--sn-editor-panel)] p-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-ink-800">Filters</p>
            <button type="button" className="text-[10px] font-semibold text-teal-800" onClick={resetAdjust}>
              Reset
            </button>
          </div>
          {(
            [
              ['brightness', 'Brightness', -1, 1, 0.05],
              ['contrast', 'Contrast', -1, 1, 0.05],
              ['saturation', 'Saturation', -1, 1, 0.05],
              ['blur', 'Blur', 0, 20, 0.5],
              ['hue', 'Hue', -180, 180, 1],
            ] as const
          ).map(([key, label, min, max, step]) => (
            <label key={key} className="block text-[11px] font-semibold text-ink-700">
              {label} {key === 'hue' || key === 'blur' ? adjust[key] : adjust[key].toFixed(2)}
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                className="mt-1 w-full"
                value={adjust[key]}
                onChange={(e) => setAdjust(key, Number(e.target.value))}
              />
            </label>
          ))}
        </div>
      </PremiumGate>

      <PremiumGate feature="image.animate" label="Image animations">
        <div className="space-y-2 rounded-xl border border-fog-200 bg-[var(--sn-editor-panel)] p-3">
          <p className="text-[11px] font-semibold text-ink-700">Animate</p>
          <div className="grid grid-cols-2 gap-1.5">
            {IMAGE_ANIMATIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`btn-tool !px-2 !py-1.5 text-left text-[11px] ${
                  activeAnim === a.id ? 'btn-tool-active' : ''
                }`}
                onClick={() => setAnimation(a.id)}
              >
                {a.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-ink-500">Preview plays on the canvas. Loops: Breathe, Float.</p>
        </div>
      </PremiumGate>

      <div className="flex gap-1">
        <button type="button" className="btn-tool flex-1" onClick={flipH} title="Flip horizontal">
          Flip H
        </button>
        <button type="button" className="btn-tool flex-1" onClick={flipV} title="Flip vertical">
          Flip V
        </button>
      </div>

      <button
        type="button"
        className="btn-tool w-full text-left"
        disabled={busy}
        onClick={() => void replaceImage()}
      >
        Replace image
      </button>

      <div className="space-y-2 rounded-xl border border-fog-200 bg-[var(--sn-editor-panel)] p-3">
        <p className="text-[11px] font-semibold text-ink-700">Background AI</p>
        <button
          type="button"
          className="btn-tool w-full text-left"
          disabled={busy || !selected.src}
          onClick={() => void removeBackground()}
        >
          Remove background
        </button>
        <div className="grid grid-cols-5 gap-1.5">
          {REPLACE_BG_SCENES.slice(0, 10).map((scene) => (
            <button
              key={scene.id}
              type="button"
              title={scene.label}
              disabled={busy || !selected.src}
              className="h-7 rounded-md border border-fog-200 disabled:opacity-50"
              style={{ background: scene.color }}
              onClick={() => void replaceBackground(scene)}
            />
          ))}
        </div>
        {busy && jobStart ? (
          <p className="text-[11px] font-semibold text-teal-800">
            Process time: {formatElapsed(elapsedMs)}
          </p>
        ) : null}
        <p className="text-[10px] text-ink-500">
          On-device AI · first run ~1–2 min (model download), then usually under ~10s.
        </p>
      </div>

      {status && <p className="text-[11px] text-teal-800">{status}</p>}
    </div>
  );
}
