/**
 * @fileoverview Named BullMQ queues — keep names in sync with ARCHITECTURE workers.
 */

import { Queue, type ConnectionOptions } from 'bullmq';
import type { JobTypeId } from '@sn-editor/ai-contracts';

/** Canonical queue names for SN Editor workers. */
export const QueueName = {
  AiImage: 'ai-image',
  AiVideo: 'ai-video',
  Image: 'image',
  Video: 'video',
  Export: 'export',
  /** Dead-letter queue for exhausted retries. */
  DeadLetter: 'dead-letter',
} as const;

export type QueueNameId = (typeof QueueName)[keyof typeof QueueName];

const queueCache = new Map<string, Queue>();

/**
 * Get (or lazily create) a named BullMQ queue.
 * @param name - One of {@link QueueName}
 * @param connection - Redis connection options / instance
 */
export function getQueue(name: QueueNameId, connection: ConnectionOptions): Queue {
  const cached = queueCache.get(name);
  if (cached) return cached;

  const queue = new Queue(name, { connection });
  queueCache.set(name, queue);
  return queue;
}

/**
 * Map a job type ID to the queue that should process it.
 * // STUB: phase-1 — refine routing when GPU vs CPU pools split further
 */
export function resolveQueueForJobType(type: JobTypeId): QueueNameId {
  if (type === 'export.image') return QueueName.Image;
  if (type === 'export.video') return QueueName.Video;
  if (type === 'system.hello') return QueueName.Export;
  if (type.startsWith('image.')) return QueueName.AiImage;
  if (type.startsWith('video.')) return QueueName.AiVideo;
  return QueueName.Export;
}
