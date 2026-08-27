/**
 * Asset browser with real image / video / audio upload.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssetRef } from '@sn-editor/editor-core';
import { useImageEditorStore } from '@/store/imageEditorStore';
import {
  fileToLocalUpload,
  persistAssetToApi,
  pickFiles,
  type LocalUpload,
} from '@/lib/mediaUpload';
import { ICON_PACK } from '@/lib/iconPack';
import { isRenderableAssetUrl } from '@/lib/demoLibraryAssets';

const KINDS: AssetRef['kind'][] = ['image', 'logo', 'icon', 'video', 'music'];

export function AssetsPanel() {
  const [kind, setKind] = useState<AssetRef['kind'] | 'all'>('all');
  const [assets, setAssets] = useState<AssetRef[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const localExtras = useRef<AssetRef[]>([]);
  const setLeftTab = useImageEditorStore((s) => s.setLeftTab);
  const addMediaLayer = useImageEditorStore((s) => s.addMediaLayer);

  const refresh = useCallback(() => {
    const q = kind === 'all' ? '' : `?kind=${kind}`;
    fetch(`/api/assets${q}`)
      .then((r) => r.json())
      .then((data: { assets: AssetRef[] }) => {
        const remote = (data.assets ?? []).filter((a) => isRenderableAssetUrl(a.urlOrKey));
        const extras = localExtras.current.filter(
          (a) => kind === 'all' || a.kind === kind,
        );
        const byId = new Map<string, AssetRef>();
        for (const a of [...remote, ...extras]) byId.set(a.id, a);
        setAssets(Array.from(byId.values()).reverse());
      })
      .catch(() => setAssets([...localExtras.current]));
  }, [kind]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const placeUpload = (upload: LocalUpload) => {
    if (upload.kind === 'music' || !isRenderableAssetUrl(upload.url)) return;
    addMediaLayer({
      name: upload.name,
      src: upload.url,
      kind: upload.kind === 'video' ? 'video' : 'image',
      width: upload.width ?? 480,
      height: upload.height ?? 480,
    });
  };

  const insertIcon = (icon: (typeof ICON_PACK)[number]) => {
    addMediaLayer({
      name: icon.name,
      src: icon.dataUrl,
      kind: 'image',
      width: 128,
      height: 128,
    });
  };

  const handleFiles = async (files: File[], preferred?: LocalUpload['kind']) => {
    if (!files.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of files) {
        const upload = await fileToLocalUpload(file, preferred);
        const asset: AssetRef = {
          id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          kind: upload.kind,
          name: upload.name,
          urlOrKey: upload.url,
        };
        localExtras.current = [asset, ...localExtras.current];
        await persistAssetToApi(upload);
        if (upload.kind !== 'music') placeUpload(upload);
      }
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const uploadImages = async () => {
    const files = await pickFiles({
      accept: 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml',
      multiple: true,
    });
    await handleFiles(files, 'image');
  };

  const uploadVideos = async () => {
    const files = await pickFiles({
      accept: 'video/mp4,video/webm,video/quicktime',
      multiple: true,
    });
    await handleFiles(files, 'video');
  };

  const uploadAudio = async () => {
    const files = await pickFiles({
      accept: 'audio/mpeg,audio/wav,audio/mp4,audio/*',
      multiple: true,
    });
    await handleFiles(files, 'music');
  };

  const insert = (asset: AssetRef) => {
    if (asset.kind === 'music' || !isRenderableAssetUrl(asset.urlOrKey)) return;
    placeUpload({
      name: asset.name,
      kind: asset.kind,
      mimeType: '',
      url: asset.urlOrKey,
      width: 480,
      height: 480,
    });
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-700">Assets</h2>

      <div className="flex flex-col gap-2 rounded-xl border border-fog-200 bg-[var(--sn-editor-accent-muted)] p-3">
        <p className="text-xs font-semibold text-ink-900">Upload media to edit</p>
        <button
          type="button"
          className="btn-tool btn-tool-active w-full justify-center"
          disabled={busy}
          onClick={uploadImages}
        >
          {busy ? 'Uploading…' : 'Upload images'}
        </button>
        <button
          type="button"
          className="btn-tool w-full justify-center"
          disabled={busy}
          onClick={uploadVideos}
        >
          Upload videos
        </button>
        <button
          type="button"
          className="btn-tool w-full justify-center"
          disabled={busy}
          onClick={uploadAudio}
        >
          Upload music
        </button>
        <p className="text-[11px] leading-snug text-ink-600">
          Images land on the canvas. Videos are added here — open{' '}
          <button
            type="button"
            className="font-semibold text-teal-800 underline"
            onClick={() => {
              window.location.href = '/video';
            }}
          >
            Video editor
          </button>{' '}
          for timeline edits, or click a video below to place a preview frame.
        </p>
        {error && <p className="text-[11px] text-red-700">{error}</p>}
      </div>

      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          className={kind === 'all' ? 'btn-tool btn-tool-active' : 'btn-tool'}
          onClick={() => setKind('all')}
        >
          All
        </button>
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            className={kind === k ? 'btn-tool btn-tool-active' : 'btn-tool'}
            onClick={() => setKind(k)}
          >
            {k}
          </button>
        ))}
      </div>

      {(kind === 'all' || kind === 'icon') && (
        <div className="rounded-xl border border-fog-200 bg-fog-50 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-700">
            Icon pack
          </p>
          <p className="mb-2 text-[10px] text-ink-600">
            SVG icons as images. Recolor with a tinted shape behind or overlay.
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {ICON_PACK.map((icon) => (
              <button
                key={icon.id}
                type="button"
                title={icon.name}
                className="flex flex-col items-center gap-1 rounded-lg border border-fog-200 bg-white p-1.5 transition hover:border-teal-600"
                onClick={() => insertIcon(icon)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={icon.dataUrl} alt="" className="h-7 w-7 dark:hidden" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={icon.previewUrl} alt="" className="hidden h-7 w-7 dark:block" />
                <span className="max-w-full truncate text-[9px] font-semibold text-ink-700">
                  {icon.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {assets.map((asset) => (
          <button
            key={asset.id}
            type="button"
            className="flex items-center gap-2 rounded-lg border border-fog-200 bg-white px-2 py-2 text-left text-xs transition hover:border-teal-600"
            onClick={() => insert(asset)}
            disabled={asset.kind === 'music'}
            title={asset.kind === 'music' ? 'Use in Video editor' : 'Click to place on canvas'}
          >
            <AssetThumb asset={asset} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-ink-900">{asset.name}</span>
              <span className="text-ink-600">{asset.kind}</span>
            </span>
          </button>
        ))}
        {assets.length === 0 && (
          <p className="text-xs text-ink-600/70">
            No assets yet. Use Upload images / videos above.
          </p>
        )}
      </div>

      <button
        type="button"
        className="text-[11px] text-teal-800 underline"
        onClick={() => setLeftTab('ai')}
      >
        Go to AI tools after uploading →
      </button>
    </div>
  );
}

function KindFallback({ kind }: { kind: AssetRef['kind'] }) {
  const label = kind === 'video' ? '▶' : kind === 'music' ? '♪' : 'img';
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-fog-100 text-[10px] font-bold uppercase text-ink-600">
      {label}
    </div>
  );
}

function AssetThumb({ asset }: { asset: AssetRef }) {
  const [failed, setFailed] = useState(false);
  const url = asset.urlOrKey;
  const canPaint = !failed && isRenderableAssetUrl(url);

  if (canPaint && (asset.kind === 'image' || asset.kind === 'logo' || asset.kind === 'icon')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className="h-10 w-10 shrink-0 rounded bg-fog-100 object-cover"
        onError={() => setFailed(true)}
      />
    );
  }
  if (canPaint && asset.kind === 'video' && !url.startsWith('data:image')) {
    return (
      <video
        src={url}
        muted
        playsInline
        className="h-10 w-10 shrink-0 rounded bg-ink-900 object-cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return <KindFallback kind={asset.kind} />;
}
