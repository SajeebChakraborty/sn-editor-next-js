/**
 * Canva-style Tools panel + floating vertical tool strip.
 */
'use client';

import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useImageEditorStore, type CanvasTool } from '@/store/imageEditorStore';

const TOOLS: { id: CanvasTool; label: string; icon: ReactNode }[] = [
  {
    id: 'select',
    label: 'Select',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="currentColor" d="M5 3l12 8.5-5.2 1.3L14.5 21 12 22l-2.6-7.8L4 16.5 5 3z" />
      </svg>
    ),
  },
  {
    id: 'draw',
    label: 'Draw',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          d="M15 4l5 5M4 20l1.5-5.5L14 6l4 4-8.5 8.5L4 20z"
        />
      </svg>
    ),
  },
  {
    id: 'shapes',
    label: 'Shapes',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <circle cx="9" cy="11" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <rect x="12" y="8" width="8" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    id: 'line',
    label: 'Line',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M5 19L19 5" />
      </svg>
    ),
  },
  {
    id: 'sticky',
    label: 'Sticky note',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          d="M6 4h10l4 4v12H6V4zM16 4v4h4"
        />
      </svg>
    ),
  },
  {
    id: 'text',
    label: 'Text',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          d="M5 6h14M12 6v12M8 18h8"
        />
      </svg>
    ),
  },
  {
    id: 'signature',
    label: 'Signature',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          d="M4 16c2-4 3 2 5-1s3-1 4 1 3-4 5-2 1 4 2 3"
        />
      </svg>
    ),
  },
  {
    id: 'table',
    label: 'Table',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <rect x="4" y="5" width="16" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path fill="none" stroke="currentColor" strokeWidth="1.8" d="M4 10h16M4 15h16M10 5v14M16 5v14" />
      </svg>
    ),
  },
];

function useToolAction() {
  const setActiveTool = useImageEditorStore((s) => s.setActiveTool);
  const addShape = useImageEditorStore((s) => s.addShape);
  const addText = useImageEditorStore((s) => s.addText);
  const addLine = useImageEditorStore((s) => s.addLine);
  const addStickyNote = useImageEditorStore((s) => s.addStickyNote);
  const addTable = useImageEditorStore((s) => s.addTable);
  const addSignaturePath = useImageEditorStore((s) => s.addSignaturePath);
  const setSelectedIds = useImageEditorStore((s) => s.setSelectedIds);

  return (tool: CanvasTool) => {
    setActiveTool(tool);
    if (tool === 'select') {
      setSelectedIds([]);
      return;
    }
    if (tool === 'shapes') {
      addShape('rect');
      return;
    }
    if (tool === 'line') {
      addLine();
      return;
    }
    if (tool === 'sticky') {
      addStickyNote();
      return;
    }
    if (tool === 'text') {
      addText('textbox');
      return;
    }
    if (tool === 'table') {
      addTable(3, 3);
      return;
    }
    if (tool === 'signature' || tool === 'draw') {
      addSignaturePath();
    }
  };
}

/** Floating vertical strip (Canva Tools look) — place over the canvas. */
export function FloatingToolsBar({ className }: { className?: string }) {
  const activeTool = useImageEditorStore((s) => s.activeTool);
  const run = useToolAction();

  return (
    <div
      className={clsx(
        'pointer-events-auto flex flex-col gap-1 rounded-2xl border border-fog-200 bg-white p-1.5 shadow-[0_8px_28px_rgba(10,18,20,0.12)]',
        className,
      )}
      role="toolbar"
      aria-label="Canvas tools"
    >
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          type="button"
          title={tool.label}
          aria-label={tool.label}
          aria-pressed={activeTool === tool.id}
          onClick={() => run(tool.id)}
          className={clsx(
            'flex h-10 w-10 items-center justify-center rounded-full text-ink-700 transition hover:bg-fog-100',
            activeTool === tool.id && 'bg-[var(--sn-editor-accent-muted)] text-[var(--sn-editor-accent-deep)]',
          )}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
}

export function ToolsPanel() {
  const activeTool = useImageEditorStore((s) => s.activeTool);
  const addShape = useImageEditorStore((s) => s.addShape);
  const run = useToolAction();

  return (
    <div className="flex flex-col gap-3 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-600">Tools</h2>
      <p className="text-[11px] text-ink-600">
        Use the floating toolbar on the canvas, or pick a tool here.
      </p>

      <div className="flex flex-col gap-1">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            className={clsx(
              'btn-tool flex w-full items-center gap-2 text-left',
              activeTool === tool.id && 'btn-tool-active',
            )}
            onClick={() => run(tool.id)}
          >
            <span className="text-ink-700">{tool.icon}</span>
            {tool.label}
          </button>
        ))}
      </div>

      {activeTool === 'shapes' && (
        <div className="space-y-2 rounded-xl border border-fog-200 bg-fog-50 p-3">
          <p className="text-[11px] font-semibold text-ink-800">Quick shapes</p>
          <div className="flex flex-wrap gap-1">
            <button type="button" className="btn-tool" onClick={() => addShape('rect')}>
              Rectangle
            </button>
            <button type="button" className="btn-tool" onClick={() => addShape('ellipse')}>
              Ellipse
            </button>
            <button type="button" className="btn-tool" onClick={() => addShape('triangle')}>
              Triangle
            </button>
          </div>
        </div>
      )}

      {(activeTool === 'draw' || activeTool === 'signature') && (
        <p className="text-[11px] text-ink-600">
          A signature stroke was added to the canvas. Drag to reposition — full freehand drawing
          lands in a later pass.
        </p>
      )}
    </div>
  );
}
