/**
 * Layers panel: visibility, lock, rename, blend, opacity, reorder, position, group/ungroup.
 * Stack order + transform write into editor-core (saved with the project).
 */
'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BLEND_MODES, type BlendMode, type LayerNode, type LayerStackMove } from '@sn-editor/editor-core';
import { useImageEditorStore } from '@/store/imageEditorStore';
import { layersForArtboard, primaryArtboardId } from '@/lib/pageLayers';

/** Don't start a layer drag from inputs/buttons inside the row. */
class LayerPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent }: { nativeEvent: globalThis.PointerEvent }) => {
        if (!nativeEvent.isPrimary || nativeEvent.button !== 0) return false;
        const el = nativeEvent.target as HTMLElement | null;
        if (el?.closest('[data-no-dnd]')) return false;
        return true;
      },
    },
  ];
}

function stopDrag(e: { stopPropagation: () => void }) {
  e.stopPropagation();
}

function PositionField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (n: number) => void;
}) {
  const [text, setText] = useState(String(Math.round(value)));
  useEffect(() => {
    setText(String(Math.round(value)));
  }, [value]);

  const commit = (raw = text) => {
    if (raw === '' || raw === '-' || raw === '.') return;
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      setText(String(Math.round(value)));
      return;
    }
    onCommit(n);
  };

  return (
    <label className="layer-geom-field" data-no-dnd>
      {label}
      <input
        type="number"
        className="layer-geom-input"
        value={text}
        step={1}
        onPointerDown={stopDrag}
        onMouseDown={stopDrag}
        onClick={stopDrag}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          commit(raw);
        }}
        onBlur={() => {
          if (text === '' || text === '-' || text === '.') {
            setText(String(Math.round(value)));
            return;
          }
          commit();
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
      />
    </label>
  );
}

