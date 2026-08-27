/**
 * Image editor chrome: left tools, center canvas, right layers.
 * Sidebar visual layout mirrors Canva’s two-column rail (design only).
 */
'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import clsx from 'clsx';
import { useEffect, useState, type ReactNode } from 'react';
import { findLayer } from '@sn-editor/editor-core';
import { layersForArtboard, primaryArtboardId } from '@/lib/pageLayers';
import { useImageEditorStore, type LeftTab } from '@/store/imageEditorStore';
import { Toolbar } from './Toolbar';
import { LayersPanel } from './LayersPanel';
import { TemplatesPanel } from './TemplatesPanel';
import { ElementsPanel } from './ElementsPanel';
import { AssetsPanel } from './AssetsPanel';
import { TextPanel } from './TextPanel';
import { BrandKitPanel } from './BrandKitPanel';
// Hidden for now — Tools / AI / Product rail tabs
// import { ToolsPanel, FloatingToolsBar } from './ToolsPanel';
// import { AiToolsPanel } from './AiToolsPanel';
// import { ProductCenterPanel } from './ProductCenterPanel';
import { ExportPanel } from './ExportPanel';
import { ShapePanel } from './ShapePanel';
import { ImagePanel } from './ImagePanel';
import { ArtboardStrip } from './ArtboardStrip';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SidePanel3D } from '@/components/SidePanel3D';
import { TopbarMenus } from './TopbarMenus';
import { PageColorPicker } from './PageColorControl';
import { CreateDesignModal } from './CreateDesignModal';
import { AccountMenu } from '@/components/auth/AccountMenu';
import { PremiumGate } from '@/components/auth/PremiumGate';
import { BrandWordmark } from '@/components/brand/BrandWordmark';

/** Konva requires browser APIs — load canvas client-only. */
const CanvasStage = dynamic(
  () => import('./CanvasStage').then((m) => m.CanvasStage),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center text-sm text-ink-500">
        Loading canvas…
      </div>
    ),
  },
);

