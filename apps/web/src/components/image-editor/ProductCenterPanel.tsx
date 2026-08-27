/**
 * Product Center: product types + one-click scenes applied to the canvas.
 */
'use client';

import { useState } from 'react';
import {
  PRODUCT_SCENES,
  PRODUCT_SCENE_LABELS,
  PRODUCT_TYPES,
  type ProductScene,
  type ProductType,
} from '@sn-editor/shared';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { applyProductSceneToDocument, SCENE_LOOK } from '@/lib/clientAiEffects';
import { useImageEditorStore } from '@/store/imageEditorStore';

export function ProductCenterPanel() {
  const [productType, setProductType] = useState<ProductType>('bottle');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [lastScene, setLastScene] = useState<ProductScene | null>(null);
  const commit = useImageEditorStore((s) => s.commit);
  const document = useImageEditorStore((s) => s.document);
  const enabled = isFeatureEnabled('productCenter');

  const applyScene = async (scene: ProductScene) => {
    setBusy(true);
    setStatus('Applying scene…');
    try {
      // Small delay so the button feels like a tool run
      await new Promise((r) => setTimeout(r, 280));
      const next = applyProductSceneToDocument(document(), scene, productType);
      commit(next);
      setLastScene(scene);
      setStatus(`${PRODUCT_SCENE_LABELS[scene]} · ${productType} applied`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Scene failed');
    } finally {
      setBusy(false);
    }
  };

  if (!enabled) {
    return (
      <div className="p-3 text-xs text-ink-600">Product Center is disabled by feature flag.</div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-600">
        Product Center
      </h2>

      <p className="text-[11px] font-semibold text-ink-600">Product type</p>
      <div className="flex flex-wrap gap-1">
        {PRODUCT_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className={productType === t ? 'btn-tool btn-tool-active' : 'btn-tool'}
            onClick={() => setProductType(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <p className="text-[11px] font-semibold text-ink-600">One-click scenes</p>
      <div className="grid grid-cols-1 gap-1.5">
        {PRODUCT_SCENES.map((scene) => (
          <button
            key={scene}
            type="button"
            disabled={busy}
            className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold capitalize transition hover:border-teal-600 ${
              lastScene === scene
                ? 'border-teal-600 bg-teal-700/10 text-teal-900'
                : 'border-fog-200 bg-white text-ink-800'
            }`}
            style={{
              borderLeftWidth: 4,
              borderLeftColor: SCENE_LOOK[scene].accent,
            }}
            onClick={() => void applyScene(scene)}
          >
            {PRODUCT_SCENE_LABELS[scene]}
          </button>
        ))}
      </div>

      {status && <p className="text-[11px] text-ink-700">{status}</p>}
    </div>
  );
}
