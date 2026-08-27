/**
 * 3D depth + pointer tilt for editor side panels.
 */
'use client';

import clsx from 'clsx';
import { useCallback, useRef, type MouseEvent, type ReactNode } from 'react';

export function SidePanel3D({
  children,
  className,
  panelKey,
}: {
  children: ReactNode;
  className?: string;
  /** Remounts inner content animation when the active panel changes */
  panelKey?: string;
}) {
  const rootRef = useRef<HTMLElement>(null);

  const onMove = useCallback((e: MouseEvent<HTMLElement>) => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty('--panel-rx', `${(-y * 4.5).toFixed(2)}deg`);
    el.style.setProperty('--panel-ry', `${(x * 6).toFixed(2)}deg`);
    el.style.setProperty('--panel-gx', `${((x + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty('--panel-gy', `${((y + 0.5) * 100).toFixed(1)}%`);
  }, []);

  const onLeave = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    el.style.setProperty('--panel-rx', '0deg');
    el.style.setProperty('--panel-ry', '0deg');
    el.style.setProperty('--panel-gx', '50%');
    el.style.setProperty('--panel-gy', '20%');
  }, []);

  return (
    <aside
      ref={rootRef}
      className={clsx('canva-panel canva-panel-3d panel-scroll min-h-0', className)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div className="canva-panel-3d-sheen" aria-hidden />
      <div key={panelKey ?? 'panel'} className="canva-panel-3d-inner">
        {children}
      </div>
    </aside>
  );
}
