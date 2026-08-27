/**
 * Load-test stubs for export/AI queues (Phase 6).
 * Run with: `pnpm --filter @sn-editor/web exec tsx ../../scripts/load-test-stub.ts`
 */
export async function simulateQueueLoad(opts: {
  jobs: number;
  concurrency: number;
  enqueue: () => Promise<void>;
}): Promise<{ ok: number; failed: number; durationMs: number }> {
  const started = Date.now();
  let ok = 0;
  let failed = 0;
  const pending: Promise<void>[] = [];

  for (let i = 0; i < opts.jobs; i++) {
    const p = opts
      .enqueue()
      .then(() => {
        ok += 1;
      })
      .catch(() => {
        failed += 1;
      });
    pending.push(p);
    if (pending.length >= opts.concurrency) {
      await Promise.race(pending);
    }
  }
  await Promise.allSettled(pending);
  return { ok, failed, durationMs: Date.now() - started };
}
