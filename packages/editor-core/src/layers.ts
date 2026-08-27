import type { LayerNode } from './types';

/** Walk the layer tree; returns shallow-cloned path updates when mutating. */

export function findLayer(layers: LayerNode[], id: string): LayerNode | undefined {
  for (const layer of layers) {
    if (layer.id === id) return layer;
    if (layer.children) {
      const found = findLayer(layer.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

export function mapLayers(
  layers: LayerNode[],
  fn: (layer: LayerNode) => LayerNode,
): LayerNode[] {
  return layers.map((layer) => {
    const next = fn(layer);
    if (next.children) {
      return { ...next, children: mapLayers(next.children, fn) };
    }
    return next;
  });
}

export function updateLayer(
  layers: LayerNode[],
  id: string,
  updater: (layer: LayerNode) => LayerNode,
): LayerNode[] {
  return layers.map((layer) => {
    if (layer.id === id) return updater(layer);
    if (layer.children) {
      return { ...layer, children: updateLayer(layer.children, id, updater) };
    }
    return layer;
  });
}

export function removeLayer(layers: LayerNode[], id: string): LayerNode[] {
  return layers
    .filter((l) => l.id !== id)
    .map((l) =>
      l.children ? { ...l, children: removeLayer(l.children, id) } : l,
    );
}

export function duplicateLayer(layer: LayerNode): LayerNode {
  const clone: LayerNode = {
    ...layer,
    id: `${layer.id}_copy_${Math.random().toString(36).slice(2, 7)}`,
    name: `${layer.name} Copy`,
    transform: { ...layer.transform, x: layer.transform.x + 20, y: layer.transform.y + 20 },
  };
  if (layer.children) {
    clone.children = layer.children.map(duplicateLayer);
  }
  return clone;
}

/** Flatten tree to a list for DND reorder at root level helpers. */
export function flattenLayers(layers: LayerNode[]): LayerNode[] {
  const out: LayerNode[] = [];
  const walk = (nodes: LayerNode[]) => {
    for (const n of nodes) {
      out.push(n);
      if (n.children) walk(n.children);
    }
  };
  walk(layers);
  return out;
}

export function reorderRootLayers(
  layers: LayerNode[],
  fromIndex: number,
  toIndex: number,
): LayerNode[] {
  const next = [...layers];
  const [item] = next.splice(fromIndex, 1);
  if (!item) return layers;
  next.splice(toIndex, 0, item);
  return next;
}

/** Later index = in front on the canvas. */
export type LayerStackMove = 'front' | 'back' | 'forward' | 'backward';

/**
 * Reorder a known sibling set (e.g. one page) in place.
 * `orderedIds` is the new back-to-front document order for those ids.
 * Other layers keep their slots so multi-page documents stay intact.
 */
export function reorderSiblingIds(layers: LayerNode[], orderedIds: string[]): LayerNode[] {
  const idSet = new Set(orderedIds);
  const byId = new Map(layers.filter((l) => idSet.has(l.id)).map((l) => [l.id, l]));
  if (byId.size !== orderedIds.length) {
    return layers.map((l) =>
      l.children ? { ...l, children: reorderSiblingIds(l.children, orderedIds) } : l,
    );
  }
  let i = 0;
  return layers.map((l) => {
    if (!idSet.has(l.id)) return l;
    const next = byId.get(orderedIds[i++]);
    return next ?? l;
  });
}

function moveIdInOrder(ids: string[], id: string, move: LayerStackMove): string[] {
  const index = ids.indexOf(id);
  if (index < 0) return ids;
  const next = [...ids];
  next.splice(index, 1);
  if (move === 'front') next.push(id);
  else if (move === 'back') next.unshift(id);
  else if (move === 'forward') next.splice(Math.min(index + 1, next.length), 0, id);
  else next.splice(Math.max(index - 1, 0), 0, id);
  return next;
}

function inferPeerIds(layers: LayerNode[], id: string): string[] {
  const target = layers.find((l) => l.id === id);
  if (!target) return [];
  const pageId = target.artboardId;
  return layers.filter((l) => (l.artboardId ?? pageId) === pageId).map((l) => l.id);
}

/** Bring / send a layer among same-page (or same-group) siblings. */
export function arrangeLayerAmongPeers(
  layers: LayerNode[],
  id: string,
  move: LayerStackMove,
  siblingIds?: string[],
): LayerNode[] {
  const peers = siblingIds?.length ? siblingIds : inferPeerIds(layers, id);
  if (!peers.includes(id)) {
    return layers.map((l) =>
      l.children
        ? { ...l, children: arrangeLayerAmongPeers(l.children, id, move, siblingIds) }
        : l,
    );
  }
  return reorderSiblingIds(layers, moveIdInOrder(peers, id, move));
}

export function groupLayers(layers: LayerNode[], ids: string[], groupName = 'Group'): LayerNode[] {
  const selected = layers.filter((l) => ids.includes(l.id));
  if (selected.length < 2) return layers;
  const rest = layers.filter((l) => !ids.includes(l.id));
  const group: LayerNode = {
    id: `group_${Date.now()}`,
    name: groupName,
    type: 'group',
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    transform: { x: 0, y: 0, width: 0, height: 0, rotation: 0, scaleX: 1, scaleY: 1 },
    children: selected,
  };
  return [...rest, group];
}

export function ungroupLayer(layers: LayerNode[], groupId: string): LayerNode[] {
  const result: LayerNode[] = [];
  for (const layer of layers) {
    if (layer.id === groupId && layer.type === 'group' && layer.children) {
      result.push(...layer.children);
    } else if (layer.children) {
      result.push({ ...layer, children: ungroupLayer(layer.children, groupId) });
    } else {
      result.push(layer);
    }
  }
  return result;
}
