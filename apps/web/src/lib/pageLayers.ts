/**
 * Helpers for per-page (artboard) independent layer ownership.
 */
import type { DesignDocument, LayerNode } from '@sn-editor/editor-core';

export function primaryArtboardId(doc: DesignDocument): string | undefined {
  return doc.artboards[0]?.id;
}

export function layerArtboardId(layer: LayerNode, fallbackId?: string): string | undefined {
  return layer.artboardId ?? fallbackId;
}

export function layersForArtboard(
  layers: LayerNode[],
  artboardId: string | null | undefined,
  fallbackId?: string,
): LayerNode[] {
  if (!artboardId && !fallbackId) return layers;
  const page = artboardId ?? fallbackId;
  return layers.filter((l) => layerArtboardId(l, fallbackId) === page);
}

/** Stamp missing artboardId onto every layer (and nested children). */
export function ensureLayerPages(doc: DesignDocument): DesignDocument {
  const fallback = primaryArtboardId(doc);
  if (!fallback) return doc;

  const stamp = (layers: LayerNode[]): LayerNode[] =>
    layers.map((l) => ({
      ...l,
      artboardId: l.artboardId ?? fallback,
      children: l.children?.length ? stamp(l.children) : l.children,
    }));

  return { ...doc, layers: stamp(doc.layers) };
}

export function stampLayerPage(layer: LayerNode, artboardId: string | null | undefined): LayerNode {
  if (!artboardId) return layer;
  const stamp = (l: LayerNode): LayerNode => ({
    ...l,
    artboardId: l.artboardId ?? artboardId,
    children: l.children?.length ? l.children.map(stamp) : l.children,
  });
  return stamp(layer);
}

export function cloneLayersForPage(
  layers: LayerNode[],
  newArtboardId: string,
  idFactory: () => string,
): LayerNode[] {
  const clone = (l: LayerNode): LayerNode => ({
    ...l,
    id: idFactory(),
    artboardId: newArtboardId,
    children: l.children?.length ? l.children.map(clone) : undefined,
  });
  return layers.map(clone);
}
