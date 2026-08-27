/**
 * Canva-style Tools panel + floating strip for the video editor.
 */
'use client';

import clsx from 'clsx';
import { useState, type ReactNode } from 'react';
import { useVideoEditorStore } from '@/store/videoEditorStore';

type VideoTool =
  | 'select'
  | 'draw'
  | 'shapes'
  | 'line'
  | 'sticky'
  | 'text'
  | 'signature'
  | 'table';

const TOOLS: { id: VideoTool; label: string; icon: ReactNode }[] = [
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
        <path fill="none" stroke="currentColor" strokeWidth="1.8" d="M5 19L19 5" />
      </svg>
    ),
  },
  {
    id: 'sticky',
    label: 'Sticky note',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="none" stroke="currentColor" strokeWidth="1.8" d="M6 4h10l4 4v12H6V4z" />
      </svg>
    ),
  },
  {
    id: 'text',
    label: 'Text',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path fill="none" stroke="currentColor" strokeWidth="1.8" d="M5 6h14M12 6v12" />
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
          d="M4 16c2-4 3 2 5-1s3-1 4 1 3-4 5-2"
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
        <path fill="none" stroke="currentColor" strokeWidth="1.8" d="M4 10h16M10 5v14" />
      </svg>
    ),
  },
];

function useVideoToolAction(setTool: (t: VideoTool) => void) {
  const addTextClip = useVideoEditorStore((s) => s.addTextClip);
  const setSelectedClipId = useVideoEditorStore((s) => s.setSelectedClipId);

  return (tool: VideoTool) => {
    setTool(tool);
    if (tool === 'select') {
      setSelectedClipId(null);
      return;
    }
    if (tool === 'shapes') {
      addTextClip('■', { fontSize: 72, fontWeight: 700, align: 'center', color: '#0f766e' });
      return;
    }
    if (tool === 'line') {
      addTextClip('—', { fontSize: 48, fontWeight: 400, align: 'center' });
      return;
    }
    if (tool === 'sticky') {
      addTextClip('Sticky note', {
        fontSize: 22,
        fontWeight: 500,
        color: '#0a1214',
        align: 'center',
      });
      return;
    }
    if (tool === 'text') {
      addTextClip('Text', { fontSize: 28, fontWeight: 400 });
      return;
    }
    if (tool === 'table') {
      addTextClip('Col A  |  Col B  |  Col C', { fontSize: 18, fontWeight: 500 });
      return;
    }
    if (tool === 'signature' || tool === 'draw') {
      addTextClip('⁓ signature', { fontSize: 32, fontWeight: 400, fontStyle: 'italic' });
    }
  };
}

export function VideoFloatingToolsBar({ className }: { className?: string }) {
  const [activeTool, setActiveTool] = useState<VideoTool>('select');
  const run = useVideoToolAction(setActiveTool);

  return (
    <div
      className={clsx(
        'pointer-events-auto flex flex-col gap-1 rounded-2xl border border-fog-200 bg-white p-1.5 shadow-[0_8px_28px_rgba(10,18,20,0.12)]',
        className,
      )}
      role="toolbar"
      aria-label="Video tools"
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

export function VideoToolsPanel() {
  const [activeTool, setActiveTool] = useState<VideoTool>('select');
  const run = useVideoToolAction(setActiveTool);

  return (
    <div className="flex flex-col gap-3 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-600">Tools</h2>
      <p className="text-[11px] text-ink-600">
        Use the floating toolbar on the preview, or pick a tool here.
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
    </div>
  );
}
