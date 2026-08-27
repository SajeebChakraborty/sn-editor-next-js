/**
 * Video AI tools panel — applies real timeline changes (client-side).
 */
'use client';

import { useState } from 'react';
import {
  ALL_VIDEO_AI_TOOLS,
  VIDEO_AI_TOOL_LABELS,
  VideoAiTool,
  type VideoAiToolId,
} from '@sn-editor/ai-contracts';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { useVideoEditorStore } from '@/store/videoEditorStore';

export function VideoAiPanel() {
  const runVideoAi = useVideoEditorStore((s) => s.runVideoAi);
  const pause = useVideoEditorStore((s) => s.pause);
  const enabled = isFeatureEnabled('aiVideoTools');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [lastTool, setLastTool] = useState<VideoAiToolId | null>(null);

  const run = async (tool: VideoAiToolId) => {
    setBusy(true);
    setLastTool(tool);
    setStatus(`Running ${VIDEO_AI_TOOL_LABELS[tool]}…`);
    pause();
    try {
      await new Promise((r) => setTimeout(r, 280));
      const message = runVideoAi(tool);
      setStatus(message);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'AI tool failed');
    } finally {
      setBusy(false);
    }
  };

  if (!enabled) {
    return (
      <div className="p-3 text-xs text-ink-600">AI video tools are disabled by feature flag.</div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-600">Video AI</h2>
      <p className="text-[11px] text-ink-600">
        Tools edit your timeline immediately — watch the preview and tracks update.
      </p>

      <button
        type="button"
        disabled={busy}
        className="rounded-xl bg-teal-700 px-3 py-3 text-left text-sm font-semibold text-white shadow-panel transition hover:bg-teal-600 disabled:opacity-50"
        onClick={() => void run(VideoAiTool.MakeTikTokAd)}
      >
        {VIDEO_AI_TOOL_LABELS[VideoAiTool.MakeTikTokAd]}
        <span className="mt-1 block text-[11px] font-normal text-white/80">
          Auto-assemble hook, B-roll, captions & CTA
        </span>
      </button>

      <div className="grid grid-cols-1 gap-1.5">
        {ALL_VIDEO_AI_TOOLS.filter((t) => t !== VideoAiTool.MakeTikTokAd).map((tool) => (
          <button
            key={tool}
            type="button"
            disabled={busy}
            className={`btn-tool text-left ${lastTool === tool ? 'btn-tool-active' : ''}`}
            onClick={() => void run(tool)}
          >
            {VIDEO_AI_TOOL_LABELS[tool]}
          </button>
        ))}
      </div>

      {status && (
        <div className="rounded-lg border border-fog-200 bg-fog-50 p-2 text-[11px] text-ink-700">
          <p className="font-semibold">{status}</p>
        </div>
      )}
    </div>
  );
}
