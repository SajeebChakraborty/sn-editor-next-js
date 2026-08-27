/**
 * Elapsed-time helpers for long AI jobs (remove / replace background).
 */

export function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

export type ProgressReporter = (message: string) => void;

/** Wraps a progress callback so every update includes elapsed time. */
export function createTimedProgress(onProgress?: ProgressReporter): {
  report: ProgressReporter;
  startedAt: number;
  elapsedMs: () => number;
} {
  const startedAt = Date.now();
  const elapsedMs = () => Date.now() - startedAt;
  const report: ProgressReporter = (message) => {
    onProgress?.(`${message} · ${formatElapsed(elapsedMs())}`);
  };
  return { report, startedAt, elapsedMs };
}
