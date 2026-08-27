/**
 * Image AI toolkit — processes selected/uploaded image pixels on the canvas.
 */
'use client';

import { useState } from 'react';
import {
  ALL_IMAGE_AI_TOOLS,
  IMAGE_AI_TOOL_LABELS,
  type ImageAiToolId,
} from '@sn-editor/ai-contracts';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { applyImageAiEffect } from '@/lib/clientAiEffects';
import { useImageEditorStore } from '@/store/imageEditorStore';

export function AiToolsPanel() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [lastTool, setLastTool] = useState<ImageAiToolId | null>(null);
  const commit = useImageEditorStore((s) => s.commit);
  const document = useImageEditorStore((s) => s.document);
  const selectedIds = useImageEditorStore((s) => s.selectedIds);
  const enabled = isFeatureEnabled('aiImageTools');

  const run = async (tool: ImageAiToolId) => {
    setBusy(true);
    setLastTool(tool);
    setProgress(15);
    setStatus(`Running ${IMAGE_AI_TOOL_LABELS[tool]}…`);
    try {
      setProgress(40);
      const doc = document();
      const selectedId = selectedIds[0];
      const result = await applyImageAiEffect(doc, tool, selectedId, setStatus);
      setProgress(85);
      commit(result.document);
      // Re-select so transformer stays on the edited image
      if (selectedId) {
        useImageEditorStore.getState().setSelectedIds([selectedId]);
      }
      setProgress(100);
      setStatus(result.message);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'AI tool failed');
      setProgress(0);
    } finally {
      setBusy(false);
    }
  };

  if (!enabled) {
    return (
      <div className="p-3 text-xs text-ink-600">AI image tools are disabled by feature flag.</div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-600">AI Tools</h2>
      <p className="text-[11px] text-ink-600">
        Select an uploaded image on the canvas (or the top image is used). Remove / Replace
        Background cut out the subject. Other tools edit that image live.
      </p>
      <div className="grid grid-cols-1 gap-1.5">
        {ALL_IMAGE_AI_TOOLS.map((tool) => (
          <button
            key={tool}
            type="button"
            disabled={busy}
            className={`btn-tool text-left ${lastTool === tool ? 'btn-tool-active' : ''}`}
            onClick={() => void run(tool)}
          >
            {IMAGE_AI_TOOL_LABELS[tool]}
          </button>
        ))}
      </div>
      {status && (
        <div className="rounded-lg border border-fog-200 bg-fog-50 p-2 text-[11px] text-ink-700">
          <p className="font-semibold">{status}</p>
          {busy && (
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-fog-200">
              <div className="h-full bg-teal-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
