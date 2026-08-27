/**
 * Zustand store for the SN Editor image editor.
 * Wraps editor-core history + document mutation commands.
 */
'use client';

import { create } from 'zustand';
import {
  addLayer,
  applyBrandKit,
  arrangeLayer as arrangeLayerCmd,
  canRedo,
  canUndo,
  createArtboard,
  createEmptyDocument,
  createBodyLayer,
  createHeadingLayer,
  createHistory,
  createLayer,
  createSubheadingLayer,
  deleteLayer,
  duplicateLayer,
  duplicateLayerCmd,
  findLayer,
  flattenLayers,
  groupSelected,
  pushHistory,
  redo as historyRedo,
  renameLayer,
  reorderLayers,
  reorderLayersByIds,
  setLayerBlendMode,
  setLayerFill,
  setLayerLocked,
  setLayerOpacity,
  setLayerText,
  setLayerVisibility,
  touchDocument,
  undo as historyUndo,
  ungroup,
  updateArtboard,
  updateLayer,
  updateLayerTransform,
  type BlendMode,
  type BrandKit,
  type DesignDocument,
  type HistoryState,
  type LayerNode,
  type LayerStackMove,
  type TextEffects,
  type TextStyle,
} from '@sn-editor/editor-core';
import type { Viewport } from '@sn-editor/image-engine';
import { DEFAULT_VIEWPORT } from '@sn-editor/image-engine';
import { createId } from '@sn-editor/shared';
import {
  cloneLayersForPage,
  ensureLayerPages,
  layerArtboardId,
  layersForArtboard,
  primaryArtboardId,
  stampLayerPage,
} from '@/lib/pageLayers';

export type LeftTab =
  | 'templates'
  | 'elements'
  | 'assets'
  | 'text'
  | 'brand'
  | 'tools'
  | 'ai'
  | 'product'
  | 'export';

export type CanvasTool =
  | 'select'
  | 'draw'
  | 'shapes'
  | 'line'
  | 'sticky'
  | 'text'
  | 'signature'
  | 'table';

interface ImageEditorState {
  history: HistoryState<DesignDocument>;
  selectedIds: string[];
  viewport: Viewport;
  snapEnabled: boolean;
  gridSize: number;
  gridVisible: boolean;
  rulersVisible: boolean;
  leftTab: LeftTab;
  activeArtboardId: string | null;
  activeTool: CanvasTool;
  clipboard: LayerNode[] | null;

  document: () => DesignDocument;
  canUndo: () => boolean;
  canRedo: () => boolean;

  commit: (next: DesignDocument) => void;
  loadDocument: (doc: DesignDocument) => void;
  undo: () => void;
  redo: () => void;

  setSelectedIds: (ids: string[]) => void;
  setViewport: (viewport: Viewport) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setGridVisible: (visible: boolean) => void;
  setRulersVisible: (visible: boolean) => void;
  setLeftTab: (tab: LeftTab) => void;
  setActiveTool: (tool: CanvasTool) => void;
  setActiveArtboard: (id: string, focus?: boolean) => void;
  reorderArtboard: (id: string, direction: 'left' | 'right') => void;
  magicResize: (width: number, height: number) => void;

  addShape: (shape?: LayerNode['shape'], fill?: string) => void;
  addText: (role?: 'heading' | 'subheading' | 'body' | 'textbox') => void;
  addImagePlaceholder: () => void;
  addArtboard: (width?: number, height?: number) => void;
  duplicateActivePage: () => void;
  deleteActivePage: () => void;
  addStickyNote: () => void;
  addLine: () => void;
  addTable: (rows?: number, cols?: number) => void;
  addSignaturePath: () => void;
  addChart: () => void;
  addSheet: () => void;
  addMediaLayer: (opts: {
    name: string;
    src: string;
    kind: 'image' | 'video';
    width?: number;
    height?: number;
  }) => void;

