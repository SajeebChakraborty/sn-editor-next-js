/**
 * @fileoverview STUB AI provider — simulates progress and returns mock JobResults.
 * Real GPU providers (OpenAI, FLUX, SAM, etc.) replace this in later phases.
 */

import {
  ALL_IMAGE_AI_TOOLS,
  ALL_VIDEO_AI_TOOLS,
  type ImageAiToolId,
  type JobResult,
  type VideoAiToolId,
} from '@sn-editor/ai-contracts';

export type AiToolId = ImageAiToolId | VideoAiToolId;

export type ProgressCallback = (progress: number) => void | Promise<void>;

const ALL_AI_TOOLS: readonly AiToolId[] = [...ALL_IMAGE_AI_TOOLS, ...ALL_VIDEO_AI_TOOLS];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Simulate timed progress ticks for a stub provider run.
 */
async function simulateProgress(onProgress?: ProgressCallback): Promise<void> {
  for (const step of [10, 35, 60, 85, 100]) {
    await sleep(25);
    await onProgress?.(step);
  }
}

/**
 * Run a stub AI tool by id; writes mock output keys matching the S3 layout.
 * // STUB: phase-1 — all providers are simulated; no real model inference
 *
 * @param tool - ImageAiTool or VideoAiTool id
 * @param input - Job payload (assetKey, projectId, …)
 * @param onProgress - Optional progress reporter (0–100)
 */
export async function runStubProvider(
  tool: AiToolId,
  input: Record<string, unknown>,
  onProgress?: ProgressCallback,
): Promise<JobResult> {
  if (!ALL_AI_TOOLS.includes(tool)) {
    throw new Error(`Unknown AI tool: ${tool}`);
  }

  await simulateProgress(onProgress);

  const jobId = typeof input.jobId === 'string' ? input.jobId : 'stub-job';
  const userId = typeof input.userId === 'string' ? input.userId : 'stub-user';
  const outputKey = `users/${userId}/jobs/${jobId}/output/${tool.replace(/\./g, '_')}.stub.bin`;

  return {
    outputKeys: [outputKey],
    layerPatch: {
      // STUB: UI may apply a placeholder asset until real inference lands
      stubResult: true,
      tool,
    },
    meta: {
      provider: 'stub',
      tool,
      simulated: true,
      inputAssetKey: input.assetKey,
    },
  };
}

type StubRunner = (
  input: Record<string, unknown>,
  onProgress?: ProgressCallback,
) => Promise<JobResult>;

/** Registry of every image + video AI tool → stub runner (for worker dispatch). */
export const STUB_PROVIDERS: Record<AiToolId, StubRunner> = Object.fromEntries(
  ALL_AI_TOOLS.map((tool) => [
    tool,
    (input: Record<string, unknown>, onProgress?: ProgressCallback) =>
      runStubProvider(tool, input, onProgress),
  ]),
) as Record<AiToolId, StubRunner>;
