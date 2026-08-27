/**
 * Client-side Product Center + AI image tool effects.
 * Applies visible canvas changes immediately (GPU workers can replace later).
 */
'use client';

import {
  createLayer,
  touchDocument,
  type DesignDocument,
  type LayerNode,
} from '@sn-editor/editor-core';
import { ImageAiTool, type ImageAiToolId } from '@sn-editor/ai-contracts';
import type { ProductScene, ProductType } from '@sn-editor/shared';
import {
  REPLACE_BG_SCENES,
  addImageDropShadow,
  applyCanvasFilter,
  eraseCenterSoft,
  expandImageEdges,
  removeImageBackground,
  replaceImageBackground,
  smartCropImage,
  tintImage,
  upscaleImage,
  type ReplaceBgStyle,
} from '@/lib/imageLayerEffects';

export const SCENE_LOOK: Record<
  ProductScene,
  { background: string; accent: string; ink: string; label: string }
> = {
  luxury: { background: '#1a1410', accent: '#c9a227', ink: '#f5e6c8', label: 'Luxury' },
  white: { background: '#ffffff', accent: '#e2e8f0', ink: '#0f172a', label: 'White' },
  transparent: { background: '#e8eef1', accent: '#94a3b8', ink: '#0a1214', label: 'Transparent' },
  wood_table: { background: '#6b4423', accent: '#d4a574', ink: '#fff7ed', label: 'Wood Table' },
  studio: { background: '#e8eaed', accent: '#64748b', ink: '#0f172a', label: 'Studio' },
  kitchen: { background: '#fef3c7', accent: '#b45309', ink: '#422006', label: 'Kitchen' },
  beach: { background: '#7dd3fc', accent: '#fef08a', ink: '#0c4a6e', label: 'Beach' },
  dark_theme: { background: '#0a1214', accent: '#14b8a6', ink: '#f4f7f8', label: 'Dark' },
  christmas: { background: '#14532d', accent: '#ef4444', ink: '#fef2f2', label: 'Christmas' },
  eid: { background: '#0f3d2e', accent: '#fbbf24', ink: '#ecfdf5', label: 'Eid' },
  black_friday: { background: '#09090b', accent: '#f59e0b', ink: '#fafafa', label: 'Black Friday' },
};

const PRODUCT_PLACEHOLDER: Record<ProductType, string> = {
  bottle: productSvg('Bottle', '#0f766e'),
  shoe: productSvg('Shoe', '#1e3a5f'),
  phone: productSvg('Phone', '#111827'),
  watch: productSvg('Watch', '#78350f'),
};

