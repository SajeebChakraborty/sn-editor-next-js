/**
 * Image export panel — client PNG / JPEG / WebP (+ multi-page PNG “PDF”).
 */
'use client';

import { useState } from 'react';
import type { ImageExportFormat } from '@sn-editor/image-engine';
import { shouldUseExportWorker } from '@sn-editor/image-engine';
import { exportAllArtboardsAsPng, exportArtboardToDownload, exportArtboardsToPdf } from '@/lib/canvasExport';
import { useImageEditorStore } from '@/store/imageEditorStore';
import { useMe } from '@/components/auth/MeProvider';

const FORMATS: Array<ImageExportFormat | 'pdf'> = ['png', 'jpeg', 'webp', 'pdf'];
const SCALES = [1, 2, 3] as const;

export function ExportPanel() {
  const [format, setFormat] = useState<ImageExportFormat | 'pdf'>('png');
  const [quality, setQuality] = useState(0.92);
  const [scale, setScale] = useState<(typeof SCALES)[number]>(1);
  const [transparent, setTransparent] = useState(false);
  const [scope, setScope] = useState<'active' | 'all'>('active');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const doc = useImageEditorStore((s) => s.history.present);
  const activeArtboardId = useImageEditorStore((s) => s.activeArtboardId);
  const setSelectedIds = useImageEditorStore((s) => s.setSelectedIds);
  const { hasPremiumFeature } = useMe();
  const canPdf = hasPremiumFeature('image.exportPdf');
  const canHd = hasPremiumFeature('image.exportHd');

  const artboard =
    doc.artboards.find((a) => a.id === activeArtboardId) ?? doc.artboards[0];
  const largeBoard = artboard
    ? shouldUseExportWorker(artboard.width * scale, artboard.height * scale)
    : false;

  const baseName = (doc.meta?.name ?? 'sn-editor-design').replace(/[^\w.-]+/g, '-');

  const exportNow = async () => {
    if (!artboard && scope === 'active') return;
    if (format === 'pdf' && !canPdf) {
      setStatus('PDF export is a Premium feature');
      return;
    }
    if (scale > 1 && !canHd) {
      setStatus('HD export (2x / 3x) is a Premium feature');
      return;
    }
    setBusy(true);
    setStatus('Exporting…');
    setSelectedIds([]);
    try {
      await new Promise<void>((r) => {
        requestAnimationFrame(() => requestAnimationFrame(() => r()));
      });

      const boards = scope === 'all' ? doc.artboards : artboard ? [artboard] : [];

      if (format === 'pdf') {
        await exportArtboardsToPdf({
          artboards: boards,
          baseName,
          pixelRatio: scale,
          transparent,
        });
        setStatus(`Downloaded PDF (${boards.length} page${boards.length === 1 ? '' : 's'}) @ ${scale}x`);
        return;
      }

      if (scope === 'all') {
        if (format === 'png') {
          await exportAllArtboardsAsPng({
            artboards: boards,
            baseName,
            pixelRatio: scale,
            transparent,
          });
        } else {
          for (let i = 0; i < boards.length; i++) {
            const ab = boards[i]!;
            await exportArtboardToDownload({
              artboard: ab,
              format,
              quality,
              pixelRatio: scale,
              transparent: false,
              filename: `${baseName}-page-${i + 1}.${format === 'jpeg' ? 'jpg' : format}`,
            });
            if (i < boards.length - 1) {
              await new Promise((r) => setTimeout(r, 350));
            }
          }
        }
        setStatus(`Downloaded ${boards.length} × ${format.toUpperCase()} @ ${scale}x`);
        return;
      }

      await exportArtboardToDownload({
        artboard: artboard!,
        format,
        quality,
        pixelRatio: scale,
        transparent: format === 'png' && transparent,
        filename: `${baseName}.${format === 'jpeg' ? 'jpg' : format}`,
      });
      setStatus(`Downloaded ${format.toUpperCase()} @ ${scale}x`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  const saveProject = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
      setStatus(res.ok ? 'Project saved' : 'Save failed');
    } catch {
      setStatus('Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-600">Export</h2>

      <div className="flex flex-wrap gap-1">
        {FORMATS.map((f) => (
          <button
            key={f}
            type="button"
            className={format === f ? 'btn-tool btn-tool-active' : 'btn-tool'}
            onClick={() => {
              if (f === 'pdf' && !canPdf) {
                setStatus('PDF export is Premium — upgrade to unlock');
                return;
              }
              setFormat(f);
            }}
          >
            {f.toUpperCase()}
            {f === 'pdf' && !canPdf ? ' 🔒' : ''}
          </button>
        ))}
      </div>

      <div>
        <p className="mb-1 text-[11px] font-semibold text-ink-600">Scale</p>
        <div className="flex gap-1">
          {SCALES.map((s) => (
            <button
              key={s}
              type="button"
              className={scale === s ? 'btn-tool btn-tool-active' : 'btn-tool'}
              onClick={() => {
                if (s > 1 && !canHd) {
                  setStatus('HD export is Premium — upgrade to unlock');
                  return;
                }
                setScale(s);
              }}
            >
              {s}x{s > 1 && !canHd ? ' 🔒' : ''}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 text-[11px] font-semibold text-ink-600">Pages</p>
        <div className="flex gap-1">
          <button
            type="button"
            className={scope === 'active' ? 'btn-tool btn-tool-active' : 'btn-tool'}
            onClick={() => setScope('active')}
          >
            Active page
          </button>
          <button
            type="button"
            className={scope === 'all' ? 'btn-tool btn-tool-active' : 'btn-tool'}
            onClick={() => setScope('all')}
          >
            All pages
          </button>
        </div>
      </div>

      {format === 'png' && (
        <label className="flex items-center gap-2 text-[11px] text-ink-700">
          <input
            type="checkbox"
            checked={transparent}
            onChange={(e) => setTransparent(e.target.checked)}
          />
          Transparent background
        </label>
      )}

      {(format === 'jpeg' || format === 'webp') && (
        <label className="text-[11px] text-ink-600">
          Quality {Math.round(quality * 100)}%
          <input
            type="range"
            min={0.5}
            max={1}
            step={0.01}
            className="mt-1 w-full"
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
          />
        </label>
      )}

      {artboard && (
        <p className="text-[11px] text-ink-600">
          {artboard.width}×{artboard.height}
          {largeBoard ? ' · large board (client export)' : ' · downloads to your device'}
          {format === 'pdf' ? ' · multi-page PDF (jsPDF)' : ''}
        </p>
      )}

      <button
        type="button"
        className="btn-tool btn-tool-active"
        disabled={busy || !artboard}
        onClick={() => void exportNow()}
      >
        {busy ? 'Exporting…' : `Export ${format.toUpperCase()}`}
      </button>
      <button type="button" className="btn-tool" disabled={busy} onClick={() => void saveProject()}>
        Save Project
      </button>

      {status && <p className="text-[11px] text-ink-700">{status}</p>}
      {(!canPdf || !canHd) && (
        <a href="/pricing" className="text-[11px] font-semibold text-[var(--sn-editor-accent-deep)]">
          Upgrade for PDF + HD export
        </a>
      )}
    </div>
  );
}
