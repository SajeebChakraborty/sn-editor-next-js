/**
 * Live interactive tutorial — mini Konva canvas that builds a design step-by-step.
 */
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Text, Circle, Group, Line } from 'react-konva';

type Step = {
  id: string;
  title: string;
  tip: string;
  reveal: number; // bits: 1 bg, 2 title, 4 sub, 8 bar, 16 btn, 32 accent, 64 guides
};

const STEPS: Step[] = [
  {
    id: 'start',
    title: 'Start with a blank artboard',
    tip: 'Every design begins on a sized canvas — Instagram, Story, YouTube, or custom.',
    reveal: 1,
  },
  {
    id: 'headline',
    title: 'Add a headline',
    tip: 'Drop bold type from Text. Drag to place. Snap guides help you align.',
    reveal: 1 | 2 | 64,
  },
  {
    id: 'sub',
    title: 'Support with body copy',
    tip: 'Pair a short line under the headline so the message is clear in one glance.',
    reveal: 1 | 2 | 4,
  },
  {
    id: 'accent',
    title: 'Paint with brand shapes',
    tip: 'Elements → shapes. Accent bars and blocks make the layout feel designed.',
    reveal: 1 | 2 | 4 | 8 | 32,
  },
  {
    id: 'cta',
    title: 'Add a call to action',
    tip: 'A button shape + label turns the post into something shoppable.',
    reveal: 1 | 2 | 4 | 8 | 16 | 32,
  },
  {
    id: 'polish',
    title: 'Polish & export',
    tip: 'Snap, resize for other channels, then export PNG or PDF. Ready to post.',
    reveal: 1 | 2 | 4 | 8 | 16 | 32,
  },
];

const W = 320;
const H = 320;
const AUTO_MS = 4200;

