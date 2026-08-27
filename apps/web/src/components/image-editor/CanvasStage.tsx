/**
 * Infinite Konva canvas with pan/zoom and a static, centered artboard (Canva-style).
 * Page size changes only via Resize menu — the artboard itself is not drag-resizable.
 */
'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Stage, Layer, Rect, Text, Group, Ellipse, Line, Arrow, RegularPolygon, Star, Transformer, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { panBy, smartAlign, snapToGrid, zoomAtPoint, fitRectInView, centerRectInView, setZoomAtCenter } from '@sn-editor/image-engine';
import { applyTextCase, formatDisplayText, konvaFontStyle } from '@/lib/textPresets';
import { CurvedText } from './CurvedText';
import type { LayerNode } from '@sn-editor/editor-core';
import { flattenLayers } from '@sn-editor/editor-core';
import { registerEditorStage } from '@/lib/canvasExport';
import { useImageEditorStore } from '@/store/imageEditorStore';
import { layerArtboardId, primaryArtboardId } from '@/lib/pageLayers';
import { playLayerAnimation } from '@/lib/layerAnimations';
import { ImageAiProgressOverlay } from './ImageAiProgressOverlay';
import { LayerContextMenu, type LayerContextMenuState } from './LayerContextMenu';

/** Load HTMLImageElement or use HTMLVideoElement for video layers. */
function rasterizeSvgImage(img: HTMLImageElement): Promise<HTMLImageElement> {
  const src = img.src || '';
  const isSvg = src.startsWith('data:image/svg+xml') || /\.svg(\?|#|$)/i.test(src);
  if (!isSvg) return Promise.resolve(img);
  const w = Math.max(1, img.naturalWidth || 96);
  const h = Math.max(1, img.naturalHeight || 96);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(img);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise((resolve) => {
    const out = new window.Image();
    out.onload = () => resolve(out);
    out.onerror = () => resolve(img);
    out.src = canvas.toDataURL('image/png');
  });
}

function useMediaElement(src?: string, asVideo = false) {
  const [el, setEl] = useState<HTMLImageElement | HTMLVideoElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src) {
      setEl(null);
      setFailed(false);
      return;
    }

    // Reset immediately so Konva never keeps a stale bitmap after AI src swap
    setEl(null);
    setFailed(false);

    if (asVideo) {
      const video = document.createElement('video');
      video.src = src;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      if (!src.startsWith('blob:') && !src.startsWith('data:')) {
        video.crossOrigin = 'anonymous';
      }
      const onReady = () => {
        setFailed(false);
        setEl(video);
        void video.play().catch(() => undefined);
      };
      const onError = () => {
        setEl(null);
        setFailed(true);
      };
      video.addEventListener('loadeddata', onReady);
      video.addEventListener('error', onError);
      video.load();
      return () => {
        video.pause();
        video.removeAttribute('src');
        video.load();
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('error', onError);
      };
    }

    const image = new window.Image();
    if (!src.startsWith('blob:') && !src.startsWith('data:')) {
      image.crossOrigin = 'anonymous';
    }
    image.onload = () => {
      setFailed(false);
      void rasterizeSvgImage(image).then((ready) => setEl(ready));
    };
    image.onerror = () => {
      setEl(null);
      setFailed(true);
    };
    image.src = src;
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [src, asVideo]);

  return { el, failed };
}

function sourceCrop(layer: LayerNode, media: CanvasImageSource | undefined | null) {
  if (!(media instanceof HTMLImageElement) && !(media instanceof HTMLVideoElement)) return null;
  const nw =
    media instanceof HTMLVideoElement ? media.videoWidth || 1 : media.naturalWidth || 1;
  const nh =
    media instanceof HTMLVideoElement ? media.videoHeight || 1 : media.naturalHeight || 1;
  const crop = layer.crop;
  const full =
    !crop ||
    (crop.x <= 0.001 && crop.y <= 0.001 && crop.width >= 0.999 && crop.height >= 0.999);
  if (full) return { x: 0, y: 0, width: nw, height: nh };
  if (nw < 2 || nh < 2) return { x: 0, y: 0, width: Math.max(1, nw), height: Math.max(1, nh) };
  const x = Math.max(0, Math.min(0.98, crop.x));
  const y = Math.max(0, Math.min(0.98, crop.y));
  const w = Math.max(0.02, Math.min(1 - x, crop.width));
  const h = Math.max(0.02, Math.min(1 - y, crop.height));
  return { x: x * nw, y: y * nh, width: w * nw, height: h * nh };
}

function applyImageAppearance(img: Konva.Image, layer: LayerNode) {
  const t = layer.transform;
  img.width(Math.max(1, t.width));
  img.height(Math.max(1, t.height));
  img.scaleX(t.scaleX);
  img.scaleY(t.scaleY);
  img.offsetX(t.scaleX < 0 ? t.width : 0);
  img.offsetY(t.scaleY < 0 ? t.height : 0);

  const crop = sourceCrop(layer, img.image());
  if (crop) img.crop(crop);

  const adj = layer.imageAdjust;
  const hasAdj = Boolean(
    adj &&
      (adj.brightness !== 0 ||
        adj.contrast !== 0 ||
        adj.saturation !== 0 ||
        adj.blur > 0 ||
        adj.hue !== 0),
  );

  try {
    if (hasAdj && adj) {
      img.filters([
        Konva.Filters.Brighten,
        Konva.Filters.Contrast,
        Konva.Filters.HSV,
        Konva.Filters.Blur,
      ]);
      img.brightness(adj.brightness);
      img.contrast(adj.contrast * 100);
      img.saturation(adj.saturation < 0 ? adj.saturation * 5 : adj.saturation);
      img.hue(adj.hue);
      img.blurRadius(adj.blur);
      img.cache({ pixelRatio: 1 });
    } else {
      img.filters([]);
      img.clearCache();
    }
  } catch {
    try {
      img.filters([]);
      img.clearCache();
    } catch {
      /* tainted canvas / missing filter */
    }
  }
}

function paintImageMask(
  ctx: Konva.Context,
  w: number,
  h: number,
  mask: NonNullable<LayerNode['imageMask']>,
) {
  if (mask === 'circle') {
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, Math.max(1, Math.min(w, h) / 2), 0, Math.PI * 2, false);
    ctx.closePath();
    return;
  }
  const r =
    mask === 'squircle'
      ? Math.min(w, h) * 0.32
      : mask === 'rounded'
        ? Math.min(w, h) * 0.18
        : 0;
  const rad = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(rad, 0);
  ctx.lineTo(w - rad, 0);
  ctx.quadraticCurveTo(w, 0, w, rad);
  ctx.lineTo(w, h - rad);
  ctx.quadraticCurveTo(w, h, w - rad, h);
  ctx.lineTo(rad, h);
  ctx.quadraticCurveTo(0, h, 0, h - rad);
  ctx.lineTo(0, rad);
  ctx.quadraticCurveTo(0, 0, rad, 0);
  ctx.closePath();
}

