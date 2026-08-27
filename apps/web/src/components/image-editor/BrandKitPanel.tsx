/**
 * Brand kit display, custom colors/logo, localStorage + API persistence.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ALT_BRAND_KIT, DEMO_BRAND_KIT } from '@/lib/demoBrandKit';
import { useImageEditorStore } from '@/store/imageEditorStore';
import { flattenLayers, type BrandKit } from '@sn-editor/editor-core';
import { primaryArtboardId } from '@/lib/pageLayers';

const STORAGE_KEY = 'sn-editor-brand-kits';
const BUILTIN: BrandKit[] = [DEMO_BRAND_KIT, ALT_BRAND_KIT];

function loadLocalKits(): BrandKit[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BrandKit[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalKits(kits: BrandKit[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(kits));
}

export function BrandKitPanel() {
  const applyBrand = useImageEditorStore((s) => s.applyBrand);
  const placeBrandLogo = useImageEditorStore((s) => s.placeBrandLogo);
  const brandKitId = useImageEditorStore((s) => s.history.present.brandKitId);
  const [savedKits, setSavedKits] = useState<BrandKit[]>([]);
  const [activeId, setActiveId] = useState(brandKitId ?? DEMO_BRAND_KIT.id);
  const [status, setStatus] = useState<string | null>(null);
  const [newColor, setNewColor] = useState('#7c3aed');
  const [kitName, setKitName] = useState('My Brand');
  const colorInputRef = useRef<HTMLInputElement>(null);

  const allKits = [...BUILTIN, ...savedKits];
  const brand = allKits.find((k) => k.id === activeId) ?? DEMO_BRAND_KIT;

  useEffect(() => {
    setSavedKits(loadLocalKits());
    void fetch('/api/brand-kits')
      .then((r) => r.json())
      .then((data: { brandKits?: BrandKit[] }) => {
        if (!data.brandKits?.length) return;
        const local = loadLocalKits();
        const byId = new Map<string, BrandKit>();
        for (const k of [...local, ...data.brandKits]) {
          if (BUILTIN.some((b) => b.id === k.id)) continue;
          byId.set(k.id, k);
        }
        const merged = Array.from(byId.values());
        setSavedKits(merged);
        saveLocalKits(merged);
      })
      .catch(() => undefined);
  }, []);

  const applyKit = useCallback(
    (kit: BrandKit, detail?: string) => {
      setActiveId(kit.id);
      applyBrand(kit);
      setStatus(detail ?? `Applied “${kit.name}” to the canvas`);
    },
    [applyBrand],
  );

  const persistKit = (next: BrandKit, applyCanvas: boolean, detail?: string) => {
    if (BUILTIN.some((b) => b.id === brand.id)) {
      const copy: BrandKit = {
        ...next,
        id: `brand_custom_${Date.now().toString(36)}`,
        name: next.name === brand.name ? `${brand.name} (custom)` : next.name,
      };
      setSavedKits((prev) => {
        const list = [...prev, copy];
        saveLocalKits(list);
        return list;
      });
      setActiveId(copy.id);
      if (applyCanvas) applyKit(copy, detail ?? 'Customized built-in kit');
      return copy;
    }
    setSavedKits((prev) => {
      const list = prev.map((k) => (k.id === next.id ? next : k));
      saveLocalKits(list);
      return list;
    });
    if (applyCanvas) applyKit(next, detail);
    return next;
  };

  const updateActiveKit = (patch: Partial<BrandKit>) => {
    persistKit({ ...brand, ...patch }, true);
  };

  const placeLogoOnPage = (src: string) => {
    if (!src) return;
    placeBrandLogo(src);
    setStatus('Logo added to this page');
  };

  const addColorHex = (hex: string) => {
    const c = hex.trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(c)) {
      setStatus('Pick a valid color first');
      return;
    }
    if (brand.colors.some((x) => x.toLowerCase() === c.toLowerCase())) {
      setStatus(`${c} is already in the kit — pick a different color`);
      return;
    }
    updateActiveKit({ colors: [...brand.colors, c] });
    setStatus(`Added ${c}`);
  };

  const addColor = () => {
    addColorHex(newColor);
    window.setTimeout(() => colorInputRef.current?.click(), 0);
  };

  const uploadLogo = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/svg+xml';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result ?? '');
        persistKit(
          {
            ...brand,
            logos: [
              {
                id: `logo_${Date.now().toString(36)}`,
                kind: 'logo',
                name: file.name,
                urlOrKey: url,
              },
              ...brand.logos,
            ],
          },
          false,
        );
        placeLogoOnPage(url);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const saveCustomKit = async () => {
    const kit: BrandKit = {
      ...brand,
      id: brand.id.startsWith('brand_demo')
        ? `brand_custom_${Date.now().toString(36)}`
        : brand.id,
      name: kitName.trim() || brand.name,
    };
    const nextSaved = [
      kit,
      ...savedKits.filter((k) => k.id !== kit.id),
    ];
    setSavedKits(nextSaved);
    saveLocalKits(nextSaved);
    setActiveId(kit.id);
    applyBrand(kit);
    setStatus('Saved to localStorage');
    try {
      const res = await fetch('/api/brand-kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kit),
      });
      if (res.ok) setStatus('Saved locally + API');
    } catch {
      // local save is enough
    }
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-600">Brand Kit</h2>

      <div className="flex flex-wrap gap-1">
        {allKits.map((k) => (
          <button
            key={k.id}
            type="button"
            className={activeId === k.id ? 'btn-tool btn-tool-active' : 'btn-tool'}
            onClick={() => applyKit(k)}
          >
            {k.name}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-fog-200 bg-fog-50 p-3">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg text-ink-900">{brand.name}</p>
          {brandKitId === brand.id && (
            <span className="rounded-full bg-teal-700/10 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
              Active
            </span>
          )}
        </div>

        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-600">Colors</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {brand.colors.map((c, idx) => (
            <button
              key={`${c}-${idx}`}
              type="button"
              title={`Apply primary ${c}`}
              className="h-8 w-8 rounded-lg border border-black/5 shadow-sm"
              style={{ background: c }}
              onClick={() => {
                updateActiveKit({
                  colors: [c, ...brand.colors.filter((x) => x !== c)],
                });
              }}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            ref={colorInputRef}
            type="color"
            className="h-10 w-12 cursor-pointer rounded-lg border border-fog-200 bg-white"
            value={newColor}
            title="Pick a color"
            onChange={(e) => setNewColor(e.target.value)}
            onBlur={() => addColorHex(newColor)}
          />
          <button type="button" className="btn-tool flex-1" onClick={addColor}>
            Add color
          </button>
          <button
            type="button"
            className="btn-tool btn-tool-active"
            onClick={() => addColorHex(newColor)}
          >
            Save
          </button>
        </div>

        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-600">Fonts</p>
        <ul className="mt-1 space-y-1 text-sm text-ink-800">
          {brand.fonts.map((f) => (
            <li key={f.family} style={{ fontFamily: f.family }}>
              {f.family}
            </li>
          ))}
        </ul>

        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-600">Logo</p>
        {brand.logos.some((l) => l.urlOrKey) ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {brand.logos
              .filter((l) => l.urlOrKey)
              .map((logo) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={logo.id}
                  src={logo.urlOrKey}
                  alt={logo.name ?? 'Logo'}
                  className="h-14 w-14 cursor-pointer rounded-xl border border-fog-200 bg-white object-contain p-1"
                  title="Add this logo to the current page"
                  onClick={() => placeLogoOnPage(logo.urlOrKey)}
                />
              ))}
          </div>
        ) : (
          <p className="mt-1.5 text-[11px] text-ink-500">No logo in this kit yet</p>
        )}
        {brand.logos[0]?.urlOrKey && (
          <button
            type="button"
            className="btn-tool btn-tool-active mt-2 w-full justify-center"
            onClick={() => placeLogoOnPage(brand.logos[0].urlOrKey)}
          >
            Add logo to this page
          </button>
        )}
        <p className="mt-2 text-[10px] font-semibold text-ink-600">Logo shape</p>
        <div className="mt-1 grid grid-cols-4 gap-1">
          {(
            [
              ['square', 'Square'],
              ['rounded', 'Round'],
              ['circle', 'Circle'],
              ['squircle', 'Soft'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="btn-tool !px-1 !py-1.5 text-[10px]"
              onClick={() => {
                const state = useImageEditorStore.getState();
                const present = state.document();
                const pageId = state.activeArtboardId ?? primaryArtboardId(present);
                const fallback = primaryArtboardId(present);
                const onPage = flattenLayers(present.layers).find(
                  (l) => l.name === 'Brand Logo' && (l.artboardId ?? fallback) === pageId,
                );
                if (onPage) {
                  state.updateLayerProps(onPage.id, { imageMask: id });
                  state.setSelectedIds([onPage.id]);
                  return;
                }
                if (brand.logos[0]?.urlOrKey) {
                  placeLogoOnPage(brand.logos[0].urlOrKey);
                  window.setTimeout(() => {
                    const next = useImageEditorStore.getState();
                    const doc = next.document();
                    const pid = next.activeArtboardId ?? primaryArtboardId(doc);
                    const logo = flattenLayers(doc.layers).find(
                      (l) => l.name === 'Brand Logo' && (l.artboardId ?? primaryArtboardId(doc)) === pid,
                    );
                    if (logo) {
                      next.updateLayerProps(logo.id, { imageMask: id });
                      next.setSelectedIds([logo.id]);
                    }
                  }, 0);
                }
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="btn-tool mt-2 w-full justify-center" onClick={() => void uploadLogo()}>
          Upload logo
        </button>

        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-600">CTA styles</p>
        <div className="mt-1.5 flex flex-col gap-1.5">
          {brand.ctaStyles.map((cta) => (
            <button
              key={cta.id}
              type="button"
              className="px-3 py-2 text-center text-xs font-semibold transition hover:opacity-90"
              style={{
                background: cta.fill,
                color: cta.textColor,
                borderRadius: cta.borderRadius,
              }}
              onClick={() => {
                updateActiveKit({
                  ctaStyles: [cta, ...brand.ctaStyles.filter((x) => x.id !== cta.id)],
                });
              }}
            >
              {cta.label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2 border-t border-fog-200 pt-3">
          <label className="block text-[11px] font-semibold text-ink-600">
            Kit name
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-fog-200 bg-white px-2 py-1.5 text-sm"
              value={kitName}
              onChange={(e) => setKitName(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="btn-tool w-full justify-center"
            onClick={() => void saveCustomKit()}
          >
            Save kit
          </button>
        </div>

        <button
          type="button"
          className="btn-tool btn-tool-active mt-3 w-full"
          onClick={() => applyKit(brand)}
        >
          Apply Brand Kit
        </button>
        {status && <p className="mt-2 text-[11px] text-teal-800">{status}</p>}
      </div>
    </div>
  );
}
