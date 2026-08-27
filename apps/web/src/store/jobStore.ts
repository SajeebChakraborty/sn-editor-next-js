/**
 * Tracks AI / export job progress for editor panels.
 */
'use client';

import { create } from 'zustand';
import type { JobTypeId } from '@sn-editor/ai-contracts';
import { createJob, getJob, type JobRecord } from '@/lib/jobs';

interface JobStoreState {
  jobs: JobRecord[];
  activeJobId: string | null;
  busy: boolean;
  error: string | null;

  enqueue: (type: JobTypeId | string, input?: Record<string, unknown>) => Promise<JobRecord>;
  refresh: (id: string) => Promise<JobRecord>;
  simulateProgress: (id: string) => void;
  clearError: () => void;
}

export const useJobStore = create<JobStoreState>((set, get) => ({
  jobs: [],
  activeJobId: null,
  busy: false,
  error: null,

  enqueue: async (type, input) => {
    set({ busy: true, error: null });
    try {
      const job = await createJob({ type, input });
      set((s) => ({
        jobs: [job, ...s.jobs],
        activeJobId: job.id,
        busy: false,
      }));
      // Demo: advance status client-side when the API stub is instantaneous.
      get().simulateProgress(job.id);
      return job;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Job enqueue failed';
      set({ busy: false, error: message });
      throw err;
    }
  },

  refresh: async (id) => {
    const job = await getJob(id);
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? job : j)),
    }));
    return job;
  },

  simulateProgress: (id) => {
    const steps = [
      { status: 'running' as const, progress: 35 },
      { status: 'running' as const, progress: 70 },
      { status: 'succeeded' as const, progress: 100 },
    ];
    let i = 0;
    const timer = setInterval(() => {
      const step = steps[i++];
      if (!step) {
        clearInterval(timer);
        return;
      }
      set((s) => ({
        jobs: s.jobs.map((j) =>
          j.id === id
            ? {
                ...j,
                status: step.status,
                progress: step.progress,
                updatedAt: new Date().toISOString(),
                result:
                  step.status === 'succeeded'
                    ? { outputKeys: [`out/${id}`], meta: { demo: true } }
                    : j.result,
              }
            : j,
        ),
      }));
    }, 450);
  },

  clearError: () => set({ error: null }),
}));
