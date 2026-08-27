/**
 * @fileoverview Hello-world job handler — smoke test for queue + worker wiring.
 */

import { ExportJobType, type JobResult } from '@sn-editor/ai-contracts';

export interface HelloWorldInput {
  message?: string;
}

/**
 * Process a `system.hello` job; returns a mock JobResult.
 * Used by export-worker and local integration smoke tests.
 */
export async function helloWorldHandler(input: HelloWorldInput = {}): Promise<JobResult> {
  const message = input.message ?? 'hello from sn-editor queue';
  // STUB: phase-1 — replace with real health ping that touches Redis + S3
  return {
    outputKeys: [],
    meta: {
      tool: ExportJobType.HelloWorld,
      message,
      at: new Date().toISOString(),
    },
  };
}
