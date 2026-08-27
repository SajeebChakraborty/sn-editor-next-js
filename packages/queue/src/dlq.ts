/**
 * @fileoverview Dead-letter queue (DLQ) helpers for exhausted BullMQ jobs.
 */

import type { ConnectionOptions, Job } from 'bullmq';
import { getQueue, QueueName } from './queues';

export interface DeadLetterPayload {
  originalQueue: string;
  originalJobId?: string;
  name: string;
  data: unknown;
  failedReason?: string;
  attemptsMade?: number;
  movedAt: string;
}

/**
 * Move a failed job's payload onto the dead-letter queue for inspection/replay.
 */
export async function moveToDeadLetter(
  connection: ConnectionOptions,
  job: Job,
  originalQueue: string,
): Promise<string> {
  const dlq = getQueue(QueueName.DeadLetter, connection);
  const payload: DeadLetterPayload = {
    originalQueue,
    originalJobId: job.id,
    name: job.name,
    data: job.data,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    movedAt: new Date().toISOString(),
  };

  const dlqJob = await dlq.add('dead-letter', payload, {
    removeOnComplete: false,
    removeOnFail: false,
  });

  return String(dlqJob.id);
}

/**
 * List recent DLQ entries (inspection / runbook tooling).
 * // STUB: phase-1 — pagination + filters in ops CLI
 */
export async function listDeadLetters(
  connection: ConnectionOptions,
  start = 0,
  end = 49,
): Promise<DeadLetterPayload[]> {
  const dlq = getQueue(QueueName.DeadLetter, connection);
  const jobs = await dlq.getJobs(['waiting', 'delayed', 'completed', 'failed'], start, end);
  return jobs.map((j) => j.data as DeadLetterPayload);
}
