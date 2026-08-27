import type { AssetRef, DesignDocument, LayerNode, TextStyle } from './types';
import { createLayer, touchDocument } from './document';

/** Brand kit shape consumed by the editor (mirrors Mongo brandKits). */
export interface BrandKit {
  id: string;
  name: string;
  logos: AssetRef[];
  colors: string[];
  fonts: { family: string; url?: string }[];
  watermark?: AssetRef;
  ctaStyles: Array<{
    id: string;
    label: string;
    fill: string;
    textColor: string;
    borderRadius: number;
  }>;
}

const defaultHeading: TextStyle = {
  fontFamily: 'Inter',
  fontSize: 48,
  fontWeight: 700,
  fill: '#111111',
  align: 'left',
  lineHeight: 1.2,
  letterSpacing: 0,
  role: 'heading',
  effects: { autoResize: true },
};

const defaultSubheading: TextStyle = {
  fontFamily: 'Inter',
  fontSize: 28,
  fontWeight: 500,
  fill: '#333333',
  align: 'left',
  lineHeight: 1.3,
  letterSpacing: 0,
  role: 'subheading',
  effects: { autoResize: true },
};

const defaultBody: TextStyle = {
  fontFamily: 'Source Sans 3',
  fontSize: 18,
  fontWeight: 400,
  fill: '#333333',
  align: 'left',
  lineHeight: 1.4,
  letterSpacing: 0,
  role: 'body',
  effects: { autoResize: true },
};

function mapLayers(layers: LayerNode[], fn: (l: LayerNode) => LayerNode): LayerNode[] {
  return layers.map((l) => {
    const next = fn(l);
    if (next.children?.length) {
      return { ...next, children: mapLayers(next.children, fn) };
    }
    return next;
  });
}

function isOnPage(layer: LayerNode, pageId: string, fallbackId?: string): boolean {
  return (layer.artboardId ?? fallbackId) === pageId;
}

function hasNamedOnPage(
  layers: LayerNode[],
  name: string,
  pageId: string,
  fallbackId?: string,
): boolean {
  for (const l of layers) {
    if (l.name === name && isOnPage(l, pageId, fallbackId)) return true;
    if (l.children?.length && hasNamedOnPage(l.children, name, pageId, fallbackId)) return true;
  }
  return false;
}

/**
 * Force-apply brand kit colors, fonts, CTAs, and logo onto the document.
 * Always updates visible styles so re-applying is obvious on the canvas.
 */
export function applyBrandKit(
  doc: DesignDocument,
  brand: BrandKit,
  targetArtboardId?: string,
): DesignDocument {
  const primary = brand.colors[0] ?? '#0f766e';
  const surface = brand.colors[1] ?? '#f4f7f8';
  const ink = brand.colors[2] ?? '#0a1214';
  const headingFont = brand.fonts[0]?.family ?? 'Fraunces';
  const bodyFont = brand.fonts[1]?.family ?? brand.fonts[0]?.family ?? 'Source Sans 3';
  const cta = brand.ctaStyles[0];

  let layers = mapLayers(doc.layers, (l) => {
    if (l.type === 'text' && l.textStyle) {
      const role = l.textStyle.role ?? (l.name.toLowerCase().includes('sub') ? 'subheading' : 'heading');
      const isHeading = role === 'heading' || l.name.toLowerCase().includes('heading');
      return {
        ...l,
        textStyle: {
          ...l.textStyle,
          fontFamily: isHeading ? headingFont : bodyFont,
          fill: isHeading ? primary : ink,
        },
      };
    }

    if (l.type === 'cta') {
      return {
        ...l,
        fill: cta?.fill ?? primary,
        text: cta?.label ?? l.text,
        textStyle: {
          fontFamily: bodyFont,
          fontSize: l.textStyle?.fontSize ?? 20,
          fontWeight: 600,
          fill: cta?.textColor ?? '#ffffff',
          align: 'center',
          lineHeight: 1,
          letterSpacing: 0,
          effects: l.textStyle?.effects,
          role: l.textStyle?.role,
        },
      };
    }

    if (l.type === 'shape') {
      const name = l.name.toLowerCase();
      if (name.includes('accent') || name.includes('bar') || name.includes('line')) {
        return { ...l, fill: primary };
      }
    }

    return l;
  });

  const fallbackId = doc.artboards[0]?.id;
  const pageId = targetArtboardId ?? fallbackId;
  const page = doc.artboards.find((a) => a.id === pageId) ?? doc.artboards[0];

  // Upsert brand logo on the active artboard (not always page 1)
  if (brand.logos[0]?.urlOrKey && pageId) {
    const logoSrc = brand.logos[0].urlOrKey;
    const hasLogo = hasNamedOnPage(layers, 'Brand Logo', pageId, fallbackId);
    if (hasLogo) {
      layers = mapLayers(layers, (l) =>
        l.name === 'Brand Logo' && isOnPage(l, pageId, fallbackId)
          ? { ...l, src: logoSrc, type: 'image' as const, crop: undefined, imageMask: l.imageMask ?? 'rounded' }
          : l,
      );
    } else {
      layers = [
        ...layers,
        createLayer({
          type: 'image',
          name: 'Brand Logo',
          src: logoSrc,
          artboardId: pageId,
          imageMask: 'rounded',
          transform: {
            x: 40,
            y: 40,
            width: 120,
            height: 120,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          },
        }),
      ];
    }
  }

  if (brand.watermark?.urlOrKey && pageId && !hasNamedOnPage(layers, 'Watermark', pageId, fallbackId)) {
    layers = [
      ...layers,
      createLayer({
        type: 'image',
        name: 'Watermark',
        opacity: 0.28,
        src: brand.watermark.urlOrKey,
        artboardId: pageId,
        transform: {
          x: 24,
          y: Math.max(24, (page?.height ?? 1080) - 72),
          width: 140,
          height: 40,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        },
      }),
    ];
  }

  const artboards = doc.artboards.map((ab) =>
    ab.id === pageId ? { ...ab, background: surface } : ab,
  );

  return touchDocument({
    ...doc,
    brandKitId: brand.id,
    artboards,
    layers,
  });
}

