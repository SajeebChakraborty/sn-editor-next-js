/**
 * Tracks remove/replace-background progress for on-canvas image overlays.
 */
'use client';

import { create } from 'zustand';

export type LayerAiJob = {
  layerId: string;
  kind: 'remove-bg' | 'replace-bg' | 'other';
  label: string;
  /** 0–100 when known (download progress); null = indeterminate */
  percent: number | null;
  startedAt: number;
};

type LayerAiProgressState = {
  job: LayerAiJob | null;
  startJob: (opts: {
    layerId: string;
    kind: LayerAiJob['kind'];
    label: string;
  }) => void;
  setLabel: (label: string) => void;
  setPercent: (percent: number | null) => void;
  /** Parse progress strings like "Downloading AI · foo 42%" into percent when possible. */
  report: (message: string) => void;
  clear: () => void;
};

function parsePercent(message: string): number | null {
  const m = message.match(/(\d{1,3})\s*%/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : null;
}

export const useLayerAiProgressStore = create<LayerAiProgressState>((set, get) => ({
  job: null,

  startJob: ({ layerId, kind, label }) =>
    set({
      job: {
        layerId,
        kind,
        label,
        percent: null,
        startedAt: Date.now(),
      },
    }),

  setLabel: (label) => {
    const job = get().job;
    if (!job) return;
    set({ job: { ...job, label } });
  },

  setPercent: (percent) => {
    const job = get().job;
    if (!job) return;
    set({ job: { ...job, percent } });
  },

  report: (message) => {
    const job = get().job;
    if (!job) return;
    const percent = parsePercent(message);
    set({
      job: {
        ...job,
        label: message,
        percent: percent ?? job.percent,
      },
    });
  },

  clear: () => set({ job: null }),
}));
