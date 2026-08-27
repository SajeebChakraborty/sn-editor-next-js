/**
 * @fileoverview AI GPU worker — consumes `ai-image` and `ai-video` BullMQ queues.
 * Handles all ImageAiTool and VideoAiTool IDs via stub providers (progress + mock results).
 * Non-goals: real model inference (phase-2+ provider adapters).
 */

import {
  ALL_IMAGE_AI_TOOLS,
  ALL_VIDEO_AI_TOOLS,
  type ImageAiToolId,
  type VideoAiToolId,
} from '@sn-editor/ai-contracts';
import {
  createQueueConnection,
  createWorkerHelper,
  QueueName,
} from '@sn-editor/queue';
import { runStubProvider, type AiToolId } from './providers/stubProvider';

interface AiJobData {
  type: string;
  jobId?: string;
  userId?: string;
  assetKey?: string;
  projectId?: string;
  [key: string]: unknown;
}

const IMAGE_SET = new Set<string>(ALL_IMAGE_AI_TOOLS);
const VIDEO_SET = new Set<string>(ALL_VIDEO_AI_TOOLS);

function isAiTool(type: string): type is AiToolId {
  return IMAGE_SET.has(type) || VIDEO_SET.has(type);
}

async function processAiJob(data: AiJobData): Promise<unknown> {
  const tool = data.type;
  if (!isAiTool(tool)) {
    throw new Error(`ai-worker received non-AI job type: ${tool}`);
  }

  // STUB: phase-1 — progress is only logged; wire to jobRepository.update later
  const result = await runStubProvider(tool as ImageAiToolId | VideoAiToolId, data, (progress) => {
    console.log(`[ai-worker] ${tool} progress=${progress}`);
  });

  console.log(`[ai-worker] ${tool} succeeded`, result.meta);
  return result;
}

async function main(): Promise<void> {
  const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
  const connection = createQueueConnection({ url: redisUrl });

  const sharedProcessor = async (job: { data: AiJobData }) => processAiJob(job.data);

  createWorkerHelper<AiJobData>({
    queueName: QueueName.AiImage,
    connection,
    processor: sharedProcessor,
    concurrency: Number(process.env.AI_WORKER_CONCURRENCY ?? 1),
  });

  createWorkerHelper<AiJobData>({
    queueName: QueueName.AiVideo,
    connection,
    processor: sharedProcessor,
    concurrency: Number(process.env.AI_WORKER_CONCURRENCY ?? 1),
  });

  console.log('[ai-worker] listening on ai-image + ai-video (STUB providers)');
}

main().catch((err) => {
  console.error('[ai-worker] fatal', err);
  process.exit(1);
});