function MediaLayer({
  layer,
  selected,
  zIndex = 0,
  onSelect,
  onDragStart,
  onDragEnd,
  onDragMove,
  onContextMenu,
  constrainDrag,
}: {
  layer: LayerNode;
  selected: boolean;
  zIndex?: number;
  onSelect: (e?: Konva.KonvaEventObject<MouseEvent | Event>) => void;
  onDragStart?: () => void;
  onDragEnd: (x: number, y: number) => void;
  onDragMove?: (x: number, y: number) => { x: number; y: number } | void;
  onContextMenu?: (e: Konva.KonvaEventObject<PointerEvent>) => void;
  constrainDrag?: (pos: { x: number; y: number }) => { x: number; y: number };
}) {
  const isVideo = layer.fill === 'video';
  const { el: media, failed } = useMediaElement(layer.src, isVideo);
  const { transform: t } = layer;
  const animRef = useRef<Konva.Image | null>(null);
  const groupRef = useRef<Konva.Group | null>(null);
  const animKey = `${layer.id}:${layer.animation?.type ?? 'none'}:${layer.animation?.durationMs ?? 0}`;
  // Keep live drag coords so parent re-renders (guides, panels) don't snap the node back
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const posX = dragPos?.x ?? t.x;
  const posY = dragPos?.y ?? t.y;

  // Redraw Konva when video frames advance
  useEffect(() => {
    if (!isVideo || !media) return;
    let raf = 0;
    const loop = () => {
      animRef.current?.getLayer()?.batchDraw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isVideo, media]);

  useEffect(() => {
    const node = groupRef.current;
    if (!node || !media || !layer.animation || layer.animation.type === 'none') return;
    const base = {
      x: t.x,
      y: t.y,
      opacity: layer.opacity,
      scaleX: 1,
      scaleY: 1,
    };
    const handle = playLayerAnimation(node, layer.animation, base);
    return () => handle?.destroy();
  }, [animKey, media, layer.animation, layer.opacity, t.x, t.y]);

  useLayoutEffect(() => {
    const img = animRef.current;
    if (!img || !media) return;
    applyImageAppearance(img, layer);
    img.getLayer()?.batchDraw();
  }, [
    media,
    layer,
    t.width,
    t.height,
    t.scaleX,
    t.scaleY,
    layer.crop,
    layer.imageAdjust,
    layer.src,
  ]);

  if (!layer.visible) return null;

  const composite: GlobalCompositeOperation =
    !layer.blendMode || layer.blendMode === 'normal'
      ? 'source-over'
      : (layer.blendMode as GlobalCompositeOperation);

  const crop = layer.crop;
  const cropProps =
    crop && media instanceof HTMLImageElement
      ? {
          crop: {
            x: crop.x * (media.naturalWidth || 1),
            y: crop.y * (media.naturalHeight || 1),
            width: crop.width * (media.naturalWidth || 1),
            height: crop.height * (media.naturalHeight || 1),
          },
        }
      : {};

  const dragHandlers = {
    onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => {
      setDragPos({ x: e.target.x(), y: e.target.y() });
      onDragStart?.();
    },
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => {
      let x = e.target.x();
      let y = e.target.y();
      const snapped = onDragMove?.(x, y);
      if (snapped) {
        x = snapped.x;
        y = snapped.y;
        e.target.position({ x, y });
      }
      setDragPos({ x, y });
    },
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      const x = e.target.x();
      const y = e.target.y();
      setDragPos(null);
      onDragEnd(x, y);
    },
  };

  if (!media) {
    return (
      <Group
        key={`${layer.id}-${composite}`}
        id={layer.id}
        x={posX}
        y={posY}
        width={t.width}
        height={t.height}
        rotation={t.rotation}
        zIndex={zIndex}
        opacity={layer.opacity}
        globalCompositeOperation={composite}
        draggable={!layer.locked}
        dragBoundFunc={constrainDrag}
        onClick={onSelect}
        onTap={onSelect}
        onContextMenu={onContextMenu}
        {...dragHandlers}
      >
        <Rect width={t.width} height={t.height} fill="rgba(0,0,0,0.001)" listening />
        <Rect
          width={t.width}
          height={t.height}
          fill="#d0dce1"
          cornerRadius={8}
          stroke={selected ? '#8b3dff' : '#c4c7cf'}
          strokeWidth={selected ? 2 : 1}
          dash={[8, 6]}
        />
        <Text
          text={failed ? 'Can’t load image' : layer.src ? 'Loading…' : 'Upload an image'}
          width={t.width}
          height={t.height}
          align="center"
          verticalAlign="middle"
          fontSize={14}
          fill="#5b7380"
        />
      </Group>
    );
  }

  return (
    <Group
      ref={groupRef}
      id={layer.id}
      x={posX}
      y={posY}
      width={t.width}
      height={t.height}
      rotation={t.rotation}
      zIndex={zIndex}
      opacity={layer.opacity}
      globalCompositeOperation={composite}
      draggable={!layer.locked}
      dragBoundFunc={constrainDrag}
      onClick={onSelect}
      onTap={onSelect}
      onContextMenu={onContextMenu}
      {...dragHandlers}
    >
      {/* Solid hit target so SVG frames / sparse pixels always drag */}
      <Rect width={t.width} height={t.height} fill="rgba(0,0,0,0.001)" listening />
      <Group
        listening={false}
        key={layer.imageMask ?? 'square'}
        clipFunc={
          layer.imageMask && layer.imageMask !== 'square'
            ? (ctx) => paintImageMask(ctx, t.width, t.height, layer.imageMask!)
            : undefined
        }
      >
        <KonvaImage
          key={`${layer.src}-${composite}`}
          ref={animRef}
          image={media}
          width={t.width}
          height={t.height}
          scaleX={t.scaleX}
          scaleY={t.scaleY}
          offsetX={t.scaleX < 0 ? t.width : 0}
          offsetY={t.scaleY < 0 ? t.height : 0}
          {...cropProps}
        />
      </Group>
      {selected ? (
        <Rect
          width={t.width}
          height={t.height}
          stroke="#8b3dff"
          strokeWidth={2}
          listening={false}
        />
      ) : null}
      <ImageAiProgressOverlay layerId={layer.id} width={t.width} height={t.height} />
    </Group>
  );
}

function shapeFillProps(layer: LayerNode, origin: 'corner' | 'center') {
  const t = layer.transform;
  const g = layer.shapeGradient;
  if (!g) return { fill: layer.fill ?? '#0f766e' };
  const dx = Math.cos((g.angle * Math.PI) / 180) * t.width;
  const dy = Math.sin((g.angle * Math.PI) / 180) * t.height;
  const start = origin === 'center' ? { x: -dx / 2, y: -dy / 2 } : { x: 0, y: 0 };
  const end = origin === 'center' ? { x: dx / 2, y: dy / 2 } : { x: dx, y: dy };
  return {
    fillPriority: 'linear-gradient' as const,
    fillLinearGradientStartPoint: start,
    fillLinearGradientEndPoint: end,
    fillLinearGradientColorStops: [0, g.from, 1, g.to] as (string | number)[],
    fill: layer.fill ?? g.from,
  };
}

function shapeStrokeProps(layer: LayerNode) {
  const width = layer.strokeWidth ?? 0;
  return {
    stroke: width > 0 ? (layer.stroke ?? '#0a1214') : undefined,
    strokeWidth: width,
    dash: layer.dash,
  };
}

function applyShapeAppearance(child: Konva.Shape, layer: LayerNode) {
  const lineLike = layer.shape === 'line' || layer.shape === 'arrow';
  const fill = layer.fill ?? layer.stroke ?? '#0f766e';
  const stroke = layer.stroke ?? fill;
  if (lineLike) {
    child.stroke(stroke);
    child.strokeWidth(Math.max(layer.strokeWidth ?? 4, 1));
    child.strokeEnabled(true);
    if (layer.shape === 'arrow') {
      child.fillEnabled(true);
      child.fill(fill);
    }
    child.dash(layer.dash ?? []);
    return;
  }
  if (layer.shapeGradient) {
    const t = layer.transform;
    const g = layer.shapeGradient;
    const dx = Math.cos((g.angle * Math.PI) / 180) * t.width;
    const dy = Math.sin((g.angle * Math.PI) / 180) * t.height;
    child.fillEnabled(true);
    child.fillPriority('linear-gradient');
    child.fillLinearGradientStartPoint({ x: -dx / 2, y: -dy / 2 });
    child.fillLinearGradientEndPoint({ x: dx / 2, y: dy / 2 });
    child.fillLinearGradientColorStops([0, g.from, 1, g.to]);
    child.fill(fill);
  } else {
    child.fillEnabled(true);
    child.fillPriority('color');
    child.fillLinearGradientColorStops([0, fill, 1, fill]);
    child.fill(fill);
  }
  const sw = layer.strokeWidth ?? 0;
  child.stroke(sw > 0 ? stroke : undefined);
  child.strokeWidth(sw);
  child.dash(layer.dash ?? []);
}