  setVisibility: (id: string, visible: boolean) => void;
  setLocked: (id: string, locked: boolean) => void;
  rename: (id: string, name: string) => void;
  renameDocument: (name: string) => void;
  setOpacity: (id: string, opacity: number) => void;
  setBlend: (id: string, blend: BlendMode) => void;
  duplicate: (id: string) => void;
  remove: (id: string) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  reorderPageLayers: (orderedIds: string[]) => void;
  arrangeLayer: (id: string, move: LayerStackMove, siblingIds?: string[]) => void;
  group: (ids: string[]) => void;
  ungroup: (groupId: string) => void;
  updateTransform: (id: string, transform: Partial<LayerNode['transform']>) => void;
  updateTextStyle: (id: string, patch: Partial<TextStyle>, effects?: Partial<TextEffects>) => void;
  updateTextContent: (id: string, text: string) => void;
  updateLayerProps: (id: string, patch: Partial<LayerNode>) => void;
  setFill: (id: string, fill: string) => void;
  updateArtboard: (
    id: string,
    patch: Partial<{ x: number; y: number; width: number; height: number; background: string }>,
  ) => void;
  alignSelected: (mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeSelected: (axis: 'horizontal' | 'vertical') => void;
  removeSelected: () => void;
  applyBrand: (brand: BrandKit) => void;
  placeBrandLogo: (src: string) => void;

  copySelected: () => void;
  pasteClipboard: () => void;
  duplicateSelected: () => void;
  nudgeSelected: (dx: number, dy: number) => void;
  selectAll: () => void;
  groupSelectedIds: () => void;
  ungroupSelected: () => void;
}

/** Debounce text edits so each keystroke doesn't create a history entry. */
let textDebounce: ReturnType<typeof setTimeout> | null = null;
let textDebounceId: string | null = null;

function initialDoc(): DesignDocument {
  const doc = createEmptyDocument('Untitled Design');
  const pageId = primaryArtboardId(doc);
  const heading = stampLayerPage(createHeadingLayer('SN Editor'), pageId);
  const sub = stampLayerPage(createSubheadingLayer('Design anything'), pageId);
  const shape = stampLayerPage(
    createLayer({
      type: 'shape',
      name: 'Accent Bar',
      shape: 'rect',
      fill: '#0f766e',
      transform: {
        x: 80,
        y: 320,
        width: 220,
        height: 10,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
    }),
    pageId,
  );
  return { ...doc, layers: [heading, sub, shape] };
}

function activePageId(
  get: () => { activeArtboardId: string | null; document: () => DesignDocument },
): string | undefined {
  return get().activeArtboardId ?? primaryArtboardId(get().document());
}

export const useImageEditorStore = create<ImageEditorState>((set, get) => {
  const seed = initialDoc();
  return {
    history: createHistory(seed),
    selectedIds: [],
    viewport: { ...DEFAULT_VIEWPORT, x: 120, y: 80, scale: 0.55 },
    snapEnabled: true,
    gridSize: 40,
    gridVisible: true,
    rulersVisible: false,
    leftTab: 'assets',
    activeArtboardId: seed.artboards[0]?.id ?? null,
    activeTool: 'select',
    clipboard: null,

    document: () => get().history.present,
    canUndo: () => canUndo(get().history),
    canRedo: () => canRedo(get().history),

    commit: (next) =>
      set((s) => {
        const stillExists = next.artboards.some((ab) => ab.id === s.activeArtboardId);
        return {
          history: pushHistory(s.history, next),
          activeArtboardId: stillExists
            ? s.activeArtboardId
            : (next.artboards[0]?.id ?? null),
        };
      }),

    loadDocument: (doc) => {
      const normalized = ensureLayerPages(doc);
      // Push onto history so template / new-design swaps are undoable
      set((s) => ({
        history: pushHistory(s.history, normalized),
        selectedIds: [],
        activeArtboardId: normalized.artboards[0]?.id ?? null,
      }));
    },

    undo: () =>
      set((s) => {
        const history = historyUndo(s.history);
        if (history === s.history) return s;
        const stillExists = history.present.artboards.some((ab) => ab.id === s.activeArtboardId);
        return {
          history,
          selectedIds: [],
          activeArtboardId: stillExists
            ? s.activeArtboardId
            : (history.present.artboards[0]?.id ?? null),
        };
      }),
    redo: () =>
      set((s) => {
        const history = historyRedo(s.history);
        if (history === s.history) return s;
        const stillExists = history.present.artboards.some((ab) => ab.id === s.activeArtboardId);
        return {
          history,
          selectedIds: [],
          activeArtboardId: stillExists
            ? s.activeArtboardId
            : (history.present.artboards[0]?.id ?? null),
        };
      }),

    setSelectedIds: (ids) => set({ selectedIds: ids }),
    setViewport: (viewport) => set({ viewport }),
    setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
    setGridVisible: (visible) => set({ gridVisible: visible }),
    setRulersVisible: (visible) => set({ rulersVisible: visible }),
    setLeftTab: (tab) => set({ leftTab: tab }),
    setActiveTool: (tool) => set({ activeTool: tool }),

    setActiveArtboard: (id, focus = true) => {
      const doc = get().document();
      const ab = doc.artboards.find((a) => a.id === id);
      if (!ab) return;
      // Switching pages clears selection — each page is an independent design
      set({ activeArtboardId: id, selectedIds: [] });
      if (focus) {
        const vp = get().viewport;
        const scale = vp.scale;
        set({
          viewport: {
            ...vp,
            x: 100 - ab.x * scale,
            y: 80 - ab.y * scale,
          },
        });
      }
    },

    reorderArtboard: (id, direction) => {
      const doc = get().document();
      const idx = doc.artboards.findIndex((a) => a.id === id);
      if (idx < 0) return;
      const swap = direction === 'left' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= doc.artboards.length) return;
      const artboards = [...doc.artboards];
      const a = artboards[idx]!;
      const b = artboards[swap]!;
      artboards[idx] = b;
      artboards[swap] = a;
      // Keep visual left-to-right order: re-layout x positions
      let x = 80;
      const laid = artboards.map((ab) => {
        const next = { ...ab, x, y: 80 };
        x += ab.width + 80;
        return next;
      });
      get().commit({ ...doc, artboards: laid });
    },

    magicResize: (width, height) => {
      const doc = get().document();
      const abId = get().activeArtboardId ?? doc.artboards[0]?.id;
      const ab = doc.artboards.find((a) => a.id === abId) ?? doc.artboards[0];
      if (!ab || width < 32 || height < 32) return;
      const sx = width / ab.width;
      const sy = height / ab.height;
      const fallback = primaryArtboardId(doc);
      const scaleLayers = (layers: LayerNode[]): LayerNode[] =>
        layers.map((l) => {
          const onPage = layerArtboardId(l, fallback) === ab.id;
          if (!onPage) {
            return l.children?.length
              ? { ...l, children: scaleLayers(l.children) }
              : l;
          }
          const next: LayerNode = {
            ...l,
            transform: {
              ...l.transform,
              x: l.transform.x * sx,
              y: l.transform.y * sy,
              width: Math.max(1, l.transform.width * sx),
              height: Math.max(1, l.transform.height * sy),
            },
            textStyle: l.textStyle
              ? {
                  ...l.textStyle,
                  fontSize: Math.max(8, Math.round(l.textStyle.fontSize * Math.min(sx, sy))),
                }
              : l.textStyle,
          };
          if (l.children?.length) next.children = scaleLayers(l.children);
          return next;
        });
      let next = updateArtboard(doc, ab.id, { width, height });
      next = touchDocument({ ...next, layers: scaleLayers(next.layers) });
      get().commit(next);
    },

    addShape: (shape = 'rect', fill = '#0f766e') => {
      const name =
        shape === 'ellipse'
          ? 'Ellipse'
          : shape === 'triangle'
            ? 'Triangle'
            : shape === 'line'
              ? 'Line'
              : shape === 'polygon'
                ? 'Polygon'
                : shape === 'star'
                  ? 'Star'
                  : shape === 'arrow'
                    ? 'Arrow'
                    : 'Rectangle';
      const isLineLike = shape === 'line' || shape === 'arrow';
      const layer = stampLayerPage(
        createLayer({
          type: 'shape',
          name,
          shape,
          fill: isLineLike && shape === 'line' ? undefined : fill,
          stroke: isLineLike ? fill : undefined,
          strokeWidth: isLineLike ? 4 : 0,
          transform: {
            x: 200,
            y: 200,
            width: isLineLike ? 240 : shape === 'star' || shape === 'polygon' ? 180 : 200,
            height:
              shape === 'ellipse' || shape === 'star' || shape === 'polygon'
                ? 180
                : isLineLike
                  ? 16
                  : 160,
            rotation: shape === 'line' ? -25 : shape === 'arrow' ? 0 : 0,
            scaleX: 1,
            scaleY: 1,
          },
        }),
        activePageId(get),
      );
      get().commit(addLayer(get().document(), layer));
      set({ selectedIds: [layer.id] });
    },

    addText: (role = 'heading') => {
      const raw =
        role === 'heading'
          ? createHeadingLayer('Add a heading')
          : role === 'subheading'
            ? createSubheadingLayer('Add a subheading')
            : createBodyLayer(role === 'textbox' ? 'Text' : 'Add a little bit of body text');
      const layer = stampLayerPage(raw, activePageId(get));
      get().commit(addLayer(get().document(), layer));
      set({ selectedIds: [layer.id], leftTab: 'text' });
    },

    addStickyNote: () => {
      const note = stampLayerPage(
        createLayer({
          type: 'cta',
          name: 'Sticky note',
          text: 'Sticky note',
          fill: '#fef08a',
          textStyle: {
            fontFamily: 'Source Sans 3',
            fontSize: 16,
            fontWeight: 500,
            fill: '#0a1214',
            align: 'center',
            lineHeight: 1.3,
            letterSpacing: 0,
            role: 'body',
          },
          transform: {
            x: 220,
            y: 180,
            width: 180,
            height: 180,
            rotation: -2,
            scaleX: 1,
            scaleY: 1,
          },
        }),
        activePageId(get),
      );
      get().commit(addLayer(get().document(), note));
      set({ selectedIds: [note.id], leftTab: 'tools', activeTool: 'sticky' });
    },

    addLine: () => {
      get().addShape('line', '#0a1214');
      set({ activeTool: 'line' });
    },

    addTable: (rows = 3, cols = 3) => {
      const cellW = 90;
      const cellH = 48;
      const originX = 160;
      const originY = 160;
      const page = activePageId(get);
      let doc = get().document();
      const ids: string[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = stampLayerPage(
            createLayer({
              type: 'shape',
              name: `Cell ${r + 1}-${c + 1}`,
              shape: 'rect',
              fill: r === 0 ? '#e8eef0' : '#ffffff',
              stroke: '#a8c5ce',
              strokeWidth: 1,
              transform: {
                x: originX + c * cellW,
                y: originY + r * cellH,
                width: cellW,
                height: cellH,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
              },
            }),
            page,
          );
          doc = addLayer(doc, cell);
          ids.push(cell.id);
        }
      }
      get().commit(doc);
      set({ selectedIds: ids.slice(0, 1), activeTool: 'table' });
    },

    addSignaturePath: () => {
      const page = activePageId(get);
      const sig = stampLayerPage(
        createLayer({
          type: 'shape',
          name: 'Signature',
          shape: 'line',
          stroke: '#0a1214',
          strokeWidth: 3,
          transform: {
            x: 200,
            y: 360,
            width: 220,
            height: 6,
            rotation: -8,
            scaleX: 1,
            scaleY: 1,
          },
        }),
        page,
      );
      const flourish = stampLayerPage(
        createLayer({
          type: 'shape',
          name: 'Signature flourish',
          shape: 'line',
          stroke: '#0a1214',
          strokeWidth: 2,
          transform: {
            x: 260,
            y: 380,
            width: 100,
            height: 4,
            rotation: 18,
            scaleX: 1,
            scaleY: 1,
          },
        }),
        page,
      );
      let doc = addLayer(get().document(), sig);
      doc = addLayer(doc, flourish);
      get().commit(doc);
      set({ selectedIds: [sig.id], activeTool: 'signature' });
    },

    addChart: () => {
      const page = activePageId(get);
      const doc = get().document();
      const ox = 120;
      const oy = 280;
      const heights = [70, 120, 95, 150, 110];
      const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];
      let next = doc;
      const ids: string[] = [];
      const base = stampLayerPage(
        createLayer({
          type: 'shape',
          name: 'Chart base',
          shape: 'rect',
          fill: '#f4f7f8',
          stroke: '#d0dce1',
          strokeWidth: 1,
          transform: {
            x: ox - 24,
            y: oy - 170,
            width: heights.length * 52 + 48,
            height: 200,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          },
        }),
        page,
      );
      next = addLayer(next, base);
      ids.push(base.id);
      heights.forEach((h, i) => {
        const bar = stampLayerPage(
          createLayer({
            type: 'shape',
            name: `Bar ${i + 1}`,
            shape: 'rect',
            fill: colors[i],
            transform: {
              x: ox + i * 52,
              y: oy - h,
              width: 36,
              height: h,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
            },
          }),
          page,
        );
        next = addLayer(next, bar);
        ids.push(bar.id);
      });
      const title = stampLayerPage(createBodyLayer('Chart'), page);
      title.textStyle = {
        ...title.textStyle!,
        fontSize: 16,
        fontWeight: 700,
        fill: '#0a1214',
      };
      title.transform = {
        ...title.transform,
        x: ox - 8,
        y: oy - 200,
        width: 160,
        height: 28,
      };
      next = addLayer(next, title);
      get().commit(next);
      set({ selectedIds: [base.id] });
    },

    addSheet: () => {
      const page = activePageId(get);
      const rows = 4;
      const cols = 4;
      const cellW = 110;
      const cellH = 40;
      const doc = get().document();
      const originX = 100;
      const originY = 140;
      let next = doc;
      const headers = ['A', 'B', 'C', 'D'];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = stampLayerPage(
            createLayer({
              type: 'shape',
              name: `Sheet ${r + 1}-${c + 1}`,
              shape: 'rect',
              fill: r === 0 ? '#dcfce7' : '#ffffff',
              stroke: '#86efac',
              strokeWidth: 1,
              transform: {
                x: originX + c * cellW,
                y: originY + r * cellH,
                width: cellW,
                height: cellH,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
              },
            }),
            page,
          );
          next = addLayer(next, cell);
          if (r === 0) {
            const label = stampLayerPage(createBodyLayer(headers[c] ?? `Col ${c + 1}`), page);
            label.name = `Header ${headers[c]}`;
            label.textStyle = {
              ...label.textStyle!,
              fontSize: 14,
              fontWeight: 700,
              align: 'center',
              fill: '#14532d',
            };
            label.transform = {
              x: originX + c * cellW,
              y: originY + 8,
              width: cellW,
              height: 28,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
            };
            next = addLayer(next, label);
          } else if (c === 0) {
            const label = stampLayerPage(createBodyLayer(String(r)), page);
            label.name = `Row ${r}`;
            label.textStyle = {
              ...label.textStyle!,
              fontSize: 13,
              fontWeight: 600,
              align: 'center',
              fill: '#166534',
            };
            label.transform = {
              x: originX,
              y: originY + r * cellH + 8,
              width: cellW,
              height: 28,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
            };
            next = addLayer(next, label);
          }
        }
      }
      get().commit(next);
      set({ selectedIds: [] });
    },

    addMediaLayer: ({ name, src, kind, width, height }) => {
      const doc = get().document();
      const abId = get().activeArtboardId;
      const ab = doc.artboards.find((a) => a.id === abId) ?? doc.artboards[0];
      const maxW = (ab?.width ?? 1080) * 0.7;
      const maxH = (ab?.height ?? 1080) * 0.7;
      const iw = width ?? (kind === 'video' ? 640 : 400);
      const ih = height ?? (kind === 'video' ? 360 : 300);
      const scale = Math.min(1, maxW / iw, maxH / ih);
      const w = Math.round(iw * scale);
      const h = Math.round(ih * scale);
      const layer = stampLayerPage(
        createLayer({
          type: 'image',
          name,
          src,
          fill: kind === 'video' ? 'video' : undefined,
          transform: {
            x: Math.round(((ab?.width ?? 1080) - w) / 2),
            y: Math.round(((ab?.height ?? 1080) - h) / 2),
            width: w,
            height: h,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          },
        }),
        ab?.id ?? activePageId(get),
      );
      get().commit(addLayer(doc, layer));
      set({ selectedIds: [layer.id] });
    },

    addImagePlaceholder: () => {
      const layer = stampLayerPage(
        createLayer({
          type: 'image',
          name: 'Image',
          src: undefined,
          fill: '#d0dce1',
          transform: {
            x: 180,
            y: 180,
            width: 320,
            height: 240,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          },
        }),
        activePageId(get),
      );
      get().commit(addLayer(get().document(), layer));
      set({ selectedIds: [layer.id] });
    },

    addArtboard: (width = 1080, height = 1080) => {
      const doc = get().document();
      const last = doc.artboards[doc.artboards.length - 1];
      const x = last ? last.x + last.width + 80 : 80;
      const y = last?.y ?? 80;
      const pageNum = doc.artboards.length + 1;
      const ab = createArtboard(`Page ${pageNum}`, width, height, x, y);
      // New page starts empty — designs are independent per page
      get().commit({ ...doc, artboards: [...doc.artboards, ab] });
      set({
        activeArtboardId: ab.id,
        selectedIds: [],
        viewport: {
          ...get().viewport,
          x: 100 - ab.x * get().viewport.scale,
          y: 80 - ab.y * get().viewport.scale,
        },
      });
    },

    duplicateActivePage: () => {
      const doc = get().document();
      const srcId = activePageId(get);
      const src = doc.artboards.find((a) => a.id === srcId);
      if (!src) return;
      const last = doc.artboards[doc.artboards.length - 1]!;
      const ab = createArtboard(
        `${src.name} copy`,
        src.width,
        src.height,
        last.x + last.width + 80,
        last.y,
      );
      ab.background = src.background;
      const pageLayers = layersForArtboard(doc.layers, src.id, primaryArtboardId(doc));
      const clones = cloneLayersForPage(pageLayers, ab.id, () => createId('layer'));
      get().commit({
        ...doc,
        artboards: [...doc.artboards, ab],
        layers: [...doc.layers, ...clones],
      });
      set({
        activeArtboardId: ab.id,
        selectedIds: [],
        viewport: {
          ...get().viewport,
          x: 100 - ab.x * get().viewport.scale,
          y: 80 - ab.y * get().viewport.scale,
        },
      });
    },

    deleteActivePage: () => {
      const doc = get().document();
      if (doc.artboards.length <= 1) return;
      const srcId = activePageId(get);
      if (!srcId) return;
      const fallback = primaryArtboardId(doc);
      const artboards = doc.artboards.filter((a) => a.id !== srcId);
      const layers = doc.layers.filter(
        (l) => layerArtboardId(l, fallback) !== srcId,
      );
      // Re-layout remaining pages left-to-right
      let x = 80;
      const laid = artboards.map((ab) => {
        const next = { ...ab, x, y: 80 };
        x += ab.width + 80;
        return next;
      });
      const nextActive = laid[0]?.id ?? null;
      get().commit({ ...doc, artboards: laid, layers });
      set({
        activeArtboardId: nextActive,
        selectedIds: [],
      });
      if (nextActive) {
        const ab = laid.find((a) => a.id === nextActive);
        if (ab) {
          const vp = get().viewport;
          set({
            viewport: {
              ...vp,
              x: 100 - ab.x * vp.scale,
              y: 80 - ab.y * vp.scale,
            },
          });
        }
      }
    },

    setVisibility: (id, visible) => get().commit(setLayerVisibility(get().document(), id, visible)),
    setLocked: (id, locked) => get().commit(setLayerLocked(get().document(), id, locked)),
    rename: (id, name) => get().commit(renameLayer(get().document(), id, name)),
    renameDocument: (name) => {
      const doc = get().document();
      const nextName = name.trim() || 'Untitled Design';
      if (doc.meta.name === nextName) return;
      get().commit({
        ...doc,
        meta: { ...doc.meta, name: nextName, updatedAt: new Date().toISOString() },
      });
    },
    setOpacity: (id, opacity) => get().commit(setLayerOpacity(get().document(), id, opacity)),
    setBlend: (id, blend) => get().commit(setLayerBlendMode(get().document(), id, blend)),
    duplicate: (id) => get().commit(duplicateLayerCmd(get().document(), id)),
    remove: (id) => {
      const next = deleteLayer(get().document(), id);
      set((s) => {
        const stillExists = next.artboards.some((ab) => ab.id === s.activeArtboardId);
        return {
          history: pushHistory(s.history, next),
          selectedIds: s.selectedIds.filter((x) => x !== id),
          activeArtboardId: stillExists
            ? s.activeArtboardId
            : (next.artboards[0]?.id ?? null),
        };
      });
    },
    removeSelected: () => {
      const { selectedIds } = get();
      if (!selectedIds.length) return;
      let doc = get().document();
      for (const id of selectedIds) {
        const layer = findLayer(doc.layers, id);
        if (layer?.locked) continue;
        doc = deleteLayer(doc, id);
      }
      set((s) => ({
        history: pushHistory(s.history, doc),
        selectedIds: [],
      }));
    },
    reorder: (fromIndex, toIndex) => get().commit(reorderLayers(get().document(), fromIndex, toIndex)),
    reorderPageLayers: (orderedIds) =>
      get().commit(reorderLayersByIds(get().document(), orderedIds)),
    arrangeLayer: (id, move, siblingIds) =>
      get().commit(arrangeLayerCmd(get().document(), id, move, siblingIds)),
    group: (ids) => get().commit(groupSelected(get().document(), ids)),
    ungroup: (groupId) => get().commit(ungroup(get().document(), groupId)),
    updateTransform: (id, transform) =>
      get().commit(updateLayerTransform(get().document(), id, transform)),

    updateTextStyle: (id, patch, effects) => {
      const doc = get().document();
      const next = touchDocument({
        ...doc,
        layers: updateLayer(doc.layers, id, (l) => {
          if (l.type !== 'text' && l.type !== 'cta') return l;
          const textStyle: TextStyle = {
            fontFamily: 'Source Sans 3',
            fontSize: 24,
            fontWeight: 500,
            fill: '#0a1214',
            align: 'left',
            lineHeight: 1.3,
            letterSpacing: 0,
            ...l.textStyle,
            ...patch,
            effects: {
              ...l.textStyle?.effects,
              ...effects,
            },
          };
          return { ...l, textStyle };
        }),
      });
      get().commit(next);
    },

    updateTextContent: (id, text) => {
      const isNewSession = textDebounceId !== id || textDebounce === null;
      if (textDebounce) clearTimeout(textDebounce);

      set((s) => {
        const nextPresent = setLayerText(s.history.present, id, text);
        if (isNewSession) {
          return {
            history: {
              past: [...s.history.past, s.history.present].slice(-100),
              present: nextPresent,
              future: [],
            },
          };
        }
        return {
          history: {
            ...s.history,
            present: nextPresent,
            future: [],
          },
        };
      });

      textDebounceId = id;
      textDebounce = setTimeout(() => {
        textDebounce = null;
        textDebounceId = null;
      }, 500);
    },

    updateLayerProps: (id, patch) => {
      const doc = get().document();
      const next = touchDocument({
        ...doc,
        layers: updateLayer(doc.layers, id, (l) => ({ ...l, ...patch })),
      });
      get().commit(next);
    },

    setFill: (id, fill) => get().commit(setLayerFill(get().document(), id, fill)),
    updateArtboard: (id, patch) => get().commit(updateArtboard(get().document(), id, patch)),

    alignSelected: (mode) => {
      const doc = get().document();
      const abId = get().activeArtboardId;
      const ab = doc.artboards.find((a) => a.id === abId) ?? doc.artboards[0];
      if (!ab) return;
      const ids = get().selectedIds;
      if (!ids.length) return;
      const layers = doc.layers.filter((l) => ids.includes(l.id) && !l.locked);
      if (!layers.length) return;

      let next = doc;
      for (const l of layers) {
        const t = l.transform;
        let x = t.x;
        let y = t.y;
        if (mode === 'left') x = 0;
        if (mode === 'center') x = (ab.width - t.width) / 2;
        if (mode === 'right') x = ab.width - t.width;
        if (mode === 'top') y = 0;
        if (mode === 'middle') y = (ab.height - t.height) / 2;
        if (mode === 'bottom') y = ab.height - t.height;
        next = updateLayerTransform(next, l.id, { x, y });
      }
      get().commit(next);
    },

    distributeSelected: (axis) => {
      const doc = get().document();
      const ids = get().selectedIds;
      const layers = doc.layers
        .filter((l) => ids.includes(l.id) && !l.locked)
        .sort((a, b) =>
          axis === 'horizontal'
            ? a.transform.x - b.transform.x
            : a.transform.y - b.transform.y,
        );
      if (layers.length < 3) return;

      const first = layers[0]!;
      const last = layers[layers.length - 1]!;
      const span =
        axis === 'horizontal'
          ? last.transform.x - first.transform.x
          : last.transform.y - first.transform.y;
      const step = span / (layers.length - 1);

      let next = doc;
      layers.forEach((l, i) => {
        if (i === 0 || i === layers.length - 1) return;
        const pos =
          axis === 'horizontal'
            ? { x: first.transform.x + step * i }
            : { y: first.transform.y + step * i };
        next = updateLayerTransform(next, l.id, pos);
      });
      get().commit(next);
    },

    copySelected: () => {
      const doc = get().document();
      const ids = get().selectedIds;
      const layers = ids
        .map((id) => findLayer(doc.layers, id))
        .filter((l): l is LayerNode => Boolean(l));
      if (!layers.length) return;
      // Deep-ish clone for clipboard (fresh copies on paste via duplicateLayer)
      set({
        clipboard: layers.map((l) => JSON.parse(JSON.stringify(l)) as LayerNode),
      });
    },

    pasteClipboard: () => {
      const clips = get().clipboard;
      if (!clips?.length) return;
      const page = activePageId(get);
      let doc = get().document();
      const newIds: string[] = [];
      for (const clip of clips) {
        const clone = stampLayerPage(duplicateLayer(clip), page);
        clone.artboardId = page;
        clone.transform = {
          ...clone.transform,
          x: clip.transform.x + 24,
          y: clip.transform.y + 24,
        };
        doc = addLayer(doc, clone);
        newIds.push(clone.id);
      }
      get().commit(doc);
      set({ selectedIds: newIds });
    },

    duplicateSelected: () => {
      const ids = [...get().selectedIds];
      if (!ids.length) return;
      let doc = get().document();
      const newIds: string[] = [];
      for (const id of ids) {
        const layer = findLayer(doc.layers, id);
        if (!layer || layer.locked) continue;
        const clone = duplicateLayer(layer);
        doc = addLayer(doc, clone);
        newIds.push(clone.id);
      }
      get().commit(doc);
      if (newIds.length) set({ selectedIds: newIds });
    },

    nudgeSelected: (dx, dy) => {
      const ids = get().selectedIds;
      if (!ids.length) return;
      let doc = get().document();
      for (const id of ids) {
        const layer = findLayer(doc.layers, id);
        if (!layer || layer.locked) continue;
        doc = updateLayerTransform(doc, id, {
          x: layer.transform.x + dx,
          y: layer.transform.y + dy,
        });
      }
      get().commit(doc);
    },

    selectAll: () => {
      const doc = get().document();
      const page = activePageId(get);
      const pageLayers = layersForArtboard(doc.layers, page, primaryArtboardId(doc));
      set({ selectedIds: pageLayers.map((l) => l.id) });
    },

    groupSelectedIds: () => {
      const ids = get().selectedIds;
      if (ids.length < 2) return;
      get().commit(groupSelected(get().document(), ids));
    },

    ungroupSelected: () => {
      const doc = get().document();
      const ids = get().selectedIds;
      let next = doc;
      let changed = false;
      for (const id of ids) {
        const layer = findLayer(next.layers, id);
        if (layer?.type === 'group') {
          next = ungroup(next, id);
          changed = true;
        }
      }
      if (changed) {
        get().commit(next);
        set({ selectedIds: [] });
      }
    },

    applyBrand: (brand) =>
      get().commit(applyBrandKit(get().document(), brand, get().activeArtboardId ?? undefined)),

    placeBrandLogo: (src) => {
      if (!src) return;
      const doc = get().document();
      const abId = activePageId(get);
      const ab = doc.artboards.find((a) => a.id === abId) ?? doc.artboards[0];
      const existing = flattenLayers(doc.layers).find(
        (l) => l.name === 'Brand Logo' && (l.artboardId ?? primaryArtboardId(doc)) === abId,
      );
      if (existing) {
        get().updateLayerProps(existing.id, { src, crop: undefined, type: 'image' });
        set({ selectedIds: [existing.id] });
        return;
      }
      const size = Math.min(180, Math.round((ab?.width ?? 1080) * 0.18));
      const layer = stampLayerPage(
        createLayer({
          type: 'image',
          name: 'Brand Logo',
          src,
          imageMask: 'rounded',
          transform: {
            x: 40,
            y: 40,
            width: size,
            height: size,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          },
        }),
        abId,
      );
      get().commit(addLayer(doc, layer));
      set({ selectedIds: [layer.id] });
    },
  };
});
