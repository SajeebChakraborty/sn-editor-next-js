/**
 * @fileoverview Video export worker — FFmpeg oriented CPU/GPU path.
 * Consumes the `video` queue for `export.video` jobs.
 * // STUB: phase-1 — no FFmpeg spawn yet; returns mock MP4/S3 keys
 */

import { ExportJobType, type JobResult } from '@sn-editor/ai-contracts';
import {
  createQueueConnection,
  createWorkerHelper,
  QueueName,
} from '@sn-editor/queue';

interface VideoExportJobData {
  type: string;
  jobId?: string;
  userId?: string;
  projectId?: string;
  format?: string;
  [key: string]: unknown;
}

/**
 * Stub FFmpeg export: simulate remux/encode + upload.
 * // STUB: phase-1 — replace with real FFmpeg fluent API / child_process pipeline
 */
async function runFfmpegExportStub(data: VideoExportJobData): Promise<JobResult> {
  const jobId = data.jobId ?? 'stub-job';
  const userId = data.userId ?? 'stub-user';
  const projectId = data.projectId ?? 'stub-project';
  const ext = (data.format as string | undefined) ?? 'mp4';

  await new Promise((r) => setTimeout(r, 75));

  const outputKey = `users/${userId}/projects/${projectId}/exports/${jobId}.${ext}`;
  return {
    outputKeys: [outputKey],
    meta: {
      tool: ExportJobType.VideoExport,
      engine: 'ffmpeg-stub',
      format: ext,
    },
  };
}

async function main(): Promise<void> {
  const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
  const connection = createQueueConnection({ url: redisUrl });

  createWorkerHelper<VideoExportJobData>({
    queueName: QueueName.Video,
    connection,
    concurrency: Number(process.env.VIDEO_WORKER_CONCURRENCY ?? 1),
    processor: async (job) => {
      const result = await runFfmpegExportStub({
        ...job.data,
        type: ExportJobType.VideoExport,
      });
      console.log('[video-worker] export done', result.meta);
      return result;
    },
  });

  console.log('[video-worker] listening on video queue (FFmpeg STUB)');
}

main().catch((err) => {
  console.error('[video-worker] fatal', err);
  process.exit(1);
});
