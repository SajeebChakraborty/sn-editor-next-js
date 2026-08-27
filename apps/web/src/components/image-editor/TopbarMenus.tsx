/**
 * File + Resize dropdown menus in the editor top bar.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { createEmptyDocument } from '@sn-editor/editor-core';
import { useImageEditorStore } from '@/store/imageEditorStore';
import { downloadBlob } from '@/lib/downloadFile';

const RESIZE_PRESETS = [
  { label: 'Instagram Post', w: 1080, h: 1080 },
  { label: 'Instagram Story', w: 1080, h: 1920 },
  { label: 'YouTube Thumb', w: 1280, h: 720 },
  { label: 'Facebook Post', w: 1200, h: 630 },
  { label: 'LinkedIn', w: 1200, h: 627 },
  { label: 'Banner', w: 1920, h: 1080 },
] as const;

export function TopbarMenus() {
  const [fileOpen, setFileOpen] = useState(false);
  const [resizeOpen, setResizeOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const doc = useImageEditorStore((s) => s.history.present);
  const loadDocument = useImageEditorStore((s) => s.loadDocument);
  const setLeftTab = useImageEditorStore((s) => s.setLeftTab);
  const magicResize = useImageEditorStore((s) => s.magicResize);
  const activeArtboardId = useImageEditorStore((s) => s.activeArtboardId);
  const docName = doc.meta.name;

  const activeAb =
    doc.artboards.find((a) => a.id === activeArtboardId) ?? doc.artboards[0];

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setFileOpen(false);
        setResizeOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFileOpen(false);
        setResizeOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const saveProject = async () => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
      if (!res.ok) throw new Error('Save failed');
    } catch {
      /* still allow local download below as backup */
    }
    setFileOpen(false);
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${docName.replace(/[^\w.-]+/g, '-') || 'sn-editor'}.json`);
    setFileOpen(false);
  };

  const newDesign = () => {
    if (!window.confirm('Start a new blank design? Unsaved changes will be lost from the editor.')) {
      return;
    }
    loadDocument(createEmptyDocument('Untitled Design'));
    setFileOpen(false);
  };

  return (
    <div ref={rootRef} className="relative hidden items-center gap-1 sm:flex">
      <div className="relative">
        <button
          type="button"
          className={`canva-topbar-menu ${fileOpen ? 'bg-[var(--color-panel-hover)]' : ''}`}
          aria-expanded={fileOpen}
          onClick={() => {
            setFileOpen((v) => !v);
            setResizeOpen(false);
          }}
        >
          File
        </button>
        {fileOpen && (
          <div className="absolute left-0 top-full z-[60] mt-1 w-52 rounded-xl border border-fog-200 bg-[var(--sn-editor-panel)] p-1.5 shadow-lg">
            <button type="button" className="topbar-menu-item" onClick={newDesign}>
              New design
            </button>
            <button
              type="button"
              className="topbar-menu-item"
              onClick={() => {
                void saveProject();
              }}
            >
              Save project
            </button>
            <button type="button" className="topbar-menu-item" onClick={downloadJson}>
              Download JSON
            </button>
            <button
              type="button"
              className="topbar-menu-item"
              onClick={() => {
                setLeftTab('export');
                setFileOpen(false);
              }}
            >
              Export…
            </button>
            <button
              type="button"
              className="topbar-menu-item"
              onClick={() => {
                setLeftTab('templates');
                setFileOpen(false);
              }}
            >
              Browse templates
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          className={`canva-topbar-menu ${resizeOpen ? 'bg-[var(--color-panel-hover)]' : ''}`}
          aria-expanded={resizeOpen}
          title="Resize active page"
          onClick={() => {
            setResizeOpen((v) => !v);
            setFileOpen(false);
          }}
        >
          Resize
        </button>
        {resizeOpen && (
          <div className="absolute left-0 top-full z-[60] mt-1 w-60 rounded-xl border border-fog-200 bg-[var(--sn-editor-panel)] p-2 shadow-lg">
            <p className="mb-1.5 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-600">
              Magic Resize
              {activeAb ? ` · ${activeAb.width}×${activeAb.height}` : ''}
            </p>
            <div className="flex flex-col gap-0.5">
              {RESIZE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="topbar-menu-item"
                  onClick={() => {
                    magicResize(p.w, p.h);
                    setResizeOpen(false);
                  }}
                >
                  <span>{p.label}</span>
                  <span className="text-[10px] text-ink-500">
                    {p.w}×{p.h}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="topbar-menu-item mt-1 border-t border-fog-200 pt-1.5"
              onClick={() => {
                const w = window.prompt('Width (px)', String(activeAb?.width ?? 1080));
                const h = window.prompt('Height (px)', String(activeAb?.height ?? 1080));
                if (!w || !h) return;
                magicResize(Number(w) || 1080, Number(h) || 1080);
                setResizeOpen(false);
              }}
            >
              Custom size…
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
