/**
 * Canva-style Create catalog: categories, size presets, and quick actions.
 */
import {
  addLayer,
  createArtboard,
  createEmptyDocument,
  createLayer,
  type DesignDocument,
  type LayerNode,
} from '@sn-editor/editor-core';
import { TEMPLATE_CHANNEL_LABELS, TEMPLATE_SIZES, type TemplateChannel } from '@sn-editor/shared';
import { SEED_TEMPLATES, type SeedTemplate } from '@/lib/templates';

export type CreateCategoryId =
  | 'for-you'
  | 'ratios'
  | 'shapes'
  | 'presentations'
  | 'social'
  | 'photo'
  | 'videos'
  | 'docs'
  | 'whiteboards'
  | 'sheets'
  | 'code'
  | 'websites'
  | 'emails'
  | 'custom';

export type VideoAspect = '9:16' | '1:1' | '16:9';

export type CreatePreset = {
  id: string;
  label: string;
  detail: string;
  width: number;
  height: number;
  categories: CreateCategoryId[];
  kind: 'design' | 'video';
  videoAspect?: VideoAspect;
  templateId?: string;
  previewBg: string;
  previewAccent: string;
};

export type QuickActionId =
  | 'upload-layers'
  | 'video-record'
  | 'code'
  | 'magic-write'
  | 'video-rembg';

export type QuickAction = {
  id: QuickActionId;
  label: string;
  badge?: 'New' | 'Pro';
  tint: string;
  icon: 'layers' | 'record' | 'code' | 'write' | 'cut';
};

export const CREATE_VIDEO_ASPECT_KEY = 'pixizen:createVideoAspect';

export type CreateRatio = {
  id: string;
  label: string;
  ratio: string;
  width: number;
  height: number;
  tint: string;
};

export type CreateShapeVariation = {
  id: string;
  label: string;
  shape: NonNullable<LayerNode['shape']>;
  fill: string;
  cornerRadius?: number;
  outline?: boolean;
};

export type CreateArt =
  | 'presentation'
  | 'ig-post'
  | 'flyer'
  | 'doc'
  | 'video'
  | 'yt'
  | 'logo'
  | 'story'
  | 'fb'
  | 'cover'
  | 'linkedin'
  | 'tiktok'
  | 'x';

export const CREATE_CATEGORIES: {
  id: CreateCategoryId;
  label: string;
  tint: string;
  badge?: 'New';
}[] = [
  { id: 'for-you', label: 'For you', tint: '#8b3dff' },
  { id: 'ratios', label: 'Ratios', tint: '#2563eb' },
  { id: 'shapes', label: 'Shapes', tint: '#db2777' },
  { id: 'presentations', label: 'Presentations', tint: '#ea580c' },
  { id: 'social', label: 'Social media', tint: '#e11d48' },
];

export type CreateShowcaseCard = {
  presetId: string;
  label: string;
  art: CreateArt;
};

export const FOR_YOU_CARDS: CreateShowcaseCard[] = [
  { presetId: 'presentation', label: 'Presentation', art: 'presentation' },
  { presetId: 'ig-4-5', label: 'Instagram Post (4:5)', art: 'ig-post' },
  { presetId: 'flyer-a4', label: 'Flyer (Portrait A4)', art: 'flyer' },
  { presetId: 'doc-a4', label: 'Document (A4 Portrait)', art: 'doc' },
  { presetId: 'landscape-video', label: 'Landscape Video', art: 'video' },
  { presetId: 'yt-thumb', label: 'YouTube Thumbnail', art: 'yt' },
  { presetId: 'doc-digital', label: 'Doc (Digital)', art: 'doc' },
  { presetId: 'logo', label: 'Logo', art: 'logo' },
];

