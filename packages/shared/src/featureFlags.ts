/**
 * Feature flags — unfinished tools stay off until E2E ready.
 * Override via env `SN_EDITOR_FF_*` (Node) or remote config later.
 */
export type FeatureFlagKey =
  | 'aiImageTools'
  | 'aiVideoTools'
  | 'productCenter'
  | 'temporalWorkflows'
  | 'pixiGpuRenderer'
  | 'ffmpegWasm';

const defaults: Record<FeatureFlagKey, boolean> = {
  aiImageTools: true,
  aiVideoTools: true,
  productCenter: true,
  temporalWorkflows: false,
  pixiGpuRenderer: false,
  ffmpegWasm: false,
};

function readEnv(key: string): string | undefined {
  const g = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return g.process?.env?.[key];
}

/**
 * Resolve a feature flag. Env override: `SN_EDITOR_FF_AI_IMAGE_TOOLS=false`.
 */
export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  const envKey = `SN_EDITOR_FF_${flag.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
  const raw = readEnv(envKey);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return defaults[flag];
}

export const FEATURE_FLAGS = defaults;
