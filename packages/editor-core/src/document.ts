import { createId } from '@sn-editor/shared';
import type { Artboard, DesignDocument, LayerNode } from './types';
import { DEFAULT_TRANSFORM } from './types';

/** Create an empty design with one artboard. */
export function createEmptyDocument(name = 'Untitled Design'): DesignDocument {
  const now = new Date().toISOString();
  const artboard = createArtboard('Artboard 1', 1080, 1080);
  return {
    id: createId('doc'),
    version: 1,
    artboards: [artboard],
    layers: [],
    assets: [],
    guides: [],
    meta: { name, createdAt: now, updatedAt: now },
  };
}

export function createArtboard(
  name: string,
  width: number,
  height: number,
  x = 0,
  y = 0,
): Artboard {
  return {
    id: createId('ab'),
    name,
    width,
    height,
    x,
    y,
    background: '#ffffff',
  };
}

export function createLayer(
  partial: Partial<LayerNode> & Pick<LayerNode, 'type' | 'name'>,
): LayerNode {
  return {
    id: createId('layer'),
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    transform: DEFAULT_TRANSFORM(),
    ...partial,
  };
}

export function touchDocument(doc: DesignDocument): DesignDocument {
  return {
    ...doc,
    version: doc.version + 1,
    meta: { ...doc.meta, updatedAt: new Date().toISOString() },
  };
}