function productSvg(label: string, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 400" fill="none">
    <rect width="320" height="400" rx="28" fill="${color}"/>
    <rect x="70" y="60" width="180" height="240" rx="20" fill="rgba(255,255,255,0.18)"/>
    <circle cx="160" cy="160" r="48" fill="rgba(255,255,255,0.25)"/>
    <text x="160" y="340" text-anchor="middle" font-family="system-ui,sans-serif" font-size="28" font-weight="700" fill="#fff">${label}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function mapLayers(layers: LayerNode[], fn: (l: LayerNode) => LayerNode): LayerNode[] {
  return layers.map((l) => {
    const next = fn(l);
    if (next.children?.length) return { ...next, children: mapLayers(next.children, fn) };
    return next;
  });
}

function findLayer(layers: LayerNode[], id?: string): LayerNode | undefined {
  if (!id) return undefined;
  for (const l of layers) {
    if (l.id === id) return l;
    if (l.children) {
      const found = findLayer(l.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

function isImageLayer(l?: LayerNode | null): l is LayerNode {
  return Boolean(l && (l.type === 'image' || l.type === 'sticker') && l.src);
}

function findImageLayers(layers: LayerNode[]): LayerNode[] {
  const out: LayerNode[] = [];
  const walk = (list: LayerNode[]) => {
    for (const l of list) {
      if (isImageLayer(l)) out.push(l);
      if (l.children) walk(l.children);
    }
  };
  walk(layers);
  return out;
}

/** Prefer selected image; otherwise largest visible image (not tiny logos). */
function resolveTargetImage(doc: DesignDocument, selectedId?: string): LayerNode | undefined {
  const selected = findLayer(doc.layers, selectedId);
  if (isImageLayer(selected)) return selected;
  const images = findImageLayers(doc.layers).filter((l) => l.visible);
  if (!images.length) return undefined;
  return [...images].sort(
    (a, b) =>
      b.transform.width * b.transform.height - a.transform.width * a.transform.height,
  )[0];
}

function sourceForEdit(layer: LayerNode): string {
  return layer.originalSrc || layer.src || '';
}

function patchLayerSrc(
  doc: DesignDocument,
  layerId: string,
  src: string,
  transformPatch?: Partial<LayerNode['transform']>,
): DesignDocument {
  return touchDocument({
    ...doc,
    layers: mapLayers(doc.layers, (l) =>
      l.id === layerId
        ? {
            ...l,
            originalSrc: l.originalSrc || l.src,
            src,
            transform: transformPatch ? { ...l.transform, ...transformPatch } : l.transform,
          }
        : l,
    ),
  });
}

/**
 * Apply a one-click product scene: background + product placeholder + text restyle.
 */
export function applyProductSceneToDocument(
  doc: DesignDocument,
  scene: ProductScene,
  productType: ProductType,
): DesignDocument {
  const look = SCENE_LOOK[scene];
  const ab = doc.artboards[0];
  if (!ab) return doc;

  const artboards = doc.artboards.map((board, i) =>
    i === 0 ? { ...board, background: look.background } : board,
  );

  let layers = mapLayers(doc.layers, (l) => {
    if (l.type === 'text' && l.textStyle) {
      const isSub = l.textStyle.role === 'subheading' || l.name.toLowerCase().includes('sub');
      return {
        ...l,
        textStyle: {
          ...l.textStyle,
          fill: isSub ? look.accent : look.ink,
        },
      };
    }
    if (l.type === 'shape' && /accent|bar|line/i.test(l.name)) {
      return { ...l, fill: look.accent };
    }
    if (l.type === 'cta') {
      return {
        ...l,
        fill: look.accent,
        textStyle: {
          fontFamily: 'Source Sans 3',
          fontSize: 20,
          fontWeight: 600,
          align: 'center' as const,
          lineHeight: 1,
          letterSpacing: 0,
          ...l.textStyle,
          fill: look.background === '#ffffff' || look.background === '#e8eaed' ? look.ink : '#ffffff',
        },
      };
    }
    return l;
  });

  const productName = 'Product Shot';
  const existing = layers.find((l) => l.name === productName);
  const productLayer = createLayer({
    type: 'image',
    name: productName,
    src: PRODUCT_PLACEHOLDER[productType],
    transform: {
      x: Math.round(ab.width * 0.28),
      y: Math.round(ab.height * 0.22),
      width: Math.round(ab.width * 0.44),
      height: Math.round(ab.height * 0.55),
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    },
  });

  if (existing) {
    layers = mapLayers(layers, (l) =>
      l.name === productName
        ? {
            ...l,
            src: productLayer.src,
            visible: true,
            transform: { ...l.transform, ...productLayer.transform },
          }
        : l,
    );
  } else {
    layers = [productLayer, ...layers];
  }

  const chipName = 'Scene Label';
  const chip = createLayer({
    type: 'text',
    name: chipName,
    text: `${look.label} · ${productType}`,
    textStyle: {
      fontFamily: 'Source Sans 3',
      fontSize: 18,
      fontWeight: 700,
      fill: look.ink,
      align: 'left',
      lineHeight: 1.2,
      letterSpacing: 0.5,
    },
    transform: {
      x: 32,
      y: ab.height - 48,
      width: 360,
      height: 28,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    },
  });
  layers = layers.filter((l) => l.name !== chipName);
  layers.push(chip);

  return touchDocument({ ...doc, artboards, layers });
}

export interface AiEffectResult {
  document: DesignDocument;
  message: string;
}

export async function applyReplaceBackgroundToLayer(
  doc: DesignDocument,
  layerId: string,
  scene: ReplaceBgStyle | { color: string; label: string },
  onProgress?: (message: string) => void,
): Promise<AiEffectResult> {
  const target = findLayer(doc.layers, layerId);
  if (!isImageLayer(target)) {
    return { document: doc, message: 'Select an image first' };
  }
  const style: ReplaceBgStyle = {
    id: 'id' in scene ? scene.id : 'custom',
    label: scene.label,
    color: scene.color,
    accent: 'accent' in scene ? scene.accent : scene.color,
  };
  const src = await replaceImageBackground(sourceForEdit(target), style, onProgress);
  return {
    document: patchLayerSrc(doc, target.id, src),
    message: `Replaced background on “${target.name}” → ${style.label}`,
  };
}

/**
 * Apply a visible client-side AI effect. Image tools process the selected
 * (or topmost) image layer pixels and write a new PNG blob URL to `layer.src`.
 */
export async function applyImageAiEffect(
  doc: DesignDocument,
  tool: ImageAiToolId,
  selectedId?: string,
  onProgress?: (message: string) => void,
): Promise<AiEffectResult> {
  const ab = doc.artboards[0];
  if (!ab) return { document: doc, message: 'No artboard' };

  const selected = findLayer(doc.layers, selectedId);
  const targetImage = resolveTargetImage(doc, selectedId);

  switch (tool) {
    case ImageAiTool.RemoveBackground: {
      if (!targetImage?.src) {
        return { document: doc, message: 'Select or upload an image layer first' };
      }

      const source = sourceForEdit(targetImage);
      const src = await removeImageBackground(source, onProgress);

      return {
        document: patchLayerSrc(doc, targetImage.id, src),
        message: `Background removed from “${targetImage.name}”`,
      };
    }

    case ImageAiTool.ReplaceBackground: {
      if (!targetImage?.src) {
        return { document: doc, message: 'Select or upload an image layer first' };
      }
      const scene = REPLACE_BG_SCENES[doc.version % REPLACE_BG_SCENES.length]!;
      const src = await replaceImageBackground(sourceForEdit(targetImage), scene, onProgress);
      return {
        document: patchLayerSrc(doc, targetImage.id, src),
        message: `Replaced background on “${targetImage.name}” → ${scene.label}`,
      };
    }

    case ImageAiTool.ExpandImage: {
      if (targetImage?.src) {
        const src = await expandImageEdges(targetImage.src, 48);
        const next = patchLayerSrc(doc, targetImage.id, src, {
          x: targetImage.transform.x - 24,
          y: targetImage.transform.y - 24,
          width: targetImage.transform.width + 48,
          height: targetImage.transform.height + 48,
        });
        return { document: next, message: `Expanded “${targetImage.name}”` };
      }
      const pad = 80;
      return {
        document: touchDocument({
          ...doc,
          artboards: doc.artboards.map((b, i) =>
            i === 0
              ? { ...b, width: b.width + pad * 2, height: b.height + pad * 2 }
              : b,
          ),
          layers: mapLayers(doc.layers, (l) => ({
            ...l,
            transform: { ...l.transform, x: l.transform.x + pad, y: l.transform.y + pad },
          })),
        }),
        message: 'Canvas expanded',
      };
    }

    case ImageAiTool.RemoveObject:
    case ImageAiTool.MagicEraser: {
      if (targetImage?.src && (!selectedId || selectedId === targetImage.id || isImageLayer(selected))) {
        const src = await eraseCenterSoft(targetImage.src);
        return {
          document: patchLayerSrc(doc, targetImage.id, src),
          message:
            tool === ImageAiTool.MagicEraser
              ? `Magic erase on “${targetImage.name}”`
              : `Object area erased on “${targetImage.name}”`,
        };
      }
      if (!selectedId) {
        return { document: doc, message: 'Select a layer to erase' };
      }
      return {
        document: touchDocument({
          ...doc,
          layers: mapLayers(doc.layers, (l) =>
            l.id === selectedId ? { ...l, visible: false } : l,
          ),
        }),
        message: 'Object removed (hidden)',
      };
    }

    case ImageAiTool.ReplaceObject: {
      if (targetImage?.src && (!selectedId || selectedId === targetImage.id || isImageLayer(selected))) {
        const src = await tintImage(targetImage.src, '#14b8a6', 0.55);
        return {
          document: patchLayerSrc(doc, targetImage.id, src),
          message: `Object restyled on “${targetImage.name}”`,
        };
      }
      if (!selectedId || !selected) {
        return { document: doc, message: 'Select a layer to replace' };
      }
      return {
        document: touchDocument({
          ...doc,
          layers: mapLayers(doc.layers, (l) =>
            l.id === selectedId
              ? {
                  ...l,
                  fill: '#14b8a6',
                  src: productSvg('New', '#14b8a6'),
                  type: l.type === 'text' ? l.type : 'image',
                }
              : l,
          ),
        }),
        message: 'Object replaced',
      };
    }

    case ImageAiTool.Relight: {
      if (targetImage?.src) {
        const src = await applyCanvasFilter(
          targetImage.src,
          'brightness(1.12) contrast(1.08) sepia(0.18) saturate(1.1)',
        );
        return {
          document: patchLayerSrc(doc, targetImage.id, src),
          message: `Relight applied to “${targetImage.name}”`,
        };
      }
      return {
        document: touchDocument({
          ...doc,
          artboards: doc.artboards.map((b, i) =>
            i === 0 ? { ...b, background: warmTint(b.background) } : b,
          ),
          layers: mapLayers(doc.layers, (l) =>
            l.type === 'shape' ? { ...l, fill: warmTint(l.fill ?? '#0f766e') } : l,
          ),
        }),
        message: 'Relight applied (warm)',
      };
    }

    case ImageAiTool.Shadow: {
      if (targetImage?.src && (!selected || isImageLayer(selected) || !selectedId)) {
        const src = await addImageDropShadow(targetImage.src);
        return {
          document: patchLayerSrc(doc, targetImage.id, src, {
            x: targetImage.transform.x - 14,
            y: targetImage.transform.y - 14,
            width: targetImage.transform.width + 28,
            height: targetImage.transform.height + 28,
          }),
          message: `Shadow added to “${targetImage.name}”`,
        };
      }
      const targetId = selectedId ?? doc.layers.find((l) => l.type === 'text')?.id;
      if (!targetId) return { document: doc, message: 'Select a text or image layer' };
      return {
        document: touchDocument({
          ...doc,
          layers: mapLayers(doc.layers, (l) =>
            l.id === targetId && l.textStyle
              ? {
                  ...l,
                  textStyle: {
                    ...l.textStyle,
                    effects: {
                      ...l.textStyle.effects,
                      shadow: { color: 'rgba(0,0,0,0.45)', blur: 18, offsetX: 4, offsetY: 10 },
                    },
                  },
                }
              : l,
          ),
        }),
        message: 'Shadow added',
      };
    }

    case ImageAiTool.Reflection: {
      const target = targetImage ?? selected ?? doc.layers.find((l) => l.type === 'shape');
      if (!target) return { document: doc, message: 'Select a layer to reflect' };
      const t = target.transform;
      // Konva scaleY:-1 flips around the top edge; place so the mirror sits below the source.
      const reflection = createLayer({
        type: target.type,
        name: `${target.name} Reflection`,
        src: target.src,
        fill: target.fill,
        opacity: 0.42,
        text: target.text,
        textStyle: target.textStyle,
        shape: target.shape,
        transform: {
          ...t,
          y: t.y + t.height * 2 + 12,
          scaleY: -Math.abs(t.scaleY || 1),
        },
      });
      return {
        document: touchDocument({ ...doc, layers: [...doc.layers, reflection] }),
        message: `Reflection added under “${target.name}”`,
      };
    }

    case ImageAiTool.ProductScene: {
      if (targetImage?.src) {
        const look = SCENE_LOOK.studio;
        const src = await replaceImageBackground(sourceForEdit(targetImage), look.background, onProgress);
        let next = patchLayerSrc(doc, targetImage.id, src);
        next = applyProductSceneToDocument(next, 'studio', 'bottle');
        // Keep the user's photo as Product Shot if present
        next = {
          ...next,
          layers: mapLayers(next.layers, (l) =>
            l.id === targetImage.id ? { ...l, src, visible: true } : l,
          ),
        };
        return {
          document: touchDocument(next),
          message: `Studio scene applied around “${targetImage.name}”`,
        };
      }
      return {
        document: applyProductSceneToDocument(doc, 'studio', 'bottle'),
        message: 'Studio product scene applied',
      };
    }

    case ImageAiTool.StyleTransfer: {
      const styles = [
        { bg: '#1e1b4b', accent: '#a78bfa', ink: '#ede9fe', filter: 'hue-rotate(220deg) saturate(1.3)' },
        { bg: '#431407', accent: '#fb923c', ink: '#ffedd5', filter: 'sepia(0.55) saturate(1.4) contrast(1.1)' },
        { bg: '#042f2e', accent: '#2dd4bf', ink: '#ccfbf1', filter: 'hue-rotate(140deg) saturate(1.25)' },
      ];
      const s = styles[doc.version % styles.length]!;
      if (targetImage?.src) {
        const src = await applyCanvasFilter(targetImage.src, s.filter);
        let next = patchLayerSrc(doc, targetImage.id, src);
        next = {
          ...next,
          artboards: next.artboards.map((b, i) => (i === 0 ? { ...b, background: s.bg } : b)),
        };
        return {
          document: touchDocument(next),
          message: `Style transfer on “${targetImage.name}”`,
        };
      }
      return {
        document: touchDocument({
          ...doc,
          artboards: doc.artboards.map((b, i) => (i === 0 ? { ...b, background: s.bg } : b)),
          layers: mapLayers(doc.layers, (l) => {
            if (l.type === 'text' && l.textStyle) {
              return { ...l, textStyle: { ...l.textStyle, fill: s.ink } };
            }
            if (l.type === 'shape') return { ...l, fill: s.accent };
            if (l.type === 'cta') {
              return { ...l, fill: s.accent, textStyle: { ...l.textStyle!, fill: s.bg } };
            }
            return l;
          }),
        }),
        message: 'Style transfer applied',
      };
    }

    case ImageAiTool.Upscale: {
      if (!targetImage?.src) {
        return { document: doc, message: 'Select an image layer to upscale' };
      }
      const src = await upscaleImage(targetImage.src, 1.25);
      return {
        document: patchLayerSrc(doc, targetImage.id, src, {
          width: Math.round(targetImage.transform.width * 1.25),
          height: Math.round(targetImage.transform.height * 1.25),
        }),
        message: `Upscaled “${targetImage.name}” 1.25×`,
      };
    }

    case ImageAiTool.FaceRestore: {
      if (targetImage?.src) {
        const src = await applyCanvasFilter(
          targetImage.src,
          'contrast(1.08) brightness(1.05) saturate(1.05)',
        );
        return {
          document: patchLayerSrc(doc, targetImage.id, src),
          message: `Face restore polish on “${targetImage.name}”`,
        };
      }
      return colorPolish(doc, 'Face restore polish applied');
    }

    case ImageAiTool.ColorCorrection: {
      if (targetImage?.src) {
        const src = await applyCanvasFilter(
          targetImage.src,
          'saturate(1.2) contrast(1.1) brightness(1.03)',
        );
        return {
          document: patchLayerSrc(doc, targetImage.id, src),
          message: `Colors corrected on “${targetImage.name}”`,
        };
      }
      return colorPolish(doc, 'Colors corrected');
    }

    case ImageAiTool.SmartCrop: {
      if (targetImage?.src) {
        const src = await smartCropImage(targetImage.src, 0.08);
        return {
          document: patchLayerSrc(doc, targetImage.id, src),
          message: `Smart crop on “${targetImage.name}”`,
        };
      }
      const margin = 40;
      return {
        document: touchDocument({
          ...doc,
          artboards: doc.artboards.map((b, i) =>
            i === 0
              ? {
                  ...b,
                  width: Math.max(320, b.width - margin * 2),
                  height: Math.max(320, b.height - margin * 2),
                }
              : b,
          ),
          layers: mapLayers(doc.layers, (l) => ({
            ...l,
            transform: {
              ...l.transform,
              x: Math.max(0, l.transform.x - margin),
              y: Math.max(0, l.transform.y - margin),
            },
          })),
        }),
        message: 'Smart crop applied',
      };
    }

    case ImageAiTool.DetectProduct: {
      const label = targetImage
        ? `Detected: ${targetImage.name} · confidence 92%`
        : 'Detected: product · confidence 92%';
      const badge = createLayer({
        type: 'text',
        name: 'Detected Product',
        text: label,
        textStyle: {
          fontFamily: 'Source Sans 3',
          fontSize: 16,
          fontWeight: 700,
          fill: '#0f766e',
          align: 'left',
          lineHeight: 1.2,
          letterSpacing: 0,
        },
        transform: {
          x: targetImage ? targetImage.transform.x : 24,
          y: targetImage ? Math.max(8, targetImage.transform.y - 28) : 24,
          width: 420,
          height: 28,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        },
      });
      const layers = doc.layers.filter((l) => l.name !== 'Detected Product');
      return {
        document: touchDocument({ ...doc, layers: [...layers, badge] }),
        message: targetImage ? `Product detected: ${targetImage.name}` : 'Product detected',
      };
    }

    default:
      return { document: doc, message: 'Tool not available yet' };
  }
}

function colorPolish(doc: DesignDocument, message: string): AiEffectResult {
  return {
    document: touchDocument({
      ...doc,
      layers: mapLayers(doc.layers, (l) => {
        if (l.type === 'text' && l.textStyle) {
          return {
            ...l,
            textStyle: { ...l.textStyle, fill: punchColor(l.textStyle.fill) },
          };
        }
        if (l.fill) return { ...l, fill: punchColor(l.fill) };
        return l;
      }),
    }),
    message,
  };
}

function warmTint(hex: string): string {
  if (!hex.startsWith('#') || hex.length < 7) return '#fef3c7';
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + 28);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + 12);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 10);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function punchColor(hex: string): string {
  if (!hex.startsWith('#') || hex.length < 7) return hex;
  const r = Math.min(255, Math.round(parseInt(hex.slice(1, 3), 16) * 1.08));
  const g = Math.min(255, Math.round(parseInt(hex.slice(3, 5), 16) * 1.05));
  const b = Math.min(255, Math.round(parseInt(hex.slice(5, 7), 16) * 0.95));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
