/**
 * Re-export feature flags from shared so the web app has a single import path.
 */
export {
  FEATURE_FLAGS,
  isFeatureEnabled,
  type FeatureFlagKey,
} from '@sn-editor/shared';