export const SOCIAL_CARDS: CreateShowcaseCard[] = [
  { presetId: 'ig-4-5', label: 'Instagram Post (4:5)', art: 'ig-post' },
  { presetId: 'ig-story', label: 'Instagram Story', art: 'story' },
  { presetId: 'fb-post', label: 'Facebook Post (Landscape)', art: 'fb' },
  { presetId: 'fb-cover', label: 'Facebook Cover (Landscape)', art: 'cover' },
  { presetId: 'linkedin', label: 'LinkedIn Post', art: 'linkedin' },
  { presetId: 'linkedin-video', label: 'LinkedIn Video', art: 'video' },
  { presetId: 'tiktok', label: 'TikTok Video', art: 'tiktok' },
  { presetId: 'twitter-x', label: 'Twitter / X Post', art: 'x' },
];

export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'upload-layers', label: 'Image to Layers', badge: 'New', tint: '#7c3aed', icon: 'layers' },
  { id: 'video-record', label: 'Screen recorder', tint: '#f97316', icon: 'record' },
  { id: 'code', label: 'SN Editor Code', badge: 'New', tint: '#22c55e', icon: 'code' },
  { id: 'magic-write', label: 'Magic Write', tint: '#14b8a6', icon: 'write' },
  { id: 'video-rembg', label: 'Remove video BG', badge: 'Pro', tint: '#eab308', icon: 'cut' },
];

const SHAPE_COLORS = ['#7c3aed', '#db2777', '#ea580c', '#0891b2', '#16a34a', '#2563eb', '#0f172a', '#eab308'];

export const CREATE_RATIOS: CreateRatio[] = [
  { id: 'r-1-1', label: 'Square', ratio: '1:1', width: 1080, height: 1080, tint: '#7c3aed' },
  { id: 'r-4-5', label: 'Portrait', ratio: '4:5', width: 1080, height: 1350, tint: '#db2777' },
  { id: 'r-5-4', label: 'Landscape', ratio: '5:4', width: 1350, height: 1080, tint: '#ea580c' },
  { id: 'r-9-16', label: 'Story', ratio: '9:16', width: 1080, height: 1920, tint: '#e11d48' },
  { id: 'r-16-9', label: 'Widescreen', ratio: '16:9', width: 1920, height: 1080, tint: '#2563eb' },
  { id: 'r-4-3', label: 'Classic', ratio: '4:3', width: 1440, height: 1080, tint: '#0891b2' },
  { id: 'r-3-4', label: 'Tall', ratio: '3:4', width: 1080, height: 1440, tint: '#7c3aed' },
  { id: 'r-3-2', label: 'Photo', ratio: '3:2', width: 1620, height: 1080, tint: '#16a34a' },
  { id: 'r-2-3', label: 'Print', ratio: '2:3', width: 1080, height: 1620, tint: '#0d9488' },
  { id: 'r-2-1', label: 'Wide', ratio: '2:1', width: 1920, height: 960, tint: '#0284c7' },
  { id: 'r-1-2', label: 'Tall strip', ratio: '1:2', width: 1080, height: 2160, tint: '#db2777' },
  { id: 'r-21-9', label: 'Ultrawide', ratio: '21:9', width: 2520, height: 1080, tint: '#4f46e5' },
  { id: 'r-a4', label: 'A4', ratio: 'A4', width: 794, height: 1123, tint: '#0f172a' },
  { id: 'r-a4-ls', label: 'A4 landscape', ratio: 'A4', width: 1123, height: 794, tint: '#334155' },
  { id: 'r-letter', label: 'US Letter', ratio: 'Letter', width: 816, height: 1056, tint: '#475569' },
  { id: 'r-pin', label: 'Pinterest', ratio: '2:3', width: 1000, height: 1500, tint: '#e11d48' },
  { id: 'r-banner', label: 'Banner', ratio: '16:5', width: 1920, height: 600, tint: '#7c3aed' },
  { id: 'r-cover', label: 'Cover', ratio: '1.91:1', width: 1640, height: 859, tint: '#2563eb' },
  { id: 'r-linkedin', label: 'LinkedIn', ratio: '4:1', width: 1584, height: 396, tint: '#0284c7' },
  { id: 'r-card', label: 'Business card', ratio: '7:4', width: 1050, height: 600, tint: '#0f172a' },
  { id: 'r-icon', label: 'App icon', ratio: '1:1', width: 1024, height: 1024, tint: '#ea580c' },
  { id: 'r-yt', label: 'YouTube', ratio: '16:9', width: 1280, height: 720, tint: '#dc2626' },
];

