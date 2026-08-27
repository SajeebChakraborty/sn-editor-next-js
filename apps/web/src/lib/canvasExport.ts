/**
 * Client-side Konva artboard export → PNG / JPEG / WebP / multi-page PDF.
 */
'use client';

import { jsPDF } from 'jspdf';
import type Konva from 'konva';
import type { ImageExportFormat } from '@sn-editor/image-engine';
import { downloadBlob } from '@/lib/downloadFile';

let registeredStage: Konva.Stage | null = null;

export function registerEditorStage(stage: Konva.Stage | null): void {
  registeredStage = stage;
}

export function getEditorStage(): Konva.Stage | null {
  return registeredStage;
}

function mimeFor(format: ImageExportFormat): string {
  if (format === 'jpeg') return 'image/jpeg';
  if (format === 'webp') return 'image/webp';
  return 'image/png';
}

export interface ExportArtboardOptions {
  artboard: { id?: string; x: number; y: number; width: number; height: number; name?: string };
  format: ImageExportFormat;
  quality?: number;
  filename?: string;
  /** 1 = native, 2 = retina, 3 = print-ish */
  pixelRatio?: number;
  /** PNG only — hide artboard fill + drop shadow during capture */
  transparent?: boolean;
}

type CaptureOpts = Omit<ExportArtboardOptions, 'filename'>;

type HiddenNode = { node: Konva.Node; visible: boolean };

function hideNodes(nodes: Konva.Node[]): HiddenNode[] {
  return nodes.map((node) => {
    const visible = node.visible();
    node.visible(false);
    return { node, visible };
  });
}