/** Shared mouse host: drag + transformer resize work the same for every shape type. */
function ShapeHost({
  layer,
  selected,
  zIndex,
  onSelect,
  onDragStart,
  onDragEnd,
  onDragMove,
  onContextMenu,
  constrainDrag,
  children,
}: {
  layer: LayerNode;
  selected: boolean;
  zIndex: number;
  onSelect: (e?: Konva.KonvaEventObject<MouseEvent | Event>) => void;
  onDragStart?: () => void;
  onDragEnd: (x: number, y: number) => void;
  onDragMove?: (x: number, y: number) => { x: number; y: number } | void;
  onContextMenu?: (e: Konva.KonvaEventObject<PointerEvent>) => void;
  constrainDrag?: (pos: { x: number; y: number }) => { x: number; y: number };
  children: ReactNode;
}) {
  const t = layer.transform;
  const composite: GlobalCompositeOperation =
    !layer.blendMode || layer.blendMode === 'normal'
      ? 'source-over'
      : (layer.blendMode as GlobalCompositeOperation);
  const lineLike = layer.shape === 'line' || layer.shape === 'arrow';
  // Keep hit box inside group bounds so Transformer matches W/H
  const hitH = Math.max(t.height, lineLike ? Math.max(12, (layer.strokeWidth ?? 4) + 8) : 1);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const posX = dragPos?.x ?? t.x;
  const posY = dragPos?.y ?? t.y;

  return (
    <Group
      id={layer.id}
      name={`shape:${layer.shape ?? 'rect'}`}
      x={posX}
      y={posY}
      width={t.width}
      height={hitH}
      rotation={t.rotation}
      scaleX={1}
      scaleY={1}
      zIndex={zIndex}
      opacity={layer.opacity}
      globalCompositeOperation={composite}
      draggable={!layer.locked}
      dragBoundFunc={constrainDrag}
      onClick={onSelect}
      onTap={onSelect}
      onContextMenu={onContextMenu}
      onDragStart={(e) => {
        setDragPos({ x: e.target.x(), y: e.target.y() });
        onDragStart?.();
      }}
      onDragMove={(e) => {
        let x = e.target.x();
        let y = e.target.y();
        const snapped = onDragMove?.(x, y);
        if (snapped) {
          x = snapped.x;
          y = snapped.y;
          e.target.position({ x, y });
        }
        setDragPos({ x, y });
      }}
      onDragEnd={(e) => {
        const x = e.target.x();
        const y = e.target.y();
        setDragPos(null);
        onDragEnd(x, y);
      }}
    >
      {/* Invisible hit/transform box so thin lines & arrows resize with the mouse */}
      <Rect
        name="shape-hit"
        x={0}
        y={0}
        width={Math.max(1, t.width)}
        height={Math.max(1, hitH)}
        fill="rgba(0,0,0,0.001)"
        listening
      />
      {selected ? (
        <Rect
          name="shape-sel"
          x={0}
          y={0}
          width={Math.max(1, t.width)}
          height={Math.max(1, hitH)}
          stroke="#8b3dff"
          strokeWidth={1}
          dash={[4, 4]}
          listening={false}
        />
      ) : null}
      {children}
    </Group>
  );
}

