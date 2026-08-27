/**
 * Circular-path text for Konva — places each character along an arc.
 * curve: -50..50 (0 = flat / unused). Positive curves upward (frown), negative downward (smile).
 */
'use client';

import { Group, Text } from 'react-konva';
import type Konva from 'konva';

export interface CurvedTextProps {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
  globalCompositeOperation?: GlobalCompositeOperation;
  draggable?: boolean;
  fontFamily: string;
  fontSize: number;
  fontStyle: string;
  fill: string;
  letterSpacing?: number;
  /** -50..50 intensity */
  curve: number;
  textDecoration?: string;
  stroke?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  onClick?: (e?: Konva.KonvaEventObject<MouseEvent | Event>) => void;
  onTap?: (e?: Konva.KonvaEventObject<MouseEvent | Event>) => void;
  onDblClick?: () => void;
  onDblTap?: () => void;
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragMove?: (e: Konva.KonvaEventObject<DragEvent>) => void;
}

export function CurvedText({
  id,
  text,
  x,
  y,
  width,
  height,
  rotation = 0,
  scaleX = 1,
  scaleY = 1,
  opacity = 1,
  globalCompositeOperation = 'source-over',
  draggable = true,
  fontFamily,
  fontSize,
  fontStyle,
  fill,
  letterSpacing = 0,
  curve,
  textDecoration,
  stroke,
  strokeWidth,
  shadowColor,
  shadowBlur,
  shadowOffsetX,
  shadowOffsetY,
  onClick,
  onTap,
  onDblClick,
  onDblTap,
  onDragEnd,
  onDragMove,
}: CurvedTextProps) {
  const chars = Array.from(text.replace(/\n/g, ' '));
  const n = Math.max(chars.length, 1);
  // Stronger |curve| → tighter radius / wider sweep
  const intensity = Math.max(0.05, Math.abs(curve) / 50);
  const radius = Math.max(width / (Math.PI * intensity * 1.2), fontSize * 2.5);
  const totalArc = Math.min(Math.PI * 1.4, (n * (fontSize * 0.55 + letterSpacing)) / radius);
  const startAngle = -totalArc / 2;
  const direction = curve >= 0 ? 1 : -1;
  const cx = width / 2;
  const cy = direction > 0 ? radius : height - radius;

  return (
    <Group
      id={id}
      x={x}
      y={y}
      width={width}
      height={height}
      rotation={rotation}
      scaleX={scaleX}
      scaleY={scaleY}
      opacity={opacity}
      globalCompositeOperation={globalCompositeOperation}
      draggable={draggable}
      onClick={onClick}
      onTap={onTap}
      onDblClick={onDblClick}
      onDblTap={onDblTap}
      onDragEnd={onDragEnd}
      onDragMove={onDragMove}
    >
      {chars.map((ch, i) => {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const angle = startAngle + t * totalArc;
        const px = cx + radius * Math.sin(angle);
        const py = cy - direction * radius * Math.cos(angle) + (direction > 0 ? 0 : 0);
        const rot = (angle * 180) / Math.PI;
        return (
          <Text
            key={`${i}-${ch}`}
            text={ch}
            x={px}
            y={py}
            fontFamily={fontFamily}
            fontSize={fontSize}
            fontStyle={fontStyle}
            fill={fill}
            textDecoration={textDecoration}
            stroke={stroke}
            strokeWidth={strokeWidth}
            shadowColor={shadowColor}
            shadowBlur={shadowBlur}
            shadowOffsetX={shadowOffsetX}
            shadowOffsetY={shadowOffsetY}
            offsetX={fontSize * 0.3}
            offsetY={fontSize * 0.75}
            rotation={rot}
            listening={false}
          />
        );
      })}
    </Group>
  );
}
