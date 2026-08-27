/**
 * Premium feature keys. Empty plan.features (or `all`) unlocks every key.
 */

export const PREMIUM_FEATURES = [
  {
    id: 'image.brand',
    label: 'Brand kit',
    area: 'image' as const,
  },
  {
    id: 'image.filters',
    label: 'Image filters',
    area: 'image' as const,
  },
  {
    id: 'image.animate',
    label: 'Image animations',
    area: 'image' as const,
  },
  {
    id: 'image.exportPdf',
    label: 'PDF export',
    area: 'image' as const,
  },
  {
    id: 'image.exportHd',
    label: 'HD export (2x / 3x)',
    area: 'image' as const,
  },
  {
    id: 'video.animate',
    label: 'Video animate',
    area: 'video' as const,
  },
  {
    id: 'video.transitions',
    label: 'Video transitions',
    area: 'video' as const,
  },
  {
    id: 'video.filters',
    label: 'Video filters',
    area: 'video' as const,
  },
  {
    id: 'video.export',
    label: 'Video export',
    area: 'video' as const,
  },
] as const;

export type PremiumFeatureId = (typeof PREMIUM_FEATURES)[number]['id'];

export const ALL_PREMIUM_FEATURE_IDS: PremiumFeatureId[] = PREMIUM_FEATURES.map((f) => f.id);

export function isSubscribed(user: {
  role?: string;
  plan?: string;
  subscriptionStatus?: string;
}): boolean {
  if (user.role === 'admin') return true;
  return user.plan === 'premium' || user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';
}

export function resolveFeatureIds(
  user: { role?: string; plan?: string; subscriptionStatus?: string; currentPlanId?: string },
  plans: { id: string; features: string[] }[],
): string[] {
  if (user.role === 'admin') return ['*'];
  if (!isSubscribed(user)) return [];
  const plan = plans.find((p) => p.id === user.currentPlanId);
  if (!plan || plan.features.length === 0 || plan.features.includes('all') || plan.features.includes('*')) {
    return ['*'];
  }
  return plan.features;
}

export function hasFeature(features: string[], feature: string): boolean {
  return features.includes('*') || features.includes('all') || features.includes(feature);
}
