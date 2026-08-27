/**
 * Client helpers for creating and polling AI / export jobs.
 */
import type { JobTypeId, JobStatus } from '@sn-editor/ai-contracts';

export interface JobRecord {
  id: string;
  type: JobTypeId | string;
  status: JobStatus;
  progress: number;
  input?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobPayload {
  type: JobTypeId | string;
  input?: Record<string, unknown>;
}

export async function createJob(payload: CreateJobPayload): Promise<JobRecord> {
  const res = await fetch('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`createJob failed: ${res.status} ${body}`);
  }
  return res.json() as Promise<JobRecord>;
}

export async function getJob(id: string): Promise<JobRecord> {
  const res = await fetch(`/api/jobs/${id}`, { cache: 'no-store' });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`getJob failed: ${res.status} ${body}`);
  }
  return res.json() as Promise<JobRecord>;
}

/** Poll until terminal status or timeout. */
export async function waitForJob(
  id: string,
  opts: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<JobRecord> {
  const intervalMs = opts.intervalMs ?? 400;
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const started = Date.now();
  for (;;) {
    const job = await getJob(id);
    if (job.status === 'succeeded' || job.status === 'failed' || job.status === 'cancelled') {
      return job;
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error(`Job ${id} timed out after ${timeoutMs}ms`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
