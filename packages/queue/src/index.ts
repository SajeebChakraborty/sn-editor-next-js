/**
 * @fileoverview `@sn-editor/queue` public API — BullMQ connection, queues, enqueue, workers, DLQ.
 * Workers and the web BFF MUST import queue names from here (no magic strings).
 */

export { createQueueConnection, type QueueConnectionOptions } from './connection';
export {
  QueueName,
  getQueue,
  resolveQueueForJobType,
  type QueueNameId,
} from './queues';
export { enqueueJob, type EnqueueJobInput } from './enqueue';
export { createWorkerHelper, type CreateWorkerHelperOptions } from './worker';
export {
  moveToDeadLetter,
  listDeadLetters,
  type DeadLetterPayload,
} from './dlq';
export { helloWorldHandler, type HelloWorldInput } from './handlers/helloWorld';
export {
  replayDeadLetter,
  replayDeadLetterByIndex,
} from './handlers/replayDeadLetter';
