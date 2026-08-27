/**
 * @fileoverview Temporal-ready workflow stubs for multi-step AI video (Phase 5+).
 * Enable with SN_EDITOR_FF_TEMPORAL_WORKFLOWS=true when Temporal cluster is provisioned.
 */

export interface TikTokAdWorkflowInput {
  projectId: string;
  ownerId: string;
  productAssetKey: string;
  prompt: string;
}

export interface TikTokAdWorkflowResult {
  scenes: Array<{ id: string; title: string; durationMs: number }>;
  text: string[];
  music: string;
  transitions: string[];
  voice: string;
}

/**
 * Orchestration plan for "Make TikTok Ad".
 * When Temporal is enabled, each step becomes an activity; otherwise BullMQ fan-out.
 */
export const MAKE_TIKTOK_AD_STEPS = [
  'analyze_product',
  'generate_hook',
  'generate_scenes',
  'generate_copy',
  'suggest_music',
  'suggest_transitions',
  'generate_voiceover',
  'compose_timeline',
] as const;

export type MakeTikTokAdStep = (typeof MAKE_TIKTOK_AD_STEPS)[number];

/** Local stub that mimics workflow output without Temporal. */
export async function runMakeTikTokAdLocal(
  input: TikTokAdWorkflowInput,
): Promise<TikTokAdWorkflowResult> {
  void input;
  return {
    scenes: [
      { id: 'scene1', title: 'Hook', durationMs: 3000 },
      { id: 'scene2', title: 'Product', durationMs: 5000 },
      { id: 'scene3', title: 'CTA', durationMs: 3000 },
    ],
    text: ['Wait for it…', 'Meet the product', 'Shop now'],
    music: 'ai-bgm-stub',
    transitions: ['fade', 'zoom'],
    voice: 'ai-voice-stub',
  };
}