const SHAPE_KINDS: Array<{
  shape: NonNullable<LayerNode['shape']>;
  label: string;
  cornerRadius?: number;
  outline?: boolean;
}> = [
  { shape: 'rect', label: 'Square' },
  { shape: 'rect', label: 'Rounded', cornerRadius: 28 },
  { shape: 'rect', label: 'Soft card', cornerRadius: 48 },
  { shape: 'ellipse', label: 'Circle' },
  { shape: 'ellipse', label: 'Oval' },
  { shape: 'triangle', label: 'Triangle' },
  { shape: 'star', label: 'Star' },
  { shape: 'polygon', label: 'Hexagon' },
  { shape: 'arrow', label: 'Arrow' },
  { shape: 'line', label: 'Line' },
  { shape: 'rect', label: 'Outline', outline: true, cornerRadius: 16 },
  { shape: 'ellipse', label: 'Ring', outline: true },
  { shape: 'star', label: 'Star outline', outline: true },
  { shape: 'triangle', label: 'Triangle outline', outline: true },
];

export const CREATE_SHAPES: CreateShapeVariation[] = SHAPE_KINDS.flatMap((kind, ki) =>
  SHAPE_COLORS.map((fill, ci) => ({
    id: `sh-${kind.shape}-${kind.label}-${ci}`,
    label: ki % 2 === 0 ? kind.label : `${kind.label}`,
    shape: kind.shape,
    fill,
    cornerRadius: kind.cornerRadius,
    outline: kind.outline,
  })),
);

function preset(
  partial: Omit<CreatePreset, 'detail'> & { detail?: string },
): CreatePreset {
  return {
    ...partial,
    detail: partial.detail ?? `${partial.width} × ${partial.height} px`,
  };
}

