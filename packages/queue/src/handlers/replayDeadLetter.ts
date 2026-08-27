/**
 * @fileoverview Replay a dead-letter job back onto its original queue.
 */

import type { ConnectionOptions } from 'bullmq';
import { getQueue, type QueueNameId } from '../queues';
import { listDeadLetters, type DeadLetterPayload } from '../dlq';

/**
 * Replay a DLQ payload onto the original queue.
 * // STUB: phase-1 — wire to ops CLI / admin API; currently requires caller-supplied payload
 *
 * @param connection - Redis connection
 * @param payload - Dead-letter entry to re-enqueue
 * @returns New BullMQ job id on the original queue
 */
export async function replayDeadLetter(
  connection: ConnectionOptions,
  payload: DeadLetterPayload,
): Promise<string> {
  const queueName = payload.originalQueue as QueueNameId;
  const queue = getQueue(queueName, connection);

  const job = await queue.add(payload.name, payload.data as Record<string, unknown>, {
    // STUB: do not reuse exhausted jobId to avoid collisions
    attempts: 1,
  });

  return String(job.id);
}

/**
 * Convenience: replay the Nth waiting DLQ entry (0-based).
 * // STUB: phase-1 — prefer explicit job id lookup
 */
export async function replayDeadLetterByIndex(
  connection: ConnectionOptions,
  index = 0,
): Promise<string | null> {
  const entries = await listDeadLetters(connection, index, index);
  const entry = entries[0];
  if (!entry) return null;
  return replayDeadLetter(connection, entry);
}