function LayerShape({
  layer,
  selected,
  zIndex = 0,
  onSelect,
  onDragStart,
  onDragEnd,
  onDragMove,
  onEditText,
  onContextMenu,
  constrainDrag,
}: {
  layer: LayerNode;
  selected: boolean;
  zIndex?: number;
  onSelect: (e?: Konva.KonvaEventObject<MouseEvent | Event>) => void;
  onDragStart?: () => void;
  onDragEnd: (x: number, y: number) => void;
  onDragMove?: (x: number, y: number) => { x: number; y: number } | void;
  onEditText?: () => void;
  onContextMenu?: (e: Konva.KonvaEventObject<PointerEvent>) => void;
  constrainDrag?: (pos: { x: number; y: number }) => { x: number; y: number };
}) {
  const { transform: t } = layer;
  if (!layer.visible) return null;

  const composite: GlobalCompositeOperation =
    !layer.blendMode || layer.blendMode === 'normal'
      ? 'source-over'
      : (layer.blendMode as GlobalCompositeOperation);

  const common = {
    key: `${layer.id}-${composite}`,
    id: layer.id,
    x: t.x,
    y: t.y,
    width: t.width,
    height: t.height,
    rotation: t.rotation,
    scaleX: t.scaleX,
    scaleY: t.scaleY,
    zIndex,
    opacity: layer.opacity,
    globalCompositeOperation: composite,
    draggable: !layer.locked,
    dragBoundFunc: constrainDrag,
    onClick: onSelect,
    onTap: onSelect,
    onDblClick: onEditText,
    onDblTap: onEditText,
    onContextMenu,
    onDragStart: () => onDragStart?.(),
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      onDragEnd(e.target.x(), e.target.y());
    },
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => {
      onDragMove?.(e.target.x(), e.target.y());
    },
  };

  const host = {
    layer,
    selected,
    zIndex,
    onSelect,
    onDragStart,
    onDragEnd,
    onDragMove,
    onContextMenu,
    constrainDrag,
  };

  if (layer.type === 'cta') {
    const style = layer.textStyle;
    return (
      <Group
        id={layer.id}
        x={t.x}
        y={t.y}
        width={t.width}
        height={t.height}
        rotation={t.rotation}
        scaleX={t.scaleX}
        scaleY={t.scaleY}
        zIndex={zIndex}
        opacity={layer.opacity}
        globalCompositeOperation={composite}
        draggable={!layer.locked}
        dragBoundFunc={constrainDrag}
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={onEditText}
        onDblTap={onEditText}
        onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
        onDragMove={(e) => {
          let x = e.target.x();
          let y = e.target.y();
          const snapped = onDragMove?.(x, y);
          if (snapped) {
            x = snapped.x;
            y = snapped.y;
            e.target.position({ x, y });
          }
        }}
      >
        <Rect
          width={t.width}
          height={t.height}
          fill={layer.fill ?? '#0f766e'}
          cornerRadius={10}
          stroke={selected ? '#0a1214' : undefined}
          strokeWidth={selected ? 2 : 0}
        />
        <Text
          width={t.width}
          height={t.height}
          text={applyTextCase(layer.text ?? 'Shop Now', style?.textCase)}
          fontFamily={style?.fontFamily ?? 'Source Sans 3'}
          fontSize={style?.fontSize ?? 20}
          fontStyle={konvaFontStyle(style?.fontWeight ?? 600, style?.fontStyle)}
          textDecoration={style?.underline ? 'underline' : undefined}
          lineHeight={style?.lineHeight ?? 1.3}
          letterSpacing={style?.letterSpacing ?? 0}
          fill={style?.fill ?? '#ffffff'}
          align="center"
          verticalAlign="middle"
        />
      </Group>
    );
  }

  if (layer.type === 'text') {
    const style = layer.textStyle;
    const effects = style?.effects;
    const gradient = effects?.gradient;
    const curve = effects?.curve ?? 0;
    const gradProps =
      gradient != null
        ? {
            fillPriority: 'linear-gradient' as const,
            fillLinearGradientStartPoint: { x: 0, y: 0 },
            fillLinearGradientEndPoint: {
              x: Math.cos((gradient.angle * Math.PI) / 180) * t.width,
              y: Math.sin((gradient.angle * Math.PI) / 180) * t.height,
            },
            fillLinearGradientColorStops: [0, gradient.from, 1, gradient.to] as (string | number)[],
            fill: style?.fill ?? '#0a1214',
          }
        : { fill: style?.fill ?? '#0a1214' };

    const displayText = formatDisplayText(layer.text ?? 'Text', {
      textCase: style?.textCase,
      listStyle: style?.listStyle,
    });
    const fontStyleStr = konvaFontStyle(style?.fontWeight ?? 500, style?.fontStyle);

    if (Math.abs(curve) > 2) {
      return (
        <CurvedText
          id={layer.id}
          text={displayText}
          x={t.x}
          y={t.y}
          width={t.width}
          height={t.height}
          rotation={t.rotation}
          scaleX={t.scaleX}
          scaleY={t.scaleY}
          opacity={layer.opacity}
          globalCompositeOperation={composite}
          draggable={!layer.locked}
          fontFamily={style?.fontFamily ?? 'Source Sans 3'}
          fontSize={style?.fontSize ?? 24}
          fontStyle={fontStyleStr}
          fill={typeof gradProps.fill === 'string' ? gradProps.fill : style?.fill ?? '#0a1214'}
          letterSpacing={style?.letterSpacing ?? 0}
          curve={curve}
          textDecoration={style?.underline ? 'underline' : undefined}
          stroke={effects?.outline?.color}
          strokeWidth={effects?.outline?.width}
          shadowColor={effects?.shadow?.color}
          shadowBlur={effects?.shadow?.blur}
          shadowOffsetX={effects?.shadow?.offsetX}
          shadowOffsetY={effects?.shadow?.offsetY}
          onClick={onSelect}
          onTap={onSelect}
          onDblClick={onEditText}
          onDblTap={onEditText}
          onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
          onDragMove={(e) => {
          let x = e.target.x();
          let y = e.target.y();
          const snapped = onDragMove?.(x, y);
          if (snapped) {
            x = snapped.x;
            y = snapped.y;
            e.target.position({ x, y });
          }
        }}
        />
      );
    }

    return (
      <Text
        {...common}
        text={displayText}
        fontFamily={style?.fontFamily ?? 'Source Sans 3'}
        fontSize={style?.fontSize ?? 24}
        fontStyle={fontStyleStr}
        textDecoration={style?.underline ? 'underline' : undefined}
        align={style?.align === 'justify' ? 'left' : (style?.align ?? 'left')}
        lineHeight={style?.lineHeight ?? 1.3}
        letterSpacing={style?.letterSpacing ?? 0}
        stroke={effects?.outline?.color}
        strokeWidth={effects?.outline?.width}
        shadowColor={effects?.shadow?.color}
        shadowBlur={effects?.shadow?.blur}
        shadowOffsetX={effects?.shadow?.offsetX}
        shadowOffsetY={effects?.shadow?.offsetY}
        {...gradProps}
      />
    );
  }

  if (layer.type === 'image' || layer.type === 'sticker') {
    return (
      <MediaLayer
        layer={layer}
        selected={selected}
        zIndex={zIndex}
        onSelect={onSelect}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragMove={onDragMove}
        onContextMenu={onContextMenu}
        constrainDrag={constrainDrag}
      />
    );
  }

  // ——— All shape types: mouse drag + resize via ShapeHost ———
  if (layer.shape === 'ellipse') {
    return (
      <ShapeHost {...host}>
        <Ellipse
          x={t.width / 2}
          y={t.height / 2}
          radiusX={Math.max(1, t.width / 2)}
          radiusY={Math.max(1, t.height / 2)}
          {...shapeFillProps(layer, 'center')}
          {...shapeStrokeProps(layer)}
        />
      </ShapeHost>
    );
  }

  if (layer.shape === 'triangle') {
    return (
      <ShapeHost {...host}>
        <Line
          points={[t.width / 2, 0, t.width, t.height, 0, t.height]}
          closed
          {...shapeFillProps(layer, 'corner')}
          {...shapeStrokeProps(layer)}
        />
      </ShapeHost>
    );
  }

  if (layer.shape === 'line') {
    const sw = Math.max(layer.strokeWidth ?? 4, 1);
    const stroke = layer.stroke ?? layer.fill ?? '#0a1214';
    const hostH = Math.max(t.height, Math.max(12, sw + 8));
    const midY = hostH / 2;
    return (
      <ShapeHost {...host}>
        <Line
          points={[0, midY, t.width, midY]}
          stroke={stroke}
          strokeWidth={sw}
          dash={layer.dash}
          lineCap="round"
          hitStrokeWidth={Math.max(sw, 20)}
        />
      </ShapeHost>
    );
  }

  if (layer.shape === 'polygon') {
    const base = Math.max(8, Math.min(t.width, t.height));
    return (
      <ShapeHost {...host}>
        <RegularPolygon
          x={t.width / 2}
          y={t.height / 2}
          sides={6}
          radius={base / 2}
          scaleX={t.width / base}
          scaleY={t.height / base}
          {...shapeFillProps(layer, 'center')}
          {...shapeStrokeProps(layer)}
        />
      </ShapeHost>
    );
  }

  if (layer.shape === 'star') {
    const base = Math.max(8, Math.min(t.width, t.height));
    return (
      <ShapeHost {...host}>
        <Star
          x={t.width / 2}
          y={t.height / 2}
          numPoints={5}
          innerRadius={base / 4}
          outerRadius={base / 2}
          scaleX={t.width / base}
          scaleY={t.height / base}
          {...shapeFillProps(layer, 'center')}
          {...shapeStrokeProps(layer)}
        />
      </ShapeHost>
    );
  }

  if (layer.shape === 'arrow') {
    const sw = Math.max(layer.strokeWidth ?? 4, 1);
    const color = layer.fill ?? layer.stroke ?? '#0a1214';
    const stroke = layer.stroke ?? color;
    const hostH = Math.max(t.height, Math.max(12, sw + 8));
    const midY = hostH / 2;
    return (
      <ShapeHost {...host}>
        <Arrow
          points={[0, midY, t.width, midY]}
          pointerLength={Math.min(24, Math.max(10, sw * 2.5))}
          pointerWidth={Math.min(24, Math.max(10, sw * 2.5))}
          fill={color}
          stroke={stroke}
          strokeWidth={sw}
          dash={layer.dash}
          hitStrokeWidth={Math.max(sw, 20)}
        />
      </ShapeHost>
    );
  }

  // Default rect
  return (
    <ShapeHost {...host}>
      <Rect
        width={t.width}
        height={t.height}
        cornerRadius={layer.cornerRadius ?? 4}
        {...shapeFillProps(layer, 'corner')}
        {...shapeStrokeProps(layer)}
      />
    </ShapeHost>
  );
}

