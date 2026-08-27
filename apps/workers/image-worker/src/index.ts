/**
 * @fileoverview Image export worker — Sharp / libvips oriented CPU path.
 * Consumes the `image` queue for `export.image` jobs.
 * // STUB: phase-1 — no Sharp calls yet; returns mock PNG/S3 keys
 */

import { ExportJobType, type JobResult } from '@sn-editor/ai-contracts';
import {
  createQueueConnection,
  createWorkerHelper,
  QueueName,
} from '@sn-editor/queue';

interface ImageExportJobData {
  type: string;
  jobId?: string;
  userId?: string;
  projectId?: string;
  format?: string;
  [key: string]: unknown;
}

/**
 * Stub Sharp export: simulate encode + upload.
 * // STUB: phase-1 — replace with real Sharp pipeline (artboard flatten → PNG/WebP/JPEG)
 */
async function runSharpExportStub(data: ImageExportJobData): Promise<JobResult> {
  const jobId = data.jobId ?? 'stub-job';
  const userId = data.userId ?? 'stub-user';
  const projectId = data.projectId ?? 'stub-project';
  const ext = (data.format as string | undefined) ?? 'png';

  await new Promise((r) => setTimeout(r, 50));

  const outputKey = `users/${userId}/projects/${projectId}/exports/${jobId}.${ext}`;
  return {
    outputKeys: [outputKey],
    meta: {
      tool: ExportJobType.ImageExport,
      engine: 'sharp-stub',
      format: ext,
    },
  };
}

async function main(): Promise<void> {
  const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
  const connection = createQueueConnection({ url: redisUrl });

  createWorkerHelper<ImageExportJobData>({
    queueName: QueueName.Image,
    connection,
    concurrency: Number(process.env.IMAGE_WORKER_CONCURRENCY ?? 2),
    processor: async (job) => {
      if (job.data.type !== ExportJobType.ImageExport && job.name !== ExportJobType.ImageExport) {
        console.warn(`[image-worker] unexpected job ${job.name}`);
      }
      const result = await runSharpExportStub({ ...job.data, type: ExportJobType.ImageExport });
      console.log('[image-worker] export done', result.meta);
      return result;
    },
  });

  console.log('[image-worker] listening on image queue (Sharp STUB)');
}

main().catch((err) => {
  console.error('[image-worker] fatal', err);
  process.exit(1);
});