export function LiveTutorial() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [cursor, setCursor] = useState({ x: 40, y: 40, visible: false });
  const cursorRef = useRef({ x: 40, y: 40 });

  const current = STEPS[step]!;
  const reveal = current.reveal;

  useEffect(() => {
    setMounted(true);
  }, []);

  const go = useCallback((next: number) => {
    setStep(Math.max(0, Math.min(STEPS.length - 1, next)));
  }, []);

  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, AUTO_MS);
    return () => window.clearTimeout(t);
  }, [playing, step]);

  // Fake cursor motion per step
  useEffect(() => {
    const targets: Record<string, { x: number; y: number }> = {
      start: { x: 160, y: 160 },
      headline: { x: 100, y: 110 },
      sub: { x: 120, y: 155 },
      accent: { x: 60, y: 200 },
      cta: { x: 100, y: 240 },
      polish: { x: 260, y: 40 },
    };
    const to = targets[current.id] ?? { x: 160, y: 160 };
    const start = { ...cursorRef.current };
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 700);
      const e = 1 - (1 - p) ** 3;
      const next = {
        x: start.x + (to.x - start.x) * e,
        y: start.y + (to.y - start.y) * e,
        visible: true,
      };
      cursorRef.current = next;
      setCursor(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [current.id]);

  return (
    <div className="live-tut">
      <div className="live-tut-copy">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-600">
          Live tutorial
        </p>
        <h2 className="mt-3 font-display text-3xl text-ink-950 sm:text-4xl">
          Watch a post come together
        </h2>
        <p className="mt-3 text-ink-700">
          An interactive walkthrough of the image editor. Pause anytime, jump steps, then open the
          full canvas.
        </p>

        <ol className="live-tut-steps">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                className={i === step ? 'on' : undefined}
                onClick={() => {
                  setPlaying(false);
                  go(i);
                }}
              >
                <span className="live-tut-num">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <strong>{s.title}</strong>
                  {i === step && <em>{s.tip}</em>}
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div className="live-tut-controls">
          <button
            type="button"
            className="shot-nav-btn"
            onClick={() => {
              setPlaying(false);
              go(step - 1);
            }}
            aria-label="Previous step"
          >
            ←
          </button>
          <button
            type="button"
            className="landing-cta-secondary live-tut-play"
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            className="shot-nav-btn"
            onClick={() => {
              setPlaying(false);
              go(step + 1);
            }}
            aria-label="Next step"
          >
            →
          </button>
          <Link href="/editor" className="landing-cta-primary">
            Try this in the editor
          </Link>
        </div>
      </div>

      <div className="live-tut-stage-wrap">
        <div className="live-tut-frame">
          <div className="live-tut-toolbar">
            <span>File</span>
            <span>Resize</span>
            <strong>Live demo</strong>
            <span className="live-tut-zoom">100%</span>
          </div>
          <div className="live-tut-canvas">
            {!mounted ? (
              <div
                className="shot-board shot-board-brand"
                style={{ width: W, height: H }}
                aria-hidden
              />
            ) : (
            <Stage width={W} height={H}>
              <Layer>
                {/* Artboard */}
                {(reveal & 1) !== 0 && (
                  <Rect
                    x={0}
                    y={0}
                    width={W}
                    height={H}
                    fill="#f5e6d3"
                    cornerRadius={2}
                    shadowColor="rgba(0,0,0,0.35)"
                    shadowBlur={24}
                    shadowOffsetY={10}
                    shadowOpacity={0.5}
                  />
                )}

                {(reveal & 64) !== 0 && (
                  <Group opacity={0.55}>
                    <Line points={[24, 96, 296, 96]} stroke="#8b3dff" strokeWidth={1} dash={[6, 4]} />
                    <Line points={[40, 40, 40, 280]} stroke="#8b3dff" strokeWidth={1} dash={[6, 4]} />
                  </Group>
                )}

                {(reveal & 2) !== 0 && (
                  <Text
                    x={36}
                    y={88}
                    width={240}
                    text="Meet SN Editor"
                    fontFamily="Georgia, serif"
                    fontSize={36}
                    fontStyle="bold"
                    fill="#1a1a1a"
                  />
                )}

                {(reveal & 4) !== 0 && (
                  <Text
                    x={36}
                    y={138}
                    width={220}
                    text="Design that feels effortless"
                    fontFamily="Arial, sans-serif"
                    fontSize={14}
                    fill="#444"
                  />
                )}

                {(reveal & 8) !== 0 && (
                  <Rect x={36} y={178} width={120} height={10} fill="#f97316" cornerRadius={2} />
                )}

                {(reveal & 16) !== 0 && (
                  <Group>
                    <Rect x={36} y={210} width={118} height={36} fill="#f97316" cornerRadius={6} />
                    <Text
                      x={36}
                      y={219}
                      width={118}
                      align="center"
                      text="Learn More"
                      fontSize={13}
                      fontStyle="bold"
                      fill="#fff"
                      fontFamily="Arial, sans-serif"
                    />
                  </Group>
                )}

                {(reveal & 32) !== 0 && (
                  <Rect x={248} y={36} width={44} height={44} fill="#eab308" cornerRadius={4} />
                )}

                {step === STEPS.length - 1 && (
                  <Group>
                    <Circle x={278} y={278} radius={22} fill="#8b3dff" />
                    <Text
                      x={256}
                      y={270}
                      width={44}
                      align="center"
                      text="✓"
                      fontSize={18}
                      fill="#fff"
                      fontStyle="bold"
                    />
                  </Group>
                )}

                {/* Cursor */}
                {cursor.visible && (
                  <Group x={cursor.x} y={cursor.y}>
                    <Line
                      points={[0, 0, 0, 18, 5, 14, 9, 22, 12, 21, 8, 12, 14, 12]}
                      closed
                      fill="#fff"
                      stroke="#111"
                      strokeWidth={1.2}
                      shadowColor="rgba(0,0,0,0.4)"
                      shadowBlur={4}
                      shadowOffsetY={1}
                    />
                  </Group>
                )}
              </Layer>
            </Stage>
            )}
          </div>
          <div className="live-tut-pages">
            <span className="on">1 · Post</span>
            <span className={step >= 4 ? 'hint' : undefined}>+ Page</span>
          </div>
        </div>
        <p className="live-tut-caption">
          <strong>{current.title}</strong>
          <span>{current.tip}</span>
        </p>
      </div>
    </div>
  );
}
