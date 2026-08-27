/**
 * @fileoverview BullMQ worker bootstrap helper used by all ECS workers.
 */

import {
  Worker,
  type ConnectionOptions,
  type Processor,
  type WorkerOptions,
} from 'bullmq';
import type { QueueNameId } from './queues';

export interface CreateWorkerHelperOptions<T = unknown> {
  queueName: QueueNameId;
  connection: ConnectionOptions;
  processor: Processor<T>;
  concurrency?: number;
  workerOptions?: Omit<WorkerOptions, 'connection' | 'concurrency'>;
}

/**
 * Create a BullMQ worker with SN Editor defaults (concurrency, failure logging).
 * @returns The started Worker instance (caller owns lifecycle)
 */
export function createWorkerHelper<T = unknown>(
  options: CreateWorkerHelperOptions<T>,
): Worker<T> {
  const worker = new Worker<T>(options.queueName, options.processor, {
    connection: options.connection,
    concurrency: options.concurrency ?? 1,
    ...options.workerOptions,
  });

  worker.on('failed', (job, err) => {
    // STUB: phase-1 — ship structured logs + metrics; move exhausted jobs to DLQ via moveToDeadLetter
    console.error(`[queue:${options.queueName}] job ${job?.id} failed`, err);
  });

  return worker;
}
