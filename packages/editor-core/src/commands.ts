import type { BlendMode, DesignDocument, LayerNode } from './types';
import { touchDocument } from './document';
import {
  duplicateLayer,
  groupLayers,
  removeLayer,
  arrangeLayerAmongPeers,
  reorderRootLayers,
  reorderSiblingIds,
  ungroupLayer,
  updateLayer,
  type LayerStackMove,
} from './layers';

/** Named document mutations used by the Zustand store. */

export function setLayerVisibility(
  doc: DesignDocument,
  id: string,
  visible: boolean,
): DesignDocument {
  return touchDocument({
    ...doc,
    layers: updateLayer(doc.layers, id, (l) => ({ ...l, visible })),
  });
}

export function setLayerLocked(doc: DesignDocument, id: string, locked: boolean): DesignDocument {
  return touchDocument({
    ...doc,
    layers: updateLayer(doc.layers, id, (l) => ({ ...l, locked })),
  });
}

export function renameLayer(doc: DesignDocument, id: string, name: string): DesignDocument {
  return touchDocument({
    ...doc,
    layers: updateLayer(doc.layers, id, (l) => ({ ...l, name })),
  });
}

export function setLayerOpacity(doc: DesignDocument, id: string, opacity: number): DesignDocument {
  return touchDocument({
    ...doc,
    layers: updateLayer(doc.layers, id, (l) => ({
      ...l,
      opacity: Math.min(1, Math.max(0, opacity)),
    })),
  });
}

export function setLayerBlendMode(
  doc: DesignDocument,
  id: string,
  blendMode: BlendMode,
): DesignDocument {
  return touchDocument({
    ...doc,
    layers: updateLayer(doc.layers, id, (l) => ({ ...l, blendMode })),
  });
}

export function setLayerFill(doc: DesignDocument, id: string, fill: string): DesignDocument {
  return touchDocument({
    ...doc,
    layers: updateLayer(doc.layers, id, (l) => {
      if (l.type === 'text' || l.type === 'cta') {
        return {
          ...l,
          fill,
          textStyle: {
            fontFamily: 'Source Sans 3',
            fontSize: 24,
            fontWeight: 500,
            align: 'left' as const,
            lineHeight: 1.3,
            letterSpacing: 0,
            ...l.textStyle,
            fill,
          },
        };
      }
      const isLineLike = l.shape === 'line' || l.shape === 'arrow';
      if (isLineLike) {
        return {
          ...l,
          fill,
          stroke: fill,
          strokeWidth: Math.max(l.strokeWidth ?? 4, 2),
          shapeGradient: undefined,
        };
      }
      // Solid fill always wins — clear gradient so the new color is visible
      return { ...l, fill, shapeGradient: undefined };
    }),
  });
}

export function setLayerText(doc: DesignDocument, id: string, text: string): DesignDocument {
  return touchDocument({
    ...doc,
    layers: updateLayer(doc.layers, id, (l) => ({
      ...l,
      text,
      name: text.slice(0, 32) || l.name,
    })),
  });
}

export function updateArtboard(
  doc: DesignDocument,
  id: string,
  patch: Partial<{ x: number; y: number; width: number; height: number; background: string; name: string }>,
): DesignDocument {
  return touchDocument({
    ...doc,
    artboards: doc.artboards.map((ab) => (ab.id === id ? { ...ab, ...patch } : ab)),
  });
}

export function addLayer(doc: DesignDocument, layer: LayerNode): DesignDocument {
  return touchDocument({ ...doc, layers: [...doc.layers, layer] });
}

export function deleteLayer(doc: DesignDocument, id: string): DesignDocument {
  return touchDocument({ ...doc, layers: removeLayer(doc.layers, id) });
}

export function duplicateLayerCmd(doc: DesignDocument, id: string): DesignDocument {
  const walk = (layers: LayerNode[]): LayerNode[] => {
    const out: LayerNode[] = [];
    for (const l of layers) {
      out.push(l);
      if (l.id === id) out.push(duplicateLayer(l));
      else if (l.children) out[out.length - 1] = { ...l, children: walk(l.children) };
    }
    return out;
  };
  return touchDocument({ ...doc, layers: walk(doc.layers) });
}

export function reorderLayers(
  doc: DesignDocument,
  fromIndex: number,
  toIndex: number,
): DesignDocument {
  return touchDocument({
    ...doc,
    layers: reorderRootLayers(doc.layers, fromIndex, toIndex),
  });
}

/** Persist a new back-to-front order for a sibling set (one page or one group). */
export function reorderLayersByIds(doc: DesignDocument, orderedIds: string[]): DesignDocument {
  if (orderedIds.length < 2) return doc;
  return touchDocument({
    ...doc,
    layers: reorderSiblingIds(doc.layers, orderedIds),
  });
}

export function arrangeLayer(
  doc: DesignDocument,
  id: string,
  move: LayerStackMove,
  siblingIds?: string[],
): DesignDocument {
  return touchDocument({
    ...doc,
    layers: arrangeLayerAmongPeers(doc.layers, id, move, siblingIds),
  });
}

export function groupSelected(
  doc: DesignDocument,
  ids: string[],
  name?: string,
): DesignDocument {
  return touchDocument({ ...doc, layers: groupLayers(doc.layers, ids, name) });
}

export function ungroup(doc: DesignDocument, groupId: string): DesignDocument {
  return touchDocument({ ...doc, layers: ungroupLayer(doc.layers, groupId) });
}

export function updateLayerTransform(
  doc: DesignDocument,
  id: string,
  transform: Partial<LayerNode['transform']>,
): DesignDocument {
  return touchDocument({
    ...doc,
    layers: updateLayer(doc.layers, id, (l) => ({
      ...l,
      transform: { ...l.transform, ...transform },
    })),
  });
}
