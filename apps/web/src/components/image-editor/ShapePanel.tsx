/**
 * Properties + quick-add for selected shape layers (all types).
 * Position, size, color, stroke — always write through to the document + canvas.
 */
'use client';

import { findLayer } from '@sn-editor/editor-core';
import { useImageEditorStore } from '@/store/imageEditorStore';

const ADD_SHAPES = [
  { shape: 'rect' as const, label: 'Rect' },
  { shape: 'ellipse' as const, label: 'Ellipse' },
  { shape: 'triangle' as const, label: 'Triangle' },
  { shape: 'line' as const, label: 'Line' },
  { shape: 'polygon' as const, label: 'Polygon' },
  { shape: 'star' as const, label: 'Star' },
  { shape: 'arrow' as const, label: 'Arrow' },
];

function hexOf(value: string | undefined, fallback: string) {
  if (value?.startsWith('#')) return value.slice(0, 7);
  return fallback;
}

export function ShapePanel() {
  const doc = useImageEditorStore((s) => s.history.present);
  const selectedIds = useImageEditorStore((s) => s.selectedIds);
  const addShape = useImageEditorStore((s) => s.addShape);
  const setOpacity = useImageEditorStore((s) => s.setOpacity);
  const updateLayerProps = useImageEditorStore((s) => s.updateLayerProps);
  const updateTransform = useImageEditorStore((s) => s.updateTransform);

  const selected = selectedIds[0] ? findLayer(doc.layers, selectedIds[0]) : undefined;
  const isShape = selected?.type === 'shape';
  const isLineLike = selected?.shape === 'line' || selected?.shape === 'arrow';
  const minSize = isLineLike ? 2 : 8;

  const setPos = (patch: Partial<{ x: number; y: number; width: number; height: number; rotation: number }>) => {
    if (!selected) return;
    updateTransform(selected.id, patch);
  };

  const setFillColor = (fill: string) => {
    if (!selected) return;
    if (isLineLike) {
      // Line / arrow: fill + stroke stay in sync so color changes are visible
      updateLayerProps(selected.id, {
        fill,
        stroke: fill,
        strokeWidth: Math.max(selected.strokeWidth ?? 4, 2),
        shapeGradient: undefined,
      });
      return;
    }
    updateLayerProps(selected.id, {
      fill,
      shapeGradient: undefined,
    });
  };

  return (
    <div className="flex flex-col gap-3 border-b border-fog-200 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-600">Shapes</h2>

      <div className="grid grid-cols-4 gap-1.5">
        {ADD_SHAPES.map((s) => (
          <button
            key={s.shape}
            type="button"
            className="btn-tool !px-1 !py-1.5 text-[10px]"
            onClick={() => addShape(s.shape)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {isShape && selected ? (
        <div className="space-y-3 rounded-xl border border-fog-200 bg-[var(--sn-editor-panel)] p-3">
          <p className="text-xs font-semibold text-ink-800">
            Editing: {selected.name}
            <span className="ml-1 font-normal text-ink-500">({selected.shape})</span>
          </p>

          <div className="grid grid-cols-5 gap-1.5">
            {(
              [
                ['X', 'x', selected.transform.x, undefined],
                ['Y', 'y', selected.transform.y, undefined],
                ['W', 'width', selected.transform.width, minSize],
                ['H', 'height', selected.transform.height, minSize],
                ['R', 'rotation', selected.transform.rotation, undefined],
              ] as const
            ).map(([label, key, value, min]) => (
              <label key={key} className="flex min-w-0 flex-col gap-0.5 text-[10px] font-semibold text-ink-600">
                {label}
                <input
                  type="number"
                  className="w-full rounded border border-fog-200 bg-[var(--sn-editor-panel)] px-1 py-1 text-[11px] text-ink-900"
                  value={Math.round(value)}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isFinite(n)) return;
                    setPos({ [key]: min != null ? Math.max(min, n) : n });
                  }}
                />
              </label>
            ))}
          </div>

          <label className="block text-[11px] text-ink-600">
            {isLineLike ? 'Color' : 'Fill'}
            <input
              type="color"
              className="mt-1 h-8 w-full cursor-pointer rounded border border-fog-200"
              value={hexOf(selected.fill ?? selected.stroke, '#0f766e')}
              onChange={(e) => setFillColor(e.target.value)}
            />
          </label>

          {!isLineLike && (
            <label className="block text-[11px] text-ink-600">
              Stroke
              <input
                type="color"
                className="mt-1 h-8 w-full cursor-pointer rounded border border-fog-200"
                value={hexOf(selected.stroke, '#0a1214')}
                onChange={(e) =>
                  updateLayerProps(selected.id, {
                    stroke: e.target.value,
                    strokeWidth: Math.max(selected.strokeWidth ?? 0, 1),
                  })
                }
              />
            </label>
          )}

          <label className="block text-[11px] text-ink-600">
            Stroke width {selected.strokeWidth ?? (isLineLike ? 4 : 0)}
            <input
              type="range"
              min={0}
              max={48}
              className="mt-1 w-full"
              value={selected.strokeWidth ?? (isLineLike ? 4 : 0)}
              onChange={(e) => {
                const strokeWidth = Number(e.target.value);
                updateLayerProps(selected.id, {
                  strokeWidth,
                  stroke: selected.stroke ?? selected.fill ?? '#0a1214',
                });
                if (isLineLike) {
                  setPos({ height: Math.max(strokeWidth, selected.transform.height) });
                }
              }}
            />
          </label>

          {selected.shape === 'rect' && (
            <label className="block text-[11px] text-ink-600">
              Corner radius {selected.cornerRadius ?? 0}
              <input
                type="range"
                min={0}
                max={120}
                className="mt-1 w-full"
                value={selected.cornerRadius ?? 0}
                onChange={(e) =>
                  updateLayerProps(selected.id, { cornerRadius: Number(e.target.value) })
                }
              />
            </label>
          )}

          <label className="block text-[11px] text-ink-600">
            Opacity {Math.round((selected.opacity ?? 1) * 100)}%
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              className="mt-1 w-full"
              value={selected.opacity ?? 1}
              onChange={(e) => setOpacity(selected.id, Number(e.target.value))}
            />
          </label>

          <label className="flex items-center gap-2 text-[11px] text-ink-700">
            <input
              type="checkbox"
              checked={Boolean(selected.dash?.length)}
              onChange={(e) =>
                updateLayerProps(selected.id, {
                  dash: e.target.checked ? [8, 6] : undefined,
                  strokeWidth: e.target.checked
                    ? Math.max(selected.strokeWidth ?? 0, 2)
                    : selected.strokeWidth,
                  stroke: selected.stroke ?? selected.fill ?? '#0a1214',
                })
              }
            />
            Dashed stroke
          </label>

          {!isLineLike && (
            <fieldset className="space-y-2 rounded-lg border border-fog-200 p-2">
              <legend className="px-1 text-[11px] font-semibold text-ink-700">Gradient</legend>
              <label className="flex items-center gap-2 text-[11px]">
                <input
                  type="checkbox"
                  checked={Boolean(selected.shapeGradient)}
                  onChange={(e) =>
                    updateLayerProps(selected.id, {
                      shapeGradient: e.target.checked
                        ? {
                            from: selected.fill ?? '#0f766e',
                            to: '#99f6e4',
                            angle: 90,
                          }
                        : undefined,
                    })
                  }
                />
                Enable gradient
              </label>
              {selected.shapeGradient && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={selected.shapeGradient.from}
                      onChange={(e) =>
                        updateLayerProps(selected.id, {
                          shapeGradient: { ...selected.shapeGradient!, from: e.target.value },
                          fill: e.target.value,
                        })
                      }
                    />
                    <input
                      type="color"
                      value={selected.shapeGradient.to}
                      onChange={(e) =>
                        updateLayerProps(selected.id, {
                          shapeGradient: { ...selected.shapeGradient!, to: e.target.value },
                        })
                      }
                    />
                  </div>
                  <label className="block text-[11px] text-ink-600">
                    Angle {selected.shapeGradient.angle}°
                    <input
                      type="range"
                      min={0}
                      max={360}
                      className="mt-1 w-full"
                      value={selected.shapeGradient.angle}
                      onChange={(e) =>
                        updateLayerProps(selected.id, {
                          shapeGradient: {
                            ...selected.shapeGradient!,
                            angle: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                </div>
              )}
            </fieldset>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-ink-600/70">Select a shape to edit position, color, and size.</p>
      )}
    </div>
  );
}
