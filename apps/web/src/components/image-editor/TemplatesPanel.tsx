/**
 * Template browser covering every TEMPLATE_CHANNELS entry.
 */
'use client';

import { useMemo, useState } from 'react';
import {
  TEMPLATE_CHANNELS,
  TEMPLATE_CHANNEL_LABELS,
  TEMPLATE_SIZES,
  type TemplateChannel,
} from '@sn-editor/shared';
import { getTemplatesByChannel, SEED_TEMPLATES } from '@/lib/templates';
import { useImageEditorStore } from '@/store/imageEditorStore';

export function TemplatesPanel() {
  const [channel, setChannel] = useState<TemplateChannel | 'all'>('all');
  const loadDocument = useImageEditorStore((s) => s.loadDocument);

  const list = useMemo(
    () => (channel === 'all' ? SEED_TEMPLATES : getTemplatesByChannel(channel)),
    [channel],
  );

  return (
    <div className="flex flex-col gap-3 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-600">Templates</h2>
      <select
        className="rounded-lg border border-fog-200 bg-white px-2 py-1.5 text-xs font-semibold"
        value={channel}
        onChange={(e) => setChannel(e.target.value as TemplateChannel | 'all')}
      >
        <option value="all">All channels ({SEED_TEMPLATES.length})</option>
        {TEMPLATE_CHANNELS.map((c) => (
          <option key={c} value={c}>
            {TEMPLATE_CHANNEL_LABELS[c]} ({getTemplatesByChannel(c).length})
          </option>
        ))}
      </select>

      <div className="flex flex-col gap-2">
        {list.map((tpl) => {
          const size = TEMPLATE_SIZES[tpl.channel];
          const bg = tpl.document.artboards[0]?.background ?? '#e8eef0';
          const accent =
            tpl.document.layers.find((l) => l.type === 'shape' && l.fill)?.fill ?? '#0f766e';
          return (
            <button
              key={tpl.id}
              type="button"
              className="rounded-xl border border-fog-200 bg-fog-50 p-3 text-left transition hover:border-teal-600"
              onClick={() => loadDocument(structuredClone(tpl.document))}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{tpl.name}</p>
                  <p className="text-[11px] text-ink-600">
                    {TEMPLATE_CHANNEL_LABELS[tpl.channel]} · {size.width}×{size.height}
                  </p>
                </div>
                <div
                  className="shrink-0 overflow-hidden rounded border border-fog-200"
                  style={{
                    width: 40,
                    height: Math.max(28, Math.round((40 * size.height) / size.width)),
                    background: bg,
                  }}
                  aria-hidden
                >
                  <div className="h-full w-1/4" style={{ background: String(accent) }} />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