function snapLayerDrag(
  layer: LayerNode,
  nx: number,
  ny: number,
  pagePeers: LayerNode[],
  page: { width: number; height: number },
  opts: { pox: number; poy: number; gridSize: number; scale: number },
) {
  const others = [
    { id: '__page', x: 0, y: 0, width: page.width, height: page.height },
    ...pagePeers
      .filter((l) => l.id !== layer.id && l.visible)
      .map((l) => ({
        id: l.id,
        x: l.transform.x,
        y: l.transform.y,
        width: l.transform.width,
        height: l.transform.height,
      })),
  ];
  const threshold = Math.max(10, 16 / Math.max(0.2, opts.scale));
  const smart = smartAlign(
    {
      id: layer.id,
      x: nx,
      y: ny,
      width: layer.transform.width,
      height: layer.transform.height,
    },
    others,
    threshold,
  );
  const lockedX = smart.guides.some((g) => g.orientation === 'vertical');
  const lockedY = smart.guides.some((g) => g.orientation === 'horizontal');
  const x = lockedX ? smart.x : snapToGrid(nx, opts.gridSize);
  const y = lockedY ? smart.y : snapToGrid(ny, opts.gridSize);
  return {
    x,
    y,
    guides: smart.guides.map((g) => ({
      ...g,
      position: g.position + (g.orientation === 'vertical' ? opts.pox : opts.poy),
    })),
  };
}

