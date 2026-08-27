/**
 * Animated mini demos for transitions & motion effects (preview before apply).
 */
'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

export type TransitionDemoId =
  | 'none'
  | 'fade'
  | 'dissolve'
  | 'slide_left'
  | 'slide_right'
  | 'slide_up'
  | 'slide_down'
  | 'zoom'
  | 'zoom_out'
  | 'wipe'
  | 'wipe_vertical'
  | 'blur'
  | 'flash'
  | 'spin';

export type EffectDemoId =
  | 'fade'
  | 'zoom_punch'
  | 'glitch_flash'
  | 'color_grade'
  | 'blur_soft'
  | 'vhs'
  | 'mirror'
  | 'shake'
  | 'glow'
  | 'bw_punch';

function DemoFrame({
  playing,
  children,
  label,
}: {
  playing: boolean;
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-fog-200 bg-ink-900">
      <div className="relative h-14 w-full overflow-hidden">
        {/* Base A */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg,#0f766e 0%,#134e4a 55%,#0a1214 100%)',
          }}
        />
        {/* Animated B / effect layer */}
        <div className="absolute inset-0" style={{ animationPlayState: playing ? 'running' : 'paused' }}>
          {children}
        </div>
      </div>
      <p className="truncate bg-white/95 px-1 py-0.5 text-center text-[9px] font-semibold text-ink-800">
        {label}
      </p>
    </div>
  );
}