export const CREATE_PRESETS: CreatePreset[] = [
  preset({
    id: 'presentation',
    label: 'Presentation',
    width: 1920,
    height: 1080,
    categories: ['for-you', 'presentations'],
    kind: 'design',
    previewBg: '#fff7ed',
    previewAccent: '#ea580c',
  }),
  preset({
    id: 'landscape-video',
    label: 'Landscape Video',
    width: 1920,
    height: 1080,
    categories: ['for-you', 'videos'],
    kind: 'video',
    videoAspect: '16:9',
    previewBg: '#18181b',
    previewAccent: '#a78bfa',
  }),
  preset({
    id: 'doc-digital',
    label: 'Doc (Digital)',
    width: 816,
    height: 1056,
    categories: ['for-you', 'docs'],
    kind: 'design',
    previewBg: '#ffffff',
    previewAccent: '#7c3aed',
  }),
  preset({
    id: 'logo',
    label: 'Logo',
    width: 1024,
    height: 1024,
    categories: ['for-you'],
    kind: 'design',
    previewBg: '#eff6ff',
    previewAccent: '#2563eb',
  }),
  preset({
    id: 'fb-cover',
    label: 'Facebook Cover (Landscape)',
    width: 1640,
    height: 859,
    categories: ['social'],
    kind: 'design',
    previewBg: '#eff6ff',
    previewAccent: '#1877f2',
  }),
  preset({
    id: 'linkedin-video',
    label: 'LinkedIn Video',
    width: 1920,
    height: 1080,
    categories: ['social', 'videos'],
    kind: 'video',
    videoAspect: '16:9',
    previewBg: '#0a66c2',
    previewAccent: '#ffffff',
  }),
  preset({
    id: 'twitter-x',
    label: 'Twitter / X Post',
    width: 1600,
    height: 900,
    categories: ['social'],
    kind: 'design',
    previewBg: '#0f172a',
    previewAccent: '#ffffff',
  }),
  preset({
    id: 'ig-4-5',
    label: 'Instagram Post (4:5)',
    width: 1080,
    height: 1350,
    categories: ['for-you', 'social', 'photo'],
    kind: 'design',
    previewBg: '#fdf2f8',
    previewAccent: '#db2777',
  }),
  preset({
    id: 'flyer-a4',
    label: 'Flyer (Portrait A4)',
    width: TEMPLATE_SIZES.flyer.width,
    height: TEMPLATE_SIZES.flyer.height,
    categories: ['for-you', 'docs'],
    kind: 'design',
    templateId: 'tpl_flyer_01',
    previewBg: '#faf5ff',
    previewAccent: '#7c3aed',
  }),
  preset({
    id: 'doc-a4',
    label: 'Document (A4 Portrait)',
    width: 794,
    height: 1123,
    categories: ['for-you', 'docs'],
    kind: 'design',
    previewBg: '#ffffff',
    previewAccent: '#7c3aed',
  }),
  preset({
    id: 'ig-post',
    label: TEMPLATE_CHANNEL_LABELS.instagram_post,
    width: TEMPLATE_SIZES.instagram_post.width,
    height: TEMPLATE_SIZES.instagram_post.height,
    categories: ['social', 'photo'],
    kind: 'design',
    templateId: 'tpl_instagram_post_01',
    previewBg: '#fdf2f8',
    previewAccent: '#e11d48',
  }),
  preset({
    id: 'ig-story',
    label: TEMPLATE_CHANNEL_LABELS.instagram_story,
    width: TEMPLATE_SIZES.instagram_story.width,
    height: TEMPLATE_SIZES.instagram_story.height,
    categories: ['social', 'photo'],
    kind: 'design',
    templateId: 'tpl_instagram_story_01',
    previewBg: '#1a0a14',
    previewAccent: '#f472b6',
  }),
  preset({
    id: 'fb-post',
    label: TEMPLATE_CHANNEL_LABELS.facebook_post,
    width: TEMPLATE_SIZES.facebook_post.width,
    height: TEMPLATE_SIZES.facebook_post.height,
    categories: ['social'],
    kind: 'design',
    templateId: 'tpl_facebook_post_01',
    previewBg: '#eff6ff',
    previewAccent: '#2563eb',
  }),
  preset({
    id: 'linkedin',
    label: TEMPLATE_CHANNEL_LABELS.linkedin_post,
    width: TEMPLATE_SIZES.linkedin_post.width,
    height: TEMPLATE_SIZES.linkedin_post.height,
    categories: ['social'],
    kind: 'design',
    templateId: 'tpl_linkedin_post_01',
    previewBg: '#eff6ff',
    previewAccent: '#0284c7',
  }),
  preset({
    id: 'yt-thumb',
    label: TEMPLATE_CHANNEL_LABELS.youtube_thumbnail,
    width: TEMPLATE_SIZES.youtube_thumbnail.width,
    height: TEMPLATE_SIZES.youtube_thumbnail.height,
    categories: ['social', 'presentations'],
    kind: 'design',
    templateId: 'tpl_youtube_thumbnail_01',
    previewBg: '#18181b',
    previewAccent: '#e11d48',
  }),
  preset({
    id: 'tiktok',
    label: TEMPLATE_CHANNEL_LABELS.tiktok,
    width: TEMPLATE_SIZES.tiktok.width,
    height: TEMPLATE_SIZES.tiktok.height,
    categories: ['social', 'videos'],
    kind: 'video',
    videoAspect: '9:16',
    previewBg: '#0f172a',
    previewAccent: '#22d3ee',
  }),
  preset({
    id: 'poster',
    label: TEMPLATE_CHANNEL_LABELS.poster,
    width: TEMPLATE_SIZES.poster.width,
    height: TEMPLATE_SIZES.poster.height,
    categories: ['photo', 'docs'],
    kind: 'design',
    templateId: 'tpl_poster_01',
    previewBg: '#fff1f2',
    previewAccent: '#e11d48',
  }),
  preset({
    id: 'photo-square',
    label: 'Photo · Square',
    width: 1080,
    height: 1080,
    categories: ['photo'],
    kind: 'design',
    previewBg: '#f4f4f5',
    previewAccent: '#db2777',
  }),
  preset({
    id: 'photo-landscape',
    label: 'Photo · Landscape',
    width: 1920,
    height: 1280,
    categories: ['photo'],
    kind: 'design',
    previewBg: '#f4f4f5',
    previewAccent: '#db2777',
  }),
  preset({
    id: 'slides-43',
    label: 'Presentation (4:3)',
    width: 1024,
    height: 768,
    categories: ['presentations'],
    kind: 'design',
    previewBg: '#fff7ed',
    previewAccent: '#f97316',
  }),
  preset({
    id: 'widescreen',
    label: 'Widescreen (16:9)',
    width: 1920,
    height: 1080,
    categories: ['presentations', 'websites'],
    kind: 'design',
    previewBg: '#0f172a',
    previewAccent: '#38bdf8',
  }),
  preset({
    id: 'video-169',
    label: 'YouTube video (16:9)',
    width: 1920,
    height: 1080,
    categories: ['videos', 'for-you'],
    kind: 'video',
    videoAspect: '16:9',
    previewBg: '#18181b',
    previewAccent: '#a78bfa',
  }),
  preset({
    id: 'video-916',
    label: 'Reel / Short (9:16)',
    width: 1080,
    height: 1920,
    categories: ['videos', 'social'],
    kind: 'video',
    videoAspect: '9:16',
    previewBg: '#18181b',
    previewAccent: '#f472b6',
  }),
  preset({
    id: 'video-11',
    label: 'Square video (1:1)',
    width: 1080,
    height: 1080,
    categories: ['videos'],
    kind: 'video',
    videoAspect: '1:1',
    previewBg: '#18181b',
    previewAccent: '#34d399',
  }),
  preset({
    id: 'letter',
    label: 'US Letter',
    width: 816,
    height: 1056,
    categories: ['docs'],
    kind: 'design',
    previewBg: '#ffffff',
    previewAccent: '#0d9488',
  }),
  preset({
    id: 'whiteboard',
    label: 'Whiteboard',
    width: 1920,
    height: 1080,
    categories: ['whiteboards'],
    kind: 'design',
    previewBg: '#f0fdf4',
    previewAccent: '#16a34a',
  }),
  preset({
    id: 'whiteboard-xl',
    label: 'Brainstorm board',
    width: 2560,
    height: 1440,
    categories: ['whiteboards'],
    kind: 'design',
    previewBg: '#ecfdf5',
    previewAccent: '#059669',
  }),
  preset({
    id: 'sheet',
    label: 'Sheet',
    width: 1920,
    height: 1080,
    categories: ['sheets'],
    kind: 'design',
    previewBg: '#eff6ff',
    previewAccent: '#2563eb',
  }),
  preset({
    id: 'code',
    label: 'SN Editor Code',
    width: 1920,
    height: 1080,
    categories: ['code', 'for-you'],
    kind: 'design',
    previewBg: '#0f172a',
    previewAccent: '#22c55e',
  }),
  preset({
    id: 'website',
    label: 'Website (1440)',
    width: 1440,
    height: 900,
    categories: ['websites'],
    kind: 'design',
    previewBg: '#f0f9ff',
    previewAccent: '#0284c7',
  }),
  preset({
    id: 'email',
    label: 'Email',
    width: 600,
    height: 800,
    categories: ['emails'],
    kind: 'design',
    previewBg: '#faf5ff',
    previewAccent: '#7c3aed',
  }),
  preset({
    id: 'email-wide',
    label: 'Email newsletter',
    width: 640,
    height: 1000,
    categories: ['emails'],
    kind: 'design',
    previewBg: '#faf5ff',
    previewAccent: '#a78bfa',
  }),
  preset({
    id: 'banner',
    label: TEMPLATE_CHANNEL_LABELS.banner,
    width: TEMPLATE_SIZES.banner.width,
    height: TEMPLATE_SIZES.banner.height,
    categories: ['websites', 'presentations'],
    kind: 'design',
    templateId: 'tpl_banner_01',
    previewBg: '#0f172a',
    previewAccent: '#38bdf8',
  }),
];