const TABS: { id: LeftTab; label: string; icon: ReactNode }[] = [
  {
    id: 'templates',
    label: 'Templates',
    icon: (
      <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          d="M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z"
        />
      </svg>
    ),
  },
  {
    id: 'elements',
    label: 'Elements',
    icon: (
      <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden>
        <circle cx="9" cy="10" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <rect x="12" y="8" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path fill="none" stroke="currentColor" strokeWidth="1.6" d="M6 18h12" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'assets',
    label: 'Uploads',
    icon: (
      <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          d="M12 16V5m0 0L8 9m4-4 4 4M5 19h14"
        />
      </svg>
    ),
  },
  {
    id: 'text',
    label: 'Text',
    icon: (
      <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          d="M5 6h14M12 6v12M8 18h8"
        />
      </svg>
    ),
  },
  {
    id: 'brand',
    label: 'Brand',
    icon: (
      <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          d="M12 4 4.5 8v8L12 20l7.5-4V8L12 4z"
        />
      </svg>
    ),
  },
  // Hidden for now — Tools / AI / Product
  // {
  //   id: 'tools',
  //   label: 'Tools',
  //   icon: (
  //     <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden>
  //       <path
  //         fill="none"
  //         stroke="currentColor"
  //         strokeWidth="1.6"
  //         strokeLinecap="round"
  //         d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4L15 12l-1.3-1.3 2.7-2.7z"
  //       />
  //     </svg>
  //   ),
  // },
  // {
  //   id: 'ai',
  //   label: 'AI',
  //   icon: (
  //     <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden>
  //       <path
  //         fill="none"
  //         stroke="currentColor"
  //         strokeWidth="1.6"
  //         strokeLinecap="round"
  //         d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"
  //       />
  //     </svg>
  //   ),
  // },
  // {
  //   id: 'product',
  //   label: 'Product',
  //   icon: (
  //     <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden>
  //       <path
  //         fill="none"
  //         stroke="currentColor"
  //         strokeWidth="1.6"
  //         d="M4 8h16l-1.5 11H5.5L4 8zm4-3h8l1 3H7l1-3z"
  //       />
  //     </svg>
  //   ),
  // },
  {
    id: 'export',
    label: 'Export',
    icon: (
      <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden>
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          d="M12 4v10m0 0 4-4m-4 4-4-4M5 18h14"
        />
      </svg>
    ),
  },
];

function DocumentTitleField() {
  const name = useImageEditorStore((s) => s.history.present.meta.name);
  const renameDocument = useImageEditorStore((s) => s.renameDocument);
  const [text, setText] = useState(name);

  useEffect(() => {
    setText(name);
  }, [name]);

  const commit = () => {
    const next = text.trim() || 'Untitled Design';
    setText(next);
    renameDocument(next);
  };

  return (
    <input
      className="canva-topbar-title"
      value={text}
      title="Click to rename this design"
      aria-label="Design name"
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setText(name);
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

export function EditorShell() {
  const leftTab = useImageEditorStore((s) => s.leftTab);
  const setLeftTab = useImageEditorStore((s) => s.setLeftTab);
  const doc = useImageEditorStore((s) => s.history.present);
  const undo = useImageEditorStore((s) => s.undo);
  const redo = useImageEditorStore((s) => s.redo);
  const removeSelected = useImageEditorStore((s) => s.removeSelected);
  const selectedIds = useImageEditorStore((s) => s.selectedIds);
  const setSelectedIds = useImageEditorStore((s) => s.setSelectedIds);
  const copySelected = useImageEditorStore((s) => s.copySelected);
  const pasteClipboard = useImageEditorStore((s) => s.pasteClipboard);
  const duplicateSelected = useImageEditorStore((s) => s.duplicateSelected);
  const nudgeSelected = useImageEditorStore((s) => s.nudgeSelected);
  const selectAll = useImageEditorStore((s) => s.selectAll);
  const groupSelectedIds = useImageEditorStore((s) => s.groupSelectedIds);
  const ungroupSelected = useImageEditorStore((s) => s.ungroupSelected);
  const arrangeLayer = useImageEditorStore((s) => s.arrangeLayer);

  const selected = selectedIds[0] ? findLayer(doc.layers, selectedIds[0]) : undefined;
  const showShapePanel = selected?.type === 'shape';
  const showImagePanel =
    selected?.type === 'image' || selected?.type === 'sticker';

  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && key === 'c') {
        e.preventDefault();
        copySelected();
        return;
      }
      if (mod && key === 'v') {
        e.preventDefault();
        pasteClipboard();
        return;
      }
      if (mod && key === 'd') {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (mod && key === 'a') {
        e.preventDefault();
        selectAll();
        return;
      }
      if (mod && key === 'g' && e.shiftKey) {
        e.preventDefault();
        ungroupSelected();
        return;
      }
      if (mod && key === 'g') {
        e.preventDefault();
        groupSelectedIds();
        return;
      }
      if (mod && (e.key === ']' || e.key === '[')) {
        const state = useImageEditorStore.getState();
        const id = state.selectedIds[0];
        if (id) {
          e.preventDefault();
          const present = state.document();
          const target = findLayer(present.layers, id);
          const siblingIds = layersForArtboard(
            present.layers,
            target?.artboardId ?? primaryArtboardId(present),
            primaryArtboardId(present),
          ).map((l) => l.id);
          if (e.key === ']' && e.shiftKey) arrangeLayer(id, 'front', siblingIds);
          else if (e.key === ']') arrangeLayer(id, 'forward', siblingIds);
          else if (e.shiftKey) arrangeLayer(id, 'back', siblingIds);
          else arrangeLayer(id, 'backward', siblingIds);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedIds([]);
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        nudgeSelected(dx, dy);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault();
        removeSelected();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    undo,
    redo,
    removeSelected,
    selectedIds,
    copySelected,
    pasteClipboard,
    duplicateSelected,
    nudgeSelected,
    selectAll,
    groupSelectedIds,
    ungroupSelected,
    arrangeLayer,
    setSelectedIds,
  ]);

  return (
    <div className="editor-shell flex h-screen flex-col overflow-hidden">
      <header className="canva-chrome">
        <div className="canva-topbar">
          <div className="canva-topbar-left">
            <button
              type="button"
              className="tb-icon md:hidden"
              aria-label="Toggle design panel"
              title="Design panel"
              onClick={() => {
                setLeftOpen((v) => !v);
                setRightOpen(false);
              }}
            >
              ☰
            </button>
            <BrandWordmark className="canva-topbar-logo font-display" />
            <span className="canva-topbar-divider hidden sm:block" aria-hidden />
            <TopbarMenus />
            <DocumentTitleField />
          </div>
          <div className="canva-topbar-right">
            <ThemeToggle />
            <button
              type="button"
              className="tb-btn md:hidden"
              aria-label="Toggle layers"
              title="Layers"
              onClick={() => {
                setRightOpen((v) => !v);
                setLeftOpen(false);
              }}
            >
              Layers
            </button>
            <Link href="/video" className="canva-topbar-share hidden sm:inline-flex">
              Video Editor
            </Link>
            <AccountMenu />
          </div>
        </div>
        <div className="canva-toolbar-row">
          <Toolbar />
        </div>
      </header>

      <div className="relative grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[72px_280px_1fr_280px]">
        {(leftOpen || rightOpen) && (
          <button
            type="button"
            className="absolute inset-0 z-30 bg-black/30 md:hidden"
            aria-label="Close panels"
            onClick={() => {
              setLeftOpen(false);
              setRightOpen(false);
            }}
          />
        )}

        {/* Canva-style narrow icon rail */}
        <aside
          className={clsx(
            'canva-rail z-40 flex min-h-0 flex-col items-center overflow-hidden py-3',
            'max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:w-[72px]',
            leftOpen ? 'max-md:flex' : 'max-md:hidden',
            'md:relative md:flex',
          )}
        >
          <div className="mb-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-600">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                d="M4 6h6v12H4zM14 6h6v12h-6"
              />
            </svg>
          </div>

          <button
            type="button"
            className="canva-create mb-3 shrink-0"
            aria-label="Create a design"
            title="Create a design"
            onClick={() => setCreateOpen(true)}
          >
            <span className="canva-create-plus">+</span>
            <span className="canva-create-label">Create</span>
          </button>

          <nav className="canva-rail-scroll panel-scroll flex w-full min-h-0 flex-1 flex-col items-stretch gap-0.5 overflow-y-auto overscroll-contain px-1.5 pb-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setLeftTab(tab.id);
                  setLeftOpen(true);
                }}
                className={clsx(
                  'canva-rail-item',
                  leftTab === tab.id && 'canva-rail-item-active',
                )}
              >
                <span className="canva-rail-icon-wrap">{tab.icon}</span>
                <span className="canva-rail-label">{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Wider contextual panel — 3D + animated */}
        <SidePanel3D
          panelKey={leftTab}
          className={clsx(
            'z-40 overflow-auto',
            'max-md:absolute max-md:inset-y-0 max-md:left-[72px] max-md:w-[min(280px,calc(100vw-72px))]',
            leftOpen ? 'max-md:flex' : 'max-md:hidden',
            'md:relative md:flex',
          )}
        >
          <div className="canva-panel-brand px-4 pb-2 pt-4">
            <span className="text-sm font-bold tracking-tight text-ink-900">
              {TABS.find((t) => t.id === leftTab)?.label ?? 'SN Editor'}
            </span>
          </div>
          <div className="canva-panel-body">
            <PageColorPicker />
            {showShapePanel && <ShapePanel />}
            {showImagePanel && <ImagePanel />}
            {leftTab === 'templates' && <TemplatesPanel />}
            {leftTab === 'elements' && <ElementsPanel />}
            {leftTab === 'assets' && <AssetsPanel />}
            {leftTab === 'text' && <TextPanel />}
            {leftTab === 'brand' && (
              <PremiumGate feature="image.brand" label="Brand kit">
                <BrandKitPanel />
              </PremiumGate>
            )}
            {/* Hidden for now — Tools / AI / Product
            {leftTab === 'tools' && <ToolsPanel />}
            {leftTab === 'ai' && <AiToolsPanel />}
            {leftTab === 'product' && <ProductCenterPanel />}
            */}
            {leftTab === 'export' && <ExportPanel />}
          </div>
        </SidePanel3D>

        <main className="canva-canvas-well relative flex min-h-0 flex-col">
          <div className="relative min-h-0 flex-1">
            <CanvasStage />
            {/* Hidden for now — Tools floating bar
            {leftTab === 'tools' && (
              <FloatingToolsBar className="absolute left-4 top-1/2 z-20 -translate-y-1/2" />
            )}
            */}
          </div>
          <ArtboardStrip />
        </main>

        <aside
          className={clsx(
            'canva-layers-rail panel-scroll z-40 min-h-0 overflow-auto',
            'max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:w-[min(280px,85vw)] max-md:shadow-xl',
            rightOpen ? 'max-md:block' : 'max-md:hidden',
            'md:relative md:block',
          )}
        >
          <LayersPanel />
        </aside>
      </div>
      {createOpen ? <CreateDesignModal onClose={() => setCreateOpen(false)} /> : null}
    </div>
  );
}