export function TransitionDemoThumb({
  id,
  label,
  active,
  playing,
}: {
  id: TransitionDemoId;
  label: string;
  active?: boolean;
  playing: boolean;
}) {
  const layer = (() => {
    const common: CSSProperties = {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(135deg,#f59e0b,#db2777,#7c3aed)',
      animationDuration: '1.6s',
      animationIterationCount: 'infinite',
      animationTimingFunction: 'ease-in-out',
      animationPlayState: playing ? 'running' : 'paused',
    };
    switch (id) {
      case 'none':
        return <div style={{ ...common, opacity: 0.85 }} />;
      case 'fade':
      case 'dissolve':
        return (
          <div
            style={{
              ...common,
              animationName: 'pix-tr-fade',
            }}
          />
        );
      case 'slide_left':
        return <div style={{ ...common, animationName: 'pix-tr-slide-l' }} />;
      case 'slide_right':
        return <div style={{ ...common, animationName: 'pix-tr-slide-r' }} />;
      case 'slide_up':
        return <div style={{ ...common, animationName: 'pix-tr-slide-u' }} />;
      case 'slide_down':
        return <div style={{ ...common, animationName: 'pix-tr-slide-d' }} />;
      case 'zoom':
        return <div style={{ ...common, animationName: 'pix-tr-zoom' }} />;
      case 'zoom_out':
        return <div style={{ ...common, animationName: 'pix-tr-zoom-out' }} />;
      case 'wipe':
        return <div style={{ ...common, animationName: 'pix-tr-wipe' }} />;
      case 'wipe_vertical':
        return <div style={{ ...common, animationName: 'pix-tr-wipe-v' }} />;
      case 'blur':
        return <div style={{ ...common, animationName: 'pix-tr-blur' }} />;
      case 'flash':
        return <div style={{ ...common, animationName: 'pix-tr-flash' }} />;
      case 'spin':
        return <div style={{ ...common, animationName: 'pix-tr-spin' }} />;
      default:
        return <div style={{ ...common, opacity: 0.7 }} />;
    }
  })();

  return (
    <div className={active ? 'ring-2 ring-teal-600 ring-offset-1 rounded-md' : ''}>
      <DemoFrame playing={playing} label={label}>
        {layer}
      </DemoFrame>
    </div>
  );
}

export function EffectDemoThumb({
  id,
  label,
  active,
  playing,
}: {
  id: EffectDemoId;
  label: string;
  active?: boolean;
  playing: boolean;
}) {
  const style: CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(160deg,#14b8a6,#0f766e 40%,#1e3a45)',
    animationDuration: '1.4s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
    animationPlayState: playing ? 'running' : 'paused',
  };

  const anim =
    id === 'fade'
      ? 'pix-fx-fade'
      : id === 'zoom_punch'
        ? 'pix-fx-zoom'
        : id === 'glitch_flash'
          ? 'pix-fx-glitch'
          : id === 'color_grade'
            ? 'pix-fx-grade'
            : id === 'blur_soft'
              ? 'pix-fx-blur'
              : id === 'vhs'
                ? 'pix-fx-vhs'
                : id === 'mirror'
                  ? 'pix-fx-mirror'
                  : id === 'shake'
                    ? 'pix-fx-shake'
                    : id === 'glow'
                      ? 'pix-fx-glow'
                      : id === 'bw_punch'
                        ? 'pix-fx-bw'
                        : undefined;

  return (
    <div className={active ? 'ring-2 ring-teal-600 ring-offset-1 rounded-md' : ''}>
      <DemoFrame playing={playing} label={label}>
        <div style={{ ...style, animationName: anim }} />
      </DemoFrame>
    </div>
  );
}

/** Inject keyframes once. */
export function useDemoKeyframes() {
  useEffect(() => {
    const id = 'sn-editor-fx-demo-keyframes';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
@keyframes pix-tr-fade { 0%,100%{opacity:0} 40%,60%{opacity:1} }
@keyframes pix-tr-slide-l { 0%{transform:translateX(100%)} 45%,55%{transform:translateX(0)} 100%{transform:translateX(-100%)} }
@keyframes pix-tr-slide-r { 0%{transform:translateX(-100%)} 45%,55%{transform:translateX(0)} 100%{transform:translateX(100%)} }
@keyframes pix-tr-slide-u { 0%{transform:translateY(100%)} 45%,55%{transform:translateY(0)} 100%{transform:translateY(-100%)} }
@keyframes pix-tr-slide-d { 0%{transform:translateY(-100%)} 45%,55%{transform:translateY(0)} 100%{transform:translateY(100%)} }
@keyframes pix-tr-zoom { 0%{transform:scale(1.6);opacity:0} 40%,60%{transform:scale(1);opacity:1} 100%{transform:scale(.7);opacity:0} }
@keyframes pix-tr-zoom-out { 0%{transform:scale(.5);opacity:0} 40%,60%{transform:scale(1);opacity:1} 100%{transform:scale(1.4);opacity:0} }
@keyframes pix-tr-wipe { 0%{clip-path:inset(0 100% 0 0)} 45%,55%{clip-path:inset(0 0 0 0)} 100%{clip-path:inset(0 0 0 100%)} }
@keyframes pix-tr-wipe-v { 0%{clip-path:inset(100% 0 0 0)} 45%,55%{clip-path:inset(0 0 0 0)} 100%{clip-path:inset(0 0 100% 0)} }
@keyframes pix-tr-blur { 0%{filter:blur(10px);opacity:0} 40%,60%{filter:blur(0);opacity:1} 100%{filter:blur(10px);opacity:0} }
@keyframes pix-tr-flash { 0%,100%{opacity:0;filter:brightness(1)} 30%{opacity:1;filter:brightness(2.2)} 50%{opacity:1;filter:brightness(1)} }
@keyframes pix-tr-spin { 0%{transform:rotate(-25deg) scale(1.2);opacity:0} 45%,55%{transform:rotate(0) scale(1);opacity:1} 100%{transform:rotate(25deg) scale(.8);opacity:0} }
@keyframes pix-fx-fade { 0%,100%{opacity:.45} 50%{opacity:1} }
@keyframes pix-fx-zoom { 0%,100%{transform:scale(1)} 50%{transform:scale(1.18)} }
@keyframes pix-fx-glitch { 0%,100%{filter:none;transform:translate(0)} 25%{filter:hue-rotate(90deg) saturate(2);transform:translate(2px,-1px)} 50%{filter:hue-rotate(-40deg);transform:translate(-2px,1px)} }
@keyframes pix-fx-grade { 0%,100%{filter:saturate(1.3) contrast(1.15) hue-rotate(-12deg)} 50%{filter:saturate(1.5) contrast(1.25) hue-rotate(-20deg)} }
@keyframes pix-fx-blur { 0%,100%{filter:blur(0)} 50%{filter:blur(3px)} }
@keyframes pix-fx-vhs { 0%,100%{filter:contrast(1.3) saturate(1.4);transform:translate(0)} 33%{transform:translate(1px,0);filter:contrast(1.4) hue-rotate(10deg)} 66%{transform:translate(-1px,0)} }
@keyframes pix-fx-mirror { 0%,100%{transform:scaleX(1)} 50%{transform:scaleX(-1)} }
@keyframes pix-fx-shake { 0%,100%{transform:translate(0)} 25%{transform:translate(-3px,1px)} 50%{transform:translate(3px,-1px)} 75%{transform:translate(-2px,0)} }
@keyframes pix-fx-glow { 0%,100%{filter:brightness(1) drop-shadow(0 0 0 transparent)} 50%{filter:brightness(1.25) drop-shadow(0 0 8px #14b8a6)} }
@keyframes pix-fx-bw { 0%,100%{filter:grayscale(0) contrast(1)} 50%{filter:grayscale(1) contrast(1.35)} }
`;
    document.head.appendChild(style);
  }, []);
}

export function useAutoPlayDemo(ms = 2200) {
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    // Keep demos looping while panel is open
    setPlaying(true);
  }, [ms]);
  return playing;
}