export function getPresetById(id: string): CreatePreset | undefined {
  return CREATE_PRESETS.find((p) => p.id === id);
}

export function presetsForCategory(id: CreateCategoryId): CreatePreset[] {
  if (id === 'custom' || id === 'ratios' || id === 'shapes') return [];
  if (id === 'for-you') {
    return CREATE_PRESETS.filter((p) => p.categories.includes('for-you'));
  }
  return CREATE_PRESETS.filter((p) => p.categories.includes(id));
}

export function searchPresets(query: string): CreatePreset[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return CREATE_PRESETS.filter(
    (p) =>
      p.label.toLowerCase().includes(q) ||
      p.detail.toLowerCase().includes(q) ||
      p.categories.some((c) => c.includes(q)),
  );
}

export function searchRatios(query: string): CreateRatio[] {
  const q = query.trim().toLowerCase();
  if (!q) return CREATE_RATIOS;
  return CREATE_RATIOS.filter(
    (r) => r.label.toLowerCase().includes(q) || r.ratio.toLowerCase().includes(q),
  );
}

export function searchShapes(query: string): CreateShapeVariation[] {
  const q = query.trim().toLowerCase();
  if (!q) return CREATE_SHAPES;
  return CREATE_SHAPES.filter(
    (s) => s.label.toLowerCase().includes(q) || s.shape.toLowerCase().includes(q),
  );
}

