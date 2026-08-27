/** Template marketing channels — 100% of required catalog. */
export const TEMPLATE_CHANNELS = [
  'instagram_post',
  'instagram_story',
  'facebook_post',
  'facebook_ads',
  'youtube_thumbnail',
  'linkedin_post',
  'tiktok',
  'amazon',
  'daraz',
  'shopify',
  'banner',
  'poster',
  'flyer',
] as const;

export type TemplateChannel = (typeof TEMPLATE_CHANNELS)[number];

export const TEMPLATE_CHANNEL_LABELS: Record<TemplateChannel, string> = {
  instagram_post: 'Instagram Post',
  instagram_story: 'Instagram Story',
  facebook_post: 'Facebook Post',
  facebook_ads: 'Facebook Ads',
  youtube_thumbnail: 'YouTube Thumbnail',
  linkedin_post: 'LinkedIn Post',
  tiktok: 'TikTok',
  amazon: 'Amazon',
  daraz: 'Daraz',
  shopify: 'Shopify',
  banner: 'Banner',
  poster: 'Poster',
  flyer: 'Flyer',
};

/** Default artboard sizes per channel (width × height). */
export const TEMPLATE_SIZES: Record<TemplateChannel, { width: number; height: number }> = {
  instagram_post: { width: 1080, height: 1080 },
  instagram_story: { width: 1080, height: 1920 },
  facebook_post: { width: 1200, height: 630 },
  facebook_ads: { width: 1200, height: 628 },
  youtube_thumbnail: { width: 1280, height: 720 },
  linkedin_post: { width: 1200, height: 627 },
  tiktok: { width: 1080, height: 1920 },
  amazon: { width: 1600, height: 1600 },
  daraz: { width: 1600, height: 1600 },
  shopify: { width: 2048, height: 2048 },
  banner: { width: 1920, height: 600 },
  poster: { width: 1080, height: 1350 },
  flyer: { width: 1240, height: 1754 },
};