function SortableRow({
  layer,
  selected,
  siblingIds,
  onSelect,
}: {
  layer: LayerNode;
  selected: boolean;
  siblingIds: string[];
  onSelect: (e?: MouseEvent) => void;
}) {
  const setVisibility = useImageEditorStore((s) => s.setVisibility);
  const setLocked = useImageEditorStore((s) => s.setLocked);
  const rename = useImageEditorStore((s) => s.rename);
  const setOpacity = useImageEditorStore((s) => s.setOpacity);
  const setBlend = useImageEditorStore((s) => s.setBlend);
  const duplicate = useImageEditorStore((s) => s.duplicate);
  const remove = useImageEditorStore((s) => s.remove);
  const ungroup = useImageEditorStore((s) => s.ungroup);
  const arrangeLayer = useImageEditorStore((s) => s.arrangeLayer);
  const updateTransform = useImageEditorStore((s) => s.updateTransform);
  const [editing, setEditing] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: layer.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const layerOpacity = Number.isFinite(layer.opacity) ? layer.opacity : 1;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`cursor-grab rounded-lg border px-2 py-2 active:cursor-grabbing ${
        selected ? 'border-teal-600 bg-teal-700/5' : 'border-fog-200 bg-fog-50'
      } ${!layer.visible ? 'opacity-55' : ''}`}
      {...attributes}
      {...listeners}
      onClick={(e) => onSelect(e)}
    >
      <div className="flex items-center gap-1.5">
        <span className="px-1 text-ink-500" aria-hidden>
          ::
        </span>
        <button
          type="button"
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
            layer.visible ? 'bg-teal-700/10 text-teal-800' : 'bg-fog-200 text-ink-600'
          }`}
          title={layer.visible ? 'Hide layer' : 'Show layer'}
          data-no-dnd
          onClick={(e) => {
            e.stopPropagation();
            setVisibility(layer.id, !layer.visible);
          }}
        >
          {layer.visible ? 'Visible' : 'Hidden'}
        </button>
        <button
          type="button"
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
            layer.locked ? 'bg-amber-100 text-amber-900' : 'text-ink-700'
          }`}
          title={layer.locked ? 'Unlock layer' : 'Lock layer'}
          data-no-dnd
          onClick={(e) => {
            e.stopPropagation();
            setLocked(layer.id, !layer.locked);
          }}
        >
          {layer.locked ? 'Locked' : 'Lock'}
        </button>
        {editing ? (
          <input
            className="min-w-0 flex-1 rounded border border-fog-200 px-1 text-xs"
            defaultValue={layer.name}
            autoFocus
            data-no-dnd
            onClick={(e) => e.stopPropagation()}
            onBlur={(e) => {
              rename(layer.id, e.target.value || layer.name);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        ) : (
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left text-xs font-semibold text-ink-900"
            data-no-dnd
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
          >
            {layer.name}
            <span className="ml-1 font-normal text-ink-600/60">{layer.type}</span>
          </button>
        )}
      </div>
      {selected && (
        <div
          className="mt-2 space-y-1.5 border-t border-fog-200 pt-2"
          data-no-dnd
          onPointerDown={stopDrag}
          onMouseDown={stopDrag}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="layer-geom" data-no-dnd>
            <PositionField
              label="X"
              value={layer.transform.x}
              onCommit={(x) => updateTransform(layer.id, { x })}
            />
            <PositionField
              label="Y"
              value={layer.transform.y}
              onCommit={(y) => updateTransform(layer.id, { y })}
            />
            <PositionField
              label="Rotate"
              value={layer.transform.rotation}
              onCommit={(rotation) => updateTransform(layer.id, { rotation })}
            />
          </div>
          <div className="layer-geom layer-geom-size" data-no-dnd>
            <PositionField
              label="Width"
              value={layer.transform.width}
              onCommit={(width) => {
                const min = layer.shape === 'line' || layer.shape === 'arrow' ? 2 : 8;
                updateTransform(layer.id, { width: Math.max(min, width) });
              }}
            />
            <PositionField
              label="Height"
              value={layer.transform.height}
              onCommit={(height) => {
                const min = layer.shape === 'line' || layer.shape === 'arrow' ? 2 : 8;
                updateTransform(layer.id, { height: Math.max(min, height) });
              }}
            />
          </div>
          <div className="flex flex-wrap gap-1" data-no-dnd>
            {(['front', 'forward', 'backward', 'back'] as LayerStackMove[]).map((move) => (
              <button
                key={move}
                type="button"
                className="btn-tool"
                title={
                  move === 'front'
                    ? 'Bring to front'
                    : move === 'forward'
                      ? 'Bring forward'
                      : move === 'backward'
                        ? 'Send backward'
                        : 'Send to back'
                }
                onPointerDown={stopDrag}
                onMouseDown={stopDrag}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  arrangeLayer(layer.id, move, siblingIds);
                }}
              >
                {move === 'front'
                  ? 'Front'
                  : move === 'forward'
                    ? 'Forward'
                    : move === 'backward'
                      ? 'Backward'
                      : 'Back'}
              </button>
            ))}
          </div>
          <label className="flex items-center justify-between gap-2 text-[11px] text-ink-600">
            <span>Opacity {Math.round(layerOpacity * 100)}%</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={layerOpacity}
              onChange={(e) => setOpacity(layer.id, Number(e.target.value))}
              className="w-28"
            />
          </label>
          <label className="flex items-center justify-between gap-2 text-[11px] text-ink-600">
            Blend
            <select
              className="rounded border border-fog-200 bg-white px-1 py-0.5 text-[11px]"
              value={layer.blendMode ?? 'normal'}
              onChange={(e) => setBlend(layer.id, e.target.value as BlendMode)}
            >
              {BLEND_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          {(layer.blendMode && layer.blendMode !== 'normal') && (
            <p className="text-[10px] leading-snug text-ink-600/80">
              Blend is strongest where this layer overlaps another layer (not empty white).
            </p>
          )}
          <div className="flex flex-wrap gap-1">
            <button type="button" className="btn-tool" onClick={() => duplicate(layer.id)}>
              Duplicate
            </button>
            {layer.type === 'group' ? (
              <button type="button" className="btn-tool" onClick={() => ungroup(layer.id)}>
                Ungroup
              </button>
            ) : null}
            <button
              type="button"
              className="btn-tool"
              disabled={layer.locked}
              title={layer.locked ? 'Unlock layer before deleting' : 'Delete layer'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                remove(layer.id);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function LayersPanel() {
  const allLayers = useImageEditorStore((s) => s.history.present.layers);
  const doc = useImageEditorStore((s) => s.history.present);
  const activeArtboardId = useImageEditorStore((s) => s.activeArtboardId);
  const selectedIds = useImageEditorStore((s) => s.selectedIds);
  const setSelectedIds = useImageEditorStore((s) => s.setSelectedIds);
  const group = useImageEditorStore((s) => s.group);
  const reorderPageLayers = useImageEditorStore((s) => s.reorderPageLayers);

  const sensors = useSensors(
    useSensor(LayerPointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const pageId = activeArtboardId ?? primaryArtboardId(doc);
  const layers = layersForArtboard(allLayers, pageId, primaryArtboardId(doc));
  const pageName =
    doc.artboards.find((a) => a.id === pageId)?.name ?? 'Page';

  // Show root layers top-to-bottom as most designers expect (top of list = front).
  const display = [...layers].reverse();
  const ids = display.map((l) => l.id);
  const siblingIds = layers.map((l) => l.id);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldDisplay = display.findIndex((l) => l.id === active.id);
    const newDisplay = display.findIndex((l) => l.id === over.id);
    if (oldDisplay < 0 || newDisplay < 0) return;
    const nextDisplay = arrayMove(display, oldDisplay, newDisplay);
    const pageDocOrder = [...nextDisplay].reverse();
    reorderPageLayers(pageDocOrder.map((l) => l.id));
  };

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-700">Layers</h2>
          <p className="truncate text-[10px] text-ink-500">{pageName}</p>
        </div>
        <button
          type="button"
          className="btn-tool shrink-0"
          disabled={selectedIds.length < 2}
          onClick={() => group(selectedIds)}
        >
          Group
        </button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1.5">
            {display.map((layer) => (
              <SortableRow
                key={layer.id}
                layer={layer}
                siblingIds={siblingIds}
                selected={selectedIds.includes(layer.id)}
                onSelect={(e) => {
                  const multi = e?.shiftKey || e?.ctrlKey || e?.metaKey;
                  if (multi) {
                    if (selectedIds.includes(layer.id)) {
                      setSelectedIds(selectedIds.filter((id) => id !== layer.id));
                    } else {
                      setSelectedIds([...selectedIds, layer.id]);
                    }
                  } else {
                    setSelectedIds([layer.id]);
                    if (layer.type === 'text' || layer.type === 'cta') {
                      useImageEditorStore.getState().setLeftTab('text');
                    }
                  }
                }}
              />
            ))}
            {layers.length === 0 && (
              <p className="text-xs text-ink-600/70">
                This page is empty — add shapes or text to design it.
              </p>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