export function templatesForCategory(id: CreateCategoryId): SeedTemplate[] {
  const channels: TemplateChannel[] =
    id === 'social'
      ? ['instagram_post', 'instagram_story', 'facebook_post', 'linkedin_post', 'youtube_thumbnail']
      : id === 'docs'
        ? ['flyer', 'poster']
        : id === 'photo'
          ? ['poster', 'instagram_post']
          : id === 'presentations'
            ? ['banner', 'youtube_thumbnail']
            : id === 'for-you'
              ? ['instagram_post', 'flyer', 'poster', 'youtube_thumbnail']
              : [];
  return SEED_TEMPLATES.filter((t) => channels.includes(t.channel)).slice(0, 8);
}

export function createSizedDocument(name: string, width: number, height: number): DesignDocument {
  const doc = createEmptyDocument(name);
  const artboard = createArtboard('Artboard 1', width, height, 80, 80);
  return {
    ...doc,
    artboards: [artboard],
    meta: { ...doc.meta, name },
  };
}

export function createDesignWithShape(
  variation: CreateShapeVariation,
  canvas = 1080,
): DesignDocument {
  let doc = createSizedDocument(variation.label, canvas, canvas);
  const ab = doc.artboards[0]!;
  const isLine = variation.shape === 'line' || variation.shape === 'arrow';
  const isOval = variation.label === 'Oval';
  const size = Math.round(canvas * 0.46);
  const width = isOval ? Math.round(size * 1.35) : isLine ? Math.round(canvas * 0.58) : size;
  const height = isLine ? 10 : isOval ? Math.round(size * 0.72) : size;
  const layer = createLayer({
    type: 'shape',
    name: variation.label,
    shape: variation.shape,
    fill: variation.outline || variation.shape === 'line' ? undefined : variation.fill,
    stroke: variation.outline || isLine ? variation.fill : undefined,
    strokeWidth: variation.outline || isLine ? 8 : 0,
    cornerRadius: variation.cornerRadius,
    transform: {
      x: Math.round((canvas - width) / 2),
      y: Math.round((canvas - height) / 2),
      width,
      height,
      rotation: variation.shape === 'line' ? -18 : 0,
      scaleX: 1,
      scaleY: 1,
    },
  });
  layer.artboardId = ab.id;
  return addLayer(doc, layer);
}