function restoreHidden(hidden: HiddenNode[]) {
  hidden.forEach(({ node, visible }) => node.visible(visible));
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.size === 0) {
          reject(new Error('Export produced an empty image. Check that the canvas has content.'));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read exported image.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Capture the artboard at 1 canvas unit = 1 pixel (× pixelRatio).
 * Hides editor chrome (grid, rulers, transformer, selection outlines).
 * For transparent PNG, hides the page rect so its drop-shadow is not baked in.
 */
export async function exportArtboardToBlob(opts: CaptureOpts): Promise<Blob> {
  const stage = registeredStage;
  if (!stage) {
    throw new Error('Canvas is not ready. Wait for the editor to load, then try again.');
  }

  const {
    artboard,
    format,
    quality = 0.92,
    pixelRatio = 1,
    transparent = false,
  } = opts;
  const mimeType = mimeFor(format);
  const wantTransparent = Boolean(transparent && format === 'png');

  const prev = {
    x: stage.x(),
    y: stage.y(),
    scaleX: stage.scaleX(),
    scaleY: stage.scaleY(),
    width: stage.width(),
    height: stage.height(),
  };

  const hidden: HiddenNode[] = [];
  hidden.push(
    ...hideNodes([
      ...stage.find('.editor-grid'),
      ...stage.find('.editor-rulers'),
      ...stage.find('Transformer'),
      ...stage.find('.shape-sel'),
    ]),
  );

  const labelNodes = stage.find('Text').filter((n) => {
    const text = (n as Konva.Text).text?.() ?? '';
    return text.includes('·') && /\d+×\d+/.test(text);
  });
  hidden.push(...hideNodes(labelNodes));

  const artboardRects = [
    ...stage.find('.artboard-bg'),
    ...(artboard.id ? [stage.findOne(`#artboard-${artboard.id}`)].filter(Boolean) as Konva.Node[] : []),
  ];
  const uniqueArtboards = [...new Set(artboardRects)];
  const shadowPrev = uniqueArtboards.map((node) => {
    const shape = node as Konva.Shape;
    return {
      node: shape,
      shadowEnabled: typeof shape.shadowEnabled === 'function' ? shape.shadowEnabled() : true,
    };
  });

  if (wantTransparent) {
    hidden.push(...hideNodes(uniqueArtboards));
  } else {
    shadowPrev.forEach(({ node }) => {
      if (typeof node.shadowEnabled === 'function') node.shadowEnabled(false);
    });
  }

  try {
    stage.scale({ x: 1, y: 1 });
    stage.position({ x: -artboard.x, y: -artboard.y });
    stage.size({ width: artboard.width, height: artboard.height });
    stage.draw();

    const canvas = stage.toCanvas({
      x: 0,
      y: 0,
      width: artboard.width,
      height: artboard.height,
      pixelRatio: Math.min(4, Math.max(1, pixelRatio)),
    });

    return await canvasToBlob(canvas, mimeType, quality);
  } finally {
    shadowPrev.forEach(({ node, shadowEnabled }) => {
      if (typeof node.shadowEnabled === 'function') node.shadowEnabled(shadowEnabled);
    });
    restoreHidden(hidden);
    stage.scale({ x: prev.scaleX, y: prev.scaleY });
    stage.position({ x: prev.x, y: prev.y });
    stage.size({ width: prev.width, height: prev.height });
    stage.draw();
  }
}

/**
 * Capture artboard region as a data URL without downloading.
 */
export async function exportArtboardToDataUrl(opts: CaptureOpts): Promise<string> {
  const blob = await exportArtboardToBlob(opts);
  return blobToDataUrl(blob);
}

/**
 * Export the artboard region at full resolution (1px = 1 canvas unit × pixelRatio).
 */
export async function exportArtboardToDownload(opts: ExportArtboardOptions): Promise<void> {
  const { artboard, format } = opts;
  const filename =
    opts.filename ??
    `${(artboard.name ?? 'sn-editor').replace(/\s+/g, '-').toLowerCase()}.${format === 'jpeg' ? 'jpg' : format}`;
  const blob = await exportArtboardToBlob(opts);
  downloadBlob(blob, filename);
}

/** Export every artboard as a sequential PNG download. */
export async function exportAllArtboardsAsPng(opts: {
  artboards: Array<{ id?: string; x: number; y: number; width: number; height: number; name?: string }>;
  baseName: string;
  pixelRatio?: number;
  transparent?: boolean;
  delayMs?: number;
}): Promise<void> {
  const delay = opts.delayMs ?? 350;
  for (let i = 0; i < opts.artboards.length; i++) {
    const ab = opts.artboards[i]!;
    await exportArtboardToDownload({
      artboard: ab,
      format: 'png',
      pixelRatio: opts.pixelRatio,
      transparent: opts.transparent,
      filename: `${opts.baseName}-page-${i + 1}.png`,
    });
    if (i < opts.artboards.length - 1) {
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/**
 * Multi-page PDF via jsPDF — one page per artboard, sized to artboard pixels (pt ≈ px).
 */
export async function exportArtboardsToPdf(opts: {
  artboards: Array<{ id?: string; x: number; y: number; width: number; height: number; name?: string }>;
  baseName: string;
  pixelRatio?: number;
  transparent?: boolean;
}): Promise<void> {
  if (!opts.artboards.length) {
    throw new Error('No artboards to export');
  }

  let pdf: jsPDF | null = null;

  for (let i = 0; i < opts.artboards.length; i++) {
    const ab = opts.artboards[i]!;
    const dataUrl = await exportArtboardToDataUrl({
      artboard: ab,
      format: 'png',
      pixelRatio: opts.pixelRatio ?? 1,
      transparent: opts.transparent,
    });

    const w = ab.width;
    const h = ab.height;
    const orientation = w >= h ? 'landscape' : 'portrait';

    if (!pdf) {
      pdf = new jsPDF({
        orientation,
        unit: 'pt',
        format: [w, h],
        compress: true,
      });
    } else {
      pdf.addPage([w, h], orientation);
    }

    pdf.addImage(dataUrl, 'PNG', 0, 0, w, h, undefined, 'FAST');
  }

  pdf!.save(`${opts.baseName.replace(/[^\w.-]+/g, '-')}.pdf`);
}