export function createHeadingLayer(text = 'Heading', brand?: BrandKit): LayerNode {
  const style = { ...defaultHeading };
  if (brand?.colors[0]) style.fill = brand.colors[0];
  if (brand?.fonts[0]) style.fontFamily = brand.fonts[0].family;
  return createLayer({
    type: 'text',
    name: 'Heading',
    text,
    textStyle: style,
    transform: { x: 80, y: 80, width: 600, height: 80, rotation: 0, scaleX: 1, scaleY: 1 },
  });
}

export function createSubheadingLayer(text = 'Subheading', brand?: BrandKit): LayerNode {
  const style = { ...defaultSubheading };
  if (brand?.colors[2]) style.fill = brand.colors[2];
  else if (brand?.colors[0]) style.fill = brand.colors[0];
  if (brand?.fonts[1]) style.fontFamily = brand.fonts[1].family;
  else if (brand?.fonts[0]) style.fontFamily = brand.fonts[0].family;
  return createLayer({
    type: 'text',
    name: 'Subheading',
    text,
    textStyle: style,
    transform: { x: 80, y: 180, width: 600, height: 48, rotation: 0, scaleX: 1, scaleY: 1 },
  });
}

export function createBodyLayer(text = 'Add a little bit of body text', brand?: BrandKit): LayerNode {
  const style = { ...defaultBody };
  if (brand?.colors[2]) style.fill = brand.colors[2];
  else if (brand?.colors[0]) style.fill = brand.colors[0];
  if (brand?.fonts[1]) style.fontFamily = brand.fonts[1].family;
  else if (brand?.fonts[0]) style.fontFamily = brand.fonts[0].family;
  return createLayer({
    type: 'text',
    name: 'Body text',
    text,
    textStyle: style,
    transform: { x: 80, y: 260, width: 520, height: 64, rotation: 0, scaleX: 1, scaleY: 1 },
  });
}

export function createCtaLayer(brand?: BrandKit): LayerNode {
  const cta = brand?.ctaStyles[0];
  return createLayer({
    type: 'cta',
    name: 'CTA Button',
    text: cta?.label ?? 'Shop Now',
    fill: cta?.fill ?? '#111111',
    textStyle: {
      fontFamily: brand?.fonts[0]?.family ?? 'Inter',
      fontSize: 20,
      fontWeight: 600,
      fill: cta?.textColor ?? '#ffffff',
      align: 'center',
      lineHeight: 1,
      letterSpacing: 0,
    },
    transform: { x: 80, y: 400, width: 200, height: 48, rotation: 0, scaleX: 1, scaleY: 1 },
  });
}
