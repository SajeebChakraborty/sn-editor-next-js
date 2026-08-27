/**
 * @fileoverview Export packaging worker — zips/bundles final deliverables + hello-world smoke.
 * Consumes the `export` queue.
 * // STUB: phase-1 — packaging is mocked; helloWorld proves queue wiring
 */

import { ExportJobType, type JobResult } from '@sn-editor/ai-contracts';
import {
  createQueueConnection,
  createWorkerHelper,
  helloWorldHandler,
  QueueName,
} from '@sn-editor/queue';

interface ExportJobData {
  type: string;
  jobId?: string;
  userId?: string;
  projectId?: string;
  message?: string;
  artifactKeys?: string[];
  [key: string]: unknown;
}

/**
 * Stub packaging: assemble artifact keys into a mock zip key.
 * // STUB: phase-1 — replace with real zip / multi-format packaging + S3 multipart upload
 */
async function runPackagingStub(data: ExportJobData): Promise<JobResult> {
  const jobId = data.jobId ?? 'stub-job';
  const userId = data.userId ?? 'stub-user';
  const projectId = data.projectId ?? 'stub-project';

  await new Promise((r) => setTimeout(r, 40));

  const packageKey = `users/${userId}/projects/${projectId}/exports/${jobId}.zip`;
  return {
    outputKeys: [packageKey],
    meta: {
      engine: 'packaging-stub',
      included: data.artifactKeys ?? [],
    },
  };
}

async function main(): Promise<void> {
  const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
  const connection = createQueueConnection({ url: redisUrl });

  createWorkerHelper<ExportJobData>({
    queueName: QueueName.Export,
    connection,
    concurrency: Number(process.env.EXPORT_WORKER_CONCURRENCY ?? 2),
    processor: async (job) => {
      const type = job.data.type ?? job.name;

      if (type === ExportJobType.HelloWorld) {
        const result = await helloWorldHandler({ message: job.data.message });
        console.log('[export-worker] helloWorld', result.meta);
        return result;
      }

      const result = await runPackagingStub(job.data);
      console.log('[export-worker] package done', result.meta);
      return result;
    },
  });

  console.log('[export-worker] listening on export queue (packaging STUB)');
}

main().catch((err) => {
  console.error('[export-worker] fatal', err);
  process.exit(1);
});
