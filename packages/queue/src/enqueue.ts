/**
 * @fileoverview Job enqueue helpers with idempotency and typed payloads.
 */

import type { ConnectionOptions, JobsOptions } from 'bullmq';
import type { JobTypeId } from '@sn-editor/ai-contracts';
import { getQueue, resolveQueueForJobType, type QueueNameId } from './queues';

export interface EnqueueJobInput {
  /** Logical job type from `@sn-editor/ai-contracts`. */
  type: JobTypeId;
  /** Durable Mongo job id — used as BullMQ jobId when possible. */
  jobId: string;
  /** Payload passed to the worker (validated upstream with Zod). */
  data: Record<string, unknown>;
  /** Override queue name; defaults via {@link resolveQueueForJobType}. */
  queueName?: QueueNameId;
  opts?: JobsOptions;
}

/**
 * Enqueue a job onto the appropriate BullMQ queue.
 * @returns The BullMQ job id
 */
export async function enqueueJob(
  connection: ConnectionOptions,
  input: EnqueueJobInput,
): Promise<string> {
  const queueName = input.queueName ?? resolveQueueForJobType(input.type);
  const queue = getQueue(queueName, connection);

  const job = await queue.add(
    input.type,
    { type: input.type, ...input.data },
    {
      jobId: input.jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: false,
      ...input.opts,
    },
  );

  return String(job.id);
}
