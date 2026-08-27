/**
 * @fileoverview BullMQ / Redis connection factory for SN Editor workers and API.
 */

import IORedis, { type RedisOptions } from 'ioredis';

export interface QueueConnectionOptions {
  /** Redis URL, e.g. `redis://localhost:6379` or ElastiCache endpoint. */
  url: string;
  maxRetriesPerRequest?: number | null;
}

/**
 * Create a shared ioredis connection suitable for BullMQ.
 * BullMQ requires `maxRetriesPerRequest: null` on the shared connection.
 * @param options - Redis URL and retry overrides
 */
export function createQueueConnection(options: QueueConnectionOptions): IORedis {
  const redisOptions: RedisOptions = {
    maxRetriesPerRequest: options.maxRetriesPerRequest ?? null,
    // STUB: phase-1 — TLS + AUTH for ElastiCache when infra is wired
  };
  return new IORedis(options.url, redisOptions);
}
