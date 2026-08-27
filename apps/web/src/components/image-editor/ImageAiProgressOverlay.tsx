/**
 * Animated progress overlay drawn on top of an image while AI runs.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import { formatElapsed } from '@/lib/processProgress';
import { useLayerAiProgressStore } from '@/store/layerAiProgressStore';

export function ImageAiProgressOverlay({
  layerId,
  width,
  height,
}: {
  layerId: string;
  width: number;
  height: number;
}) {
  const job = useLayerAiProgressStore((s) => s.job);
  const active = job?.layerId === layerId ? job : null;
  const [elapsedMs, setElapsedMs] = useState(0);
  const [pulse, setPulse] = useState(0);
  const barRef = useRef<Konva.Rect>(null);

  useEffect(() => {
    if (!active) return;
    const tick = window.setInterval(() => {
      setElapsedMs(Date.now() - active.startedAt);
    }, 200);
    return () => window.clearInterval(tick);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let start = performance.now();
    const loop = (now: number) => {
      const t = ((now - start) % 1400) / 1400;
      setPulse(t);
      barRef.current?.getLayer()?.batchDraw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  if (!active || width < 40 || height < 40) return null;

  const pad = Math.max(10, Math.min(width, height) * 0.06);
  const barH = Math.max(6, Math.min(12, height * 0.025));
  const barW = Math.max(80, width - pad * 2);
  const barX = (width - barW) / 2;
  const barY = height * 0.58;
  const known = active.percent != null;
  const fillW = known
    ? Math.max(barH, (barW * active.percent!) / 100)
    : Math.max(barH, barW * 0.32);
  const slideX = known ? 0 : (barW - fillW) * pulse;
  const titleSize = Math.max(11, Math.min(16, width * 0.045));
  const subSize = Math.max(10, Math.min(13, width * 0.035));
  const kindLabel =
    active.kind === 'remove-bg'
      ? 'Removing background'
      : active.kind === 'replace-bg'
        ? 'Replacing background'
        : 'Processing';

  return (
    <Group listening={false}>
      <Rect width={width} height={height} fill="rgba(10, 18, 20, 0.55)" cornerRadius={4} />
      <Text
        text={kindLabel}
        width={width - pad * 2}
        x={pad}
        y={height * 0.38}
        align="center"
        fontSize={titleSize}
        fontStyle="bold"
        fontFamily="Source Sans 3"
        fill="#ffffff"
      />
      <Text
        text={`${active.label}\nProcess time ${formatElapsed(elapsedMs)}`}
        width={width - pad * 2}
        x={pad}
        y={height * 0.38 + titleSize + 8}
        align="center"
        fontSize={subSize}
        fontFamily="Source Sans 3"
        fill="rgba(255,255,255,0.85)"
        lineHeight={1.35}
      />
      <Rect
        x={barX}
        y={barY}
        width={barW}
        height={barH}
        cornerRadius={barH / 2}
        fill="rgba(255,255,255,0.22)"
      />
      <Rect
        ref={barRef}
        x={barX + slideX}
        y={barY}
        width={fillW}
        height={barH}
        cornerRadius={barH / 2}
        fill="#8b3dff"
        shadowColor="#8b3dff"
        shadowBlur={10}
        shadowOpacity={0.55}
      />
      {known ? (
        <Text
          text={`${Math.round(active.percent!)}%`}
          x={barX}
          y={barY + barH + 8}
          width={barW}
          align="center"
          fontSize={subSize}
          fontFamily="Source Sans 3"
          fill="#ffffff"
        />
      ) : null}
    </Group>
  );
}