function CanvasInner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [spacePan, setSpacePan] = useState(false);
  const [guides, setGuides] = useState<Array<{ orientation: 'horizontal' | 'vertical'; position: number }>>([]);
  const [ctxMenu, setCtxMenu] = useState<LayerContextMenuState | null>(null);
  const didFitRef = useRef(false);
  const lastFitKeyRef = useRef('');
  const draggingIdsRef = useRef(new Set<string>());
  const multiDragRef = useRef<{ lead: string; starts: Record<string, { x: number; y: number }> } | null>(
    null,
  );
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
  const marqueeMovedRef = useRef(false);

  const doc = useImageEditorStore((s) => s.history.present);
  const viewport = useImageEditorStore((s) => s.viewport);
  const setViewport = useImageEditorStore((s) => s.setViewport);
  const selectedIds = useImageEditorStore((s) => s.selectedIds);
  const setSelectedIds = useImageEditorStore((s) => s.setSelectedIds);
  const snapEnabled = useImageEditorStore((s) => s.snapEnabled);
  const gridSize = useImageEditorStore((s) => s.gridSize);
  const gridVisible = useImageEditorStore((s) => s.gridVisible);
  const rulersVisible = useImageEditorStore((s) => s.rulersVisible);
  const updateTransform = useImageEditorStore((s) => s.updateTransform);
  const setLeftTab = useImageEditorStore((s) => s.setLeftTab);
  const activeArtboardId = useImageEditorStore((s) => s.activeArtboardId);
  const setActiveArtboard = useImageEditorStore((s) => s.setActiveArtboard);
  const addArtboard = useImageEditorStore((s) => s.addArtboard);
  const duplicateActivePage = useImageEditorStore((s) => s.duplicateActivePage);

  const activeArtboard =
    doc.artboards.find((a) => a.id === activeArtboardId) ?? doc.artboards[0];
  // Single-page Canva view: only the active page is shown, pinned at a fixed world origin.
  const page = activeArtboard
    ? { ...activeArtboard, x: 0, y: 0 }
    : null;

  const flat = useMemo(() => flattenLayers(doc.layers), [doc.layers]);

  const fitPage = useCallback(
    (mode: 'fit' | 'center' = 'fit') => {
      if (!page || size.width < 40 || size.height < 40) return;
      const rect = { x: page.x, y: page.y, width: page.width, height: page.height };
      setViewport(
        mode === 'fit'
          ? fitRectInView(rect, size, 80)
          : centerRectInView(viewport, rect, size),
      );
    },
    [page, setViewport, size, viewport],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry!.contentRect;
      setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fit when page changes; re-center (keep zoom) when the workspace resizes.
  useEffect(() => {
    if (!page || size.width < 40 || size.height < 40) return;
    const key = `${page.id}:${page.width}x${page.height}`;
    const rect = { x: 0, y: 0, width: page.width, height: page.height };
    if (!didFitRef.current || lastFitKeyRef.current !== key) {
      didFitRef.current = true;
      lastFitKeyRef.current = key;
      setViewport(fitRectInView(rect, size, 80));
      return;
    }
    const vp = useImageEditorStore.getState().viewport;
    setViewport(centerRectInView(vp, rect, size));
  }, [page?.id, page?.width, page?.height, size.width, size.height, setViewport]);

  const setStageRef = useCallback((stage: Konva.Stage | null) => {
    stageRef.current = stage;
    registerEditorStage(stage);
  }, []);

  useEffect(() => {
    return () => registerEditorStage(null);
  }, []);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage || !page) return;
    const fallback = primaryArtboardId(doc);
    const pageLayers = flat.filter(
      (l) => layerArtboardId(l, fallback) === (activeArtboardId ?? page.id),
    );
    const pox = page.x;
    const poy = page.y;
    pageLayers.forEach((layer, i) => {
      const node = stage.findOne(`#${layer.id}`) as Konva.Node | undefined;
      if (!node) return;
      // Don't fight an active mouse drag (React re-renders would snap the node back)
      if (draggingIdsRef.current.has(layer.id)) {
        node.zIndex(i);
        return;
      }
      const t = layer.transform;
      // World coords = page-local + artboard origin (page is usually 0,0)
      node.x(t.x + pox);
      node.y(t.y + poy);
      node.rotation(t.rotation);
      node.opacity(layer.opacity);
      node.scaleX(1);
      node.scaleY(1);

      const lineLike = layer.shape === 'line' || layer.shape === 'arrow';
      const hostH = Math.max(
        t.height,
        lineLike ? Math.max(12, (layer.strokeWidth ?? 4) + 8) : 1,
      );

      if (layer.type === 'image' || layer.type === 'sticker') {
        node.width(t.width);
        node.height(t.height);
        const group = node as Konva.Group;
        const kids = group.getChildren?.() ?? [];
        for (const child of kids) {
          const cls = child.getClassName?.() ?? '';
          if (cls === 'Rect') {
            const r = child as Konva.Rect;
            r.width(Math.max(1, t.width));
            r.height(Math.max(1, t.height));
          }
        }
        const img = group.findOne?.('Image') as Konva.Image | undefined;
        if (img) applyImageAppearance(img, layer);
      } else if (typeof node.width === 'function' && typeof node.height === 'function') {
        try {
          node.width(t.width);
          node.height(layer.type === 'shape' ? hostH : t.height);
        } catch {
          /* some nodes ignore width/height */
        }
      }

      // Refresh inner shape geometry for ShapeHost children
      if (layer.type === 'shape') {
        const group = node as Konva.Group;
        const kids = group.getChildren?.() ?? [];
        for (const child of kids) {
          const cls = child.getClassName?.() ?? '';
          const name = typeof child.name === 'function' ? child.name() : '';
          if (cls === 'Rect' && (name === 'shape-hit' || name === 'shape-sel')) {
            const r = child as Konva.Rect;
            r.width(Math.max(1, t.width));
            r.height(Math.max(1, hostH));
            continue;
          }
          if (cls === 'Ellipse') {
            const el = child as Konva.Ellipse;
            el.x(t.width / 2);
            el.y(t.height / 2);
            el.radiusX(Math.max(1, t.width / 2));
            el.radiusY(Math.max(1, t.height / 2));
            applyShapeAppearance(el, layer);
          } else if (cls === 'Line' || cls === 'Arrow') {
            const line = child as Konva.Line;
            if (layer.shape === 'triangle') {
              line.points([t.width / 2, 0, t.width, t.height, 0, t.height]);
            } else {
              line.points([0, hostH / 2, t.width, hostH / 2]);
            }
            applyShapeAppearance(line, layer);
          } else if (cls === 'RegularPolygon') {
            const base = Math.max(8, Math.min(t.width, t.height));
            const poly = child as Konva.RegularPolygon;
            poly.x(t.width / 2);
            poly.y(t.height / 2);
            poly.radius(base / 2);
            poly.scaleX(t.width / base);
            poly.scaleY(t.height / base);
            applyShapeAppearance(poly, layer);
          } else if (cls === 'Star') {
            const base = Math.max(8, Math.min(t.width, t.height));
            const star = child as Konva.Star;
            star.x(t.width / 2);
            star.y(t.height / 2);
            star.innerRadius(base / 4);
            star.outerRadius(base / 2);
            star.scaleX(t.width / base);
            star.scaleY(t.height / base);
            applyShapeAppearance(star, layer);
          } else if (cls === 'Rect') {
            const rect = child as Konva.Rect;
            rect.width(t.width);
            rect.height(t.height);
            applyShapeAppearance(rect, layer);
          }
        }
      }

      node.zIndex(i);
    });
    trRef.current?.forceUpdate();
    stage.batchDraw();
  }, [flat, page, activeArtboardId, doc]);

  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;
    const nodes = selectedIds
      .map((id) => stage.findOne(`#${id}`))
      .filter(Boolean) as Konva.Node[];
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, flat, page]);

  const onWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      // Wheel / trackpad zoom (Canva-like); Shift+wheel pans horizontally
      if (e.evt.shiftKey) {
        setViewport(panBy(viewport, -e.evt.deltaY, 0));
        return;
      }
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const delta = e.evt.deltaY > 0 ? 0.92 : 1.08;
      setViewport(zoomAtPoint(viewport, pointer, delta, 0.05, 8));
    },
    [setViewport, viewport],
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target as HTMLElement)?.matches?.('input,textarea,select,[contenteditable]')) {
        e.preventDefault();
        setSpacePan(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePan(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const selectLayer = useCallback(
    (id: string, e?: Konva.KonvaEventObject<MouseEvent | Event>) => {
      const evt = e?.evt as MouseEvent | undefined;
      const multi = Boolean(evt?.shiftKey || evt?.ctrlKey || evt?.metaKey);
      if (multi) {
        const cur = useImageEditorStore.getState().selectedIds;
        if (cur.includes(id)) setSelectedIds(cur.filter((x) => x !== id));
        else setSelectedIds([...cur, id]);
      } else {
        setSelectedIds([id]);
        const layer = flat.find((l) => l.id === id);
        if (layer?.type === 'text' || layer?.type === 'cta') setLeftTab('text');
      }
    },
    [setSelectedIds, setLeftTab, flat],
  );

  const openLayerMenu = useCallback(
    (layerId: string, e: Konva.KonvaEventObject<PointerEvent>) => {
      e.evt.preventDefault();
      e.cancelBubble = true;
      const cur = useImageEditorStore.getState().selectedIds;
      if (!cur.includes(layerId)) setSelectedIds([layerId]);
      setCtxMenu({ x: e.evt.clientX, y: e.evt.clientY, layerId });
    },
    [setSelectedIds],
  );

  const zoomPct = Math.round(viewport.scale * 100);
  const pageScreen = page
    ? {
        left: page.x * viewport.scale + viewport.x,
        top: page.y * viewport.scale + viewport.y,
        width: page.width * viewport.scale,
        height: page.height * viewport.scale,
      }
    : null;

  return (
    <div
      ref={containerRef}
      className="canvas-stage-root relative h-full w-full overflow-hidden"
      style={{ cursor: spacePan ? 'grab' : undefined }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Stage
        ref={setStageRef}
        width={size.width}
        height={size.height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        onWheel={onWheel}
        draggable={spacePan}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            setViewport({ ...viewport, x: e.target.x(), y: e.target.y() });
          }
        }}
        onMouseDown={(e) => {
          const cls = e.target.getClassName?.() ?? '';
          const name = typeof e.target.name === 'function' ? e.target.name() : '';
          const empty =
            e.target === stageRef.current ||
            name === 'artboard-bg' ||
            cls === 'Stage';
          if (!empty || spacePan) return;
          const pos = stageRef.current?.getRelativePointerPosition();
          if (!pos) return;
          marqueeStartRef.current = pos;
          marqueeMovedRef.current = false;
          setMarquee({ x: pos.x, y: pos.y, w: 0, h: 0 });
          if (!(e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey)) setSelectedIds([]);
        }}
        onMouseMove={(e) => {
          if (e.evt.buttons === 4 || (spacePan && e.evt.buttons === 1)) {
            setViewport(panBy(viewport, e.evt.movementX, e.evt.movementY));
            return;
          }
          const start = marqueeStartRef.current;
          if (!start || e.evt.buttons !== 1) return;
          const pos = stageRef.current?.getRelativePointerPosition();
          if (!pos) return;
          const x = Math.min(start.x, pos.x);
          const y = Math.min(start.y, pos.y);
          const w = Math.abs(pos.x - start.x);
          const h = Math.abs(pos.y - start.y);
          if (w > 4 || h > 4) marqueeMovedRef.current = true;
          setMarquee({ x, y, w, h });
        }}
        onMouseUp={(e) => {
          const start = marqueeStartRef.current;
          const box = marquee;
          marqueeStartRef.current = null;
          setMarquee(null);
          if (!start || !marqueeMovedRef.current || !box || (box.w < 8 && box.h < 8)) return;
          const stage = stageRef.current;
          if (!stage || !page) return;
          const fallback = primaryArtboardId(doc);
          const pageLayers = flat.filter(
            (l) => layerArtboardId(l, fallback) === (activeArtboardId ?? page.id) && l.visible && !l.locked,
          );
          const hit: string[] = [];
          for (const l of pageLayers) {
            const node = stage.findOne(`#${l.id}`);
            if (!node) continue;
            const r = node.getClientRect({ relativeTo: stage, skipShadow: true });
            if (
              r.x < box.x + box.w &&
              r.x + r.width > box.x &&
              r.y < box.y + box.h &&
              r.y + r.height > box.y
            ) {
              hit.push(l.id);
            }
          }
          if (e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey) {
            const cur = useImageEditorStore.getState().selectedIds;
            setSelectedIds([...new Set([...cur, ...hit])]);
          } else {
            setSelectedIds(hit);
          }
        }}
      >
        <Layer>
          {page ? (
            <Group key={page.id}>
              <Rect
                id={`artboard-${page.id}`}
                name="artboard-bg"
                x={page.x}
                y={page.y}
                width={page.width}
                height={page.height}
                fill={
                  page.background === 'transparent' || page.background === 'none'
                    ? 'rgba(0,0,0,0)'
                    : page.background
                }
                shadowColor="rgba(15, 23, 42, 0.22)"
                shadowBlur={36}
                shadowOffsetY={10}
                shadowOpacity={0.85}
                cornerRadius={0}
                listening
                onMouseDown={(e) => {
                  e.cancelBubble = true;
                  if (spacePan) return;
                  const pos = stageRef.current?.getRelativePointerPosition();
                  if (!pos) return;
                  marqueeStartRef.current = pos;
                  marqueeMovedRef.current = false;
                  setMarquee({ x: pos.x, y: pos.y, w: 0, h: 0 });
                  if (!(e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey)) setSelectedIds([]);
                }}
                onClick={(e) => {
                  e.cancelBubble = true;
                  if (marqueeMovedRef.current) return;
                  setSelectedIds([]);
                  setActiveArtboard(page.id, false);
                }}
                onTap={(e) => {
                  e.cancelBubble = true;
                  if (marqueeMovedRef.current) return;
                  setSelectedIds([]);
                  setActiveArtboard(page.id, false);
                }}
              />
              {gridVisible ? (
                <Group
                  name="editor-grid"
                  listening={false}
                  clipX={page.x}
                  clipY={page.y}
                  clipWidth={page.width}
                  clipHeight={page.height}
                >
                  {(() => {
                    const step = Math.max(20, gridSize);
                    const sw = 1 / viewport.scale;
                    const v: ReactNode[] = [];
                    const h: ReactNode[] = [];
                    for (let x = 0; x <= page.width; x += step) {
                      v.push(
                        <Line
                          key={`vg-${x}`}
                          points={[page.x + x, page.y, page.x + x, page.y + page.height]}
                          stroke={x % (step * 2) === 0 ? 'rgba(139,61,255,0.28)' : 'rgba(15,28,32,0.14)'}
                          strokeWidth={sw}
                        />,
                      );
                    }
                    for (let y = 0; y <= page.height; y += step) {
                      h.push(
                        <Line
                          key={`hg-${y}`}
                          points={[page.x, page.y + y, page.x + page.width, page.y + y]}
                          stroke={y % (step * 2) === 0 ? 'rgba(139,61,255,0.28)' : 'rgba(15,28,32,0.14)'}
                          strokeWidth={sw}
                        />,
                      );
                    }
                    return (
                      <>
                        {v}
                        {h}
                      </>
                    );
                  })()}
                </Group>
              ) : null}
              <Text
                text={`${page.name} · ${page.width}×${page.height}`}
                x={page.x}
                y={page.y - 28}
                fontSize={13}
                fill="#6b7280"
                fontFamily="Source Sans 3"
                listening={false}
              />
            </Group>
          ) : null}

          {rulersVisible && page ? (
            <Group name="editor-rulers" listening={false}>
              {(() => {
                const ab = page;
                const step = 100;
                const sw = 1 / viewport.scale;
                const ticksX: number[] = [];
                const ticksY: number[] = [];
                for (let x = 0; x <= ab.width; x += step) ticksX.push(x);
                for (let y = 0; y <= ab.height; y += step) ticksY.push(y);
                return (
                  <>
                    <Rect
                      x={ab.x}
                      y={ab.y - 24}
                      width={ab.width}
                      height={24}
                      fill="rgba(255,255,255,0.92)"
                      stroke="#c4c7cf"
                      strokeWidth={sw}
                    />
                    <Rect
                      x={ab.x - 24}
                      y={ab.y}
                      width={24}
                      height={ab.height}
                      fill="rgba(255,255,255,0.92)"
                      stroke="#c4c7cf"
                      strokeWidth={sw}
                    />
                    {ticksX.map((x) => (
                      <Group key={`rx-${x}`}>
                        <Line
                          points={[
                            ab.x + x,
                            ab.y - 24,
                            ab.x + x,
                            ab.y - (x % 200 === 0 ? 4 : 12),
                          ]}
                          stroke="#6b7280"
                          strokeWidth={sw}
                        />
                        {x % 200 === 0 ? (
                          <Text
                            text={String(x)}
                            x={ab.x + x + 2}
                            y={ab.y - 20}
                            fontSize={Math.max(9, 10 / viewport.scale)}
                            fill="#6b7280"
                            fontFamily="Source Sans 3"
                          />
                        ) : null}
                      </Group>
                    ))}
                    {ticksY.map((y) => (
                      <Group key={`ry-${y}`}>
                        <Line
                          points={[
                            ab.x - 24,
                            ab.y + y,
                            ab.x - (y % 200 === 0 ? 4 : 12),
                            ab.y + y,
                          ]}
                          stroke="#6b7280"
                          strokeWidth={sw}
                        />
                        {y % 200 === 0 ? (
                          <Text
                            text={String(y)}
                            x={ab.x - 22}
                            y={ab.y + y + 2}
                            fontSize={Math.max(9, 10 / viewport.scale)}
                            fill="#6b7280"
                            fontFamily="Source Sans 3"
                            rotation={-90}
                          />
                        ) : null}
                      </Group>
                    ))}
                  </>
                );
              })()}
            </Group>
          ) : null}

          {page
            ? (() => {
                const fallback = primaryArtboardId(doc);
                const pageLayers = flat.filter(
                  (l) => layerArtboardId(l, fallback) === (activeArtboardId ?? page.id),
                );
                const pox = page.x;
                const poy = page.y;
                return (
                  <Group
                    key={`page-clip-${page.id}`}
                    clipX={page.x}
                    clipY={page.y}
                    clipWidth={page.width}
                    clipHeight={page.height}
                  >
                    {pageLayers.map((layer, layerIndex) => {
                      const pagePeers = pageLayers;
                      const absLayer: LayerNode = {
                        ...layer,
                        transform: {
                          ...layer.transform,
                          x: layer.transform.x + pox,
                          y: layer.transform.y + poy,
                        },
                      };
                      return (
                        <LayerShape
                          key={layer.id}
                          layer={absLayer}
                          zIndex={layerIndex}
                          selected={selectedIds.includes(layer.id)}
                          constrainDrag={
                            snapEnabled
                              ? (pos) => {
                                  const snapped = snapLayerDrag(
                                    layer,
                                    pos.x - pox,
                                    pos.y - poy,
                                    pagePeers,
                                    page,
                                    { pox, poy, gridSize, scale: viewport.scale },
                                  );
                                  return { x: snapped.x + pox, y: snapped.y + poy };
                                }
                              : undefined
                          }
                          onSelect={(e) => {
                            setActiveArtboard(page.id, false);
                            selectLayer(layer.id, e);
                          }}
                          onEditText={() => {
                            setActiveArtboard(page.id, false);
                            const ids = useImageEditorStore.getState().selectedIds;
                            if (!ids.includes(layer.id)) setSelectedIds([layer.id]);
                            if (layer.type === 'text' || layer.type === 'cta') {
                              setLeftTab('text');
                              const next = window.prompt('Edit text', layer.text ?? '');
                              if (next != null) {
                                useImageEditorStore.getState().updateTextContent(layer.id, next);
                              }
                            }
                          }}
                          onContextMenu={(e) => {
                            setActiveArtboard(page.id, false);
                            openLayerMenu(layer.id, e);
                          }}
                          onDragStart={() => {
                            draggingIdsRef.current.add(layer.id);
                            const ids = useImageEditorStore.getState().selectedIds;
                            const stage = stageRef.current;
                            if (!stage || ids.length < 2 || !ids.includes(layer.id)) {
                              multiDragRef.current = null;
                              return;
                            }
                            const starts: Record<string, { x: number; y: number }> = {};
                            for (const id of ids) {
                              draggingIdsRef.current.add(id);
                              const n = stage.findOne(`#${id}`);
                              if (n) starts[id] = { x: n.x(), y: n.y() };
                            }
                            multiDragRef.current = { lead: layer.id, starts };
                          }}
                          onDragEnd={(x, y) => {
                            const multi = multiDragRef.current;
                            multiDragRef.current = null;
                            const ids = multi ? Object.keys(multi.starts) : [layer.id];
                            for (const id of ids) draggingIdsRef.current.delete(id);
                            const stage = stageRef.current;
                            if (snapEnabled) {
                              const snapped = snapLayerDrag(layer, x - pox, y - poy, pagePeers, page, {
                                pox,
                                poy,
                                gridSize,
                                scale: viewport.scale,
                              });
                              setGuides(snapped.guides);
                              window.setTimeout(() => setGuides([]), 400);
                            } else {
                              setGuides([]);
                            }
                            if (!stage || ids.length === 1) {
                              let nx = x - pox;
                              let ny = y - poy;
                              if (snapEnabled) {
                                const snapped = snapLayerDrag(layer, nx, ny, pagePeers, page, {
                                  pox,
                                  poy,
                                  gridSize,
                                  scale: viewport.scale,
                                });
                                nx = snapped.x;
                                ny = snapped.y;
                              }
                              updateTransform(layer.id, { x: nx, y: ny });
                              return;
                            }
                            const leadStart = multi?.starts[layer.id];
                            const dx = leadStart ? x - leadStart.x : 0;
                            const dy = leadStart ? y - leadStart.y : 0;
                            for (const id of ids) {
                              if (id === layer.id) {
                                updateTransform(id, { x: x - pox, y: y - poy });
                                continue;
                              }
                              const start = multi?.starts[id];
                              if (!start) continue;
                              updateTransform(id, { x: start.x + dx - pox, y: start.y + dy - poy });
                            }
                          }}
                          onDragMove={(x, y) => {
                            const multi = multiDragRef.current;
                            if (multi && multi.lead === layer.id) {
                              const start = multi.starts[layer.id];
                              const stage = stageRef.current;
                              if (start && stage) {
                                const dx = x - start.x;
                                const dy = y - start.y;
                                for (const [id, s] of Object.entries(multi.starts)) {
                                  if (id === layer.id) continue;
                                  stage.findOne(`#${id}`)?.position({ x: s.x + dx, y: s.y + dy });
                                }
                              }
                            }
                            if (!snapEnabled) return undefined;
                            const snapped = snapLayerDrag(
                              layer,
                              x - pox,
                              y - poy,
                              pagePeers,
                              page,
                              { pox, poy, gridSize, scale: viewport.scale },
                            );
                            setGuides(snapped.guides);
                            return { x: snapped.x + pox, y: snapped.y + poy };
                          }}
                        />
                      );
                    })}
                  </Group>
                );
              })()
            : null}
          {marquee && marquee.w > 2 && marquee.h > 2 ? (
            <Rect
              name="marquee-select"
              x={marquee.x}
              y={marquee.y}
              width={marquee.w}
              height={marquee.h}
              fill="rgba(139,61,255,0.12)"
              stroke="#8b3dff"
              strokeWidth={1 / viewport.scale}
              dash={[6 / viewport.scale, 4 / viewport.scale]}
              listening={false}
            />
          ) : null}
          <Transformer
            ref={trRef}
            rotateEnabled
            keepRatio={selectedIds.length > 1}
            ignoreStroke
            borderStroke="#111827"
            borderStrokeWidth={1}
            anchorFill="#ffffff"
            anchorStroke="#111827"
            anchorSize={10}
            anchorCornerRadius={10}
            boundBoxFunc={(oldBox, newBox) => {
              const selected = useImageEditorStore.getState().selectedIds[0];
              const layer = selected
                ? flat.find((l) => l.id === selected)
                : undefined;
              const lineLike = layer?.shape === 'line' || layer?.shape === 'arrow';
              const min = lineLike ? 4 : 8;
              if (newBox.width < min || newBox.height < min) return oldBox;
              return newBox;
            }}
            onTransformEnd={() => {
              const stage = stageRef.current;
              if (!stage || !page) return;
              for (const id of selectedIds) {
                const node = stage.findOne(`#${id}`);
                if (!node) continue;
                const layer = flat.find((l) => l.id === id);
                const pox = page.x;
                const poy = page.y;
                // ShapeHost + most layers use top-left origin
                let x = node.x() - pox;
                let y = node.y() - poy;
                if (snapEnabled) {
                  x = snapToGrid(x, gridSize);
                  y = snapToGrid(y, gridSize);
                }
                const lineLike = layer?.shape === 'line' || layer?.shape === 'arrow';
                const minDim = lineLike ? 2 : 8;
                let nextW = Math.max(minDim, Math.abs(node.width() * node.scaleX()));
                let nextH = Math.max(minDim, Math.abs(node.height() * node.scaleY()));
                if (lineLike) {
                  nextH = Math.max(layer?.strokeWidth ?? 4, nextH);
                }
                // Flip via negative scale → keep positive size, adjust origin
                if (node.scaleX() < 0) x -= nextW;
                if (node.scaleY() < 0) y -= nextH;
                const flipX = (layer?.transform.scaleX ?? 1) < 0 ? -1 : 1;
                const flipY = (layer?.transform.scaleY ?? 1) < 0 ? -1 : 1;
                updateTransform(id, {
                  x,
                  y,
                  width: nextW,
                  height: nextH,
                  rotation: node.rotation(),
                  scaleX: flipX,
                  scaleY: flipY,
                });
                node.scaleX(1);
                node.scaleY(1);
                node.width(nextW);
                node.height(nextH);
              }
            }}
          />
          {guides.map((g, i) =>
            g.orientation === 'vertical' ? (
              <Line
                key={`guide-v-${i}`}
                points={[g.position, -2000, g.position, 4000]}
                stroke="#ec4899"
                strokeWidth={1 / viewport.scale}
                listening={false}
              />
            ) : (
              <Line
                key={`guide-h-${i}`}
                points={[-2000, g.position, 4000, g.position]}
                stroke="#3b82f6"
                strokeWidth={1 / viewport.scale}
                listening={false}
              />
            ),
          )}
        </Layer>
      </Stage>

      {pageScreen && pageScreen.width > 40 && (
        <>
          <div
            className="canvas-page-actions"
            style={{
              left: pageScreen.left + pageScreen.width - 4,
              top: Math.max(8, pageScreen.top - 36),
            }}
          >
            <button
              type="button"
              title="Duplicate page"
              aria-label="Duplicate page"
              onClick={() => duplicateActivePage()}
            >
              <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
                <rect x="6" y="6" width="10" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <rect x="3" y="3" width="10" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
            <button
              type="button"
              title="Add page"
              aria-label="Add page"
              onClick={() => addArtboard(page?.width ?? 1080, page?.height ?? 1080)}
            >
              <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
                <rect x="3.5" y="3.5" width="13" height="13" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="M10 7v6M7 10h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <button
            type="button"
            className="canvas-add-page"
            style={{
              left: pageScreen.left,
              top: pageScreen.top + pageScreen.height + 14,
              width: Math.max(160, pageScreen.width),
            }}
            onClick={() => addArtboard(page?.width ?? 1080, page?.height ?? 1080)}
          >
            <span>+ Add page</span>
            <span className="canvas-add-page-chevron" aria-hidden>
              ▾
            </span>
          </button>
        </>
      )}

      <div className="canvas-zoom-hud" role="group" aria-label="Zoom">
        <button
          type="button"
          className="canvas-zoom-btn"
          title="Zoom out"
          onClick={() =>
            setViewport(setZoomAtCenter(viewport, size, viewport.scale / 1.15, 0.05, 8))
          }
        >
          −
        </button>
        <input
          type="range"
          className="canvas-zoom-slider"
          min={5}
          max={400}
          step={1}
          value={Math.min(400, Math.max(5, zoomPct))}
          aria-label="Zoom level"
          onChange={(e) => {
            const pct = Number(e.target.value);
            setViewport(setZoomAtCenter(viewport, size, pct / 100, 0.05, 8));
          }}
        />
        <button
          type="button"
          className="canvas-zoom-btn"
          title="Zoom in"
          onClick={() =>
            setViewport(setZoomAtCenter(viewport, size, viewport.scale * 1.15, 0.05, 8))
          }
        >
          +
        </button>
        <button
          type="button"
          className="canvas-zoom-pct"
          title="Fit page to screen"
          onClick={() => fitPage('fit')}
        >
          {zoomPct}%
        </button>
      </div>

      {ctxMenu && <LayerContextMenu menu={ctxMenu} onClose={() => setCtxMenu(null)} />}
    </div>
  );
}

export function CanvasStage() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-ink-600">
        Loading canvas…
      </div>
    );
  }
  return <CanvasInner />;
}
