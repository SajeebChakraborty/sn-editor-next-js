/**
 * @fileoverview AI/export job contracts — single source of truth for tool IDs and payloads.
 * Workers and the web app MUST import enums from here (no magic strings).
 */

import { z } from 'zod';
import { PRODUCT_SCENES, PRODUCT_TYPES } from '@sn-editor/shared';

export * from './workflows';

/** Image AI tools — maps 1:1 to Product Center / Photoshop replacement toolkit. */
export const ImageAiTool = {
  RemoveBackground: 'image.remove_background',
  ReplaceBackground: 'image.replace_background',
  ExpandImage: 'image.expand',
  RemoveObject: 'image.remove_object',
  ReplaceObject: 'image.replace_object',
  Relight: 'image.relight',
  Shadow: 'image.shadow',
  Reflection: 'image.reflection',
  ProductScene: 'image.product_scene',
  StyleTransfer: 'image.style_transfer',
  Upscale: 'image.upscale',
  FaceRestore: 'image.face_restore',
  MagicEraser: 'image.magic_eraser',
  ColorCorrection: 'image.color_correction',
  SmartCrop: 'image.smart_crop',
  DetectProduct: 'image.detect_product',
} as const;

export type ImageAiToolId = (typeof ImageAiTool)[keyof typeof ImageAiTool];

/** Video AI tools — CapCut-for-ads automation. */
export const VideoAiTool = {
  MakeTikTokAd: 'video.make_tiktok_ad',
  AutoSubtitle: 'video.auto_subtitle',
  AutoCaption: 'video.auto_caption',
  AutoHighlight: 'video.auto_highlight',
  RemoveSilence: 'video.remove_silence',
  AiVoiceover: 'video.ai_voiceover',
  AiTranslation: 'video.ai_translation',
  AutoResize: 'video.auto_resize',
  BRollSuggest: 'video.broll_suggest',
  AiTransition: 'video.ai_transition',
  HookGenerator: 'video.hook_generator',
  CtaEnding: 'video.cta_ending',
  BackgroundMusic: 'video.background_music',
  ProductAnimation: 'video.product_animation',
} as const;

export type VideoAiToolId = (typeof VideoAiTool)[keyof typeof VideoAiTool];

export const ExportJobType = {
  ImageExport: 'export.image',
  VideoExport: 'export.video',
  HelloWorld: 'system.hello',
} as const;

export type ExportJobTypeId = (typeof ExportJobType)[keyof typeof ExportJobType];

export type JobTypeId = ImageAiToolId | VideoAiToolId | ExportJobTypeId;

export const JobStatus = z.enum(['queued', 'running', 'succeeded', 'failed', 'cancelled']);
export type JobStatus = z.infer<typeof JobStatus>;

export const ImageAiJobInputSchema = z.object({
  tool: z.string(),
  projectId: z.string(),
  layerId: z.string().optional(),
  assetKey: z.string(),
  prompt: z.string().optional(),
  maskKey: z.string().optional(),
  scene: z.enum(PRODUCT_SCENES).optional(),
  productType: z.enum(PRODUCT_TYPES).optional(),
  params: z.record(z.unknown()).optional(),
});

export type ImageAiJobInput = z.infer<typeof ImageAiJobInputSchema>;

export const VideoAiJobInputSchema = z.object({
  tool: z.string(),
  projectId: z.string(),
  assetKey: z.string().optional(),
  prompt: z.string().optional(),
  aspectRatio: z.enum(['9:16', '1:1', '16:9']).optional(),
  params: z.record(z.unknown()).optional(),
});

export type VideoAiJobInput = z.infer<typeof VideoAiJobInputSchema>;

export const JobResultSchema = z.object({
  outputKeys: z.array(z.string()).default([]),
  layerPatch: z.record(z.unknown()).optional(),
  documentPatch: z.record(z.unknown()).optional(),
  meta: z.record(z.unknown()).optional(),
});

export type JobResult = z.infer<typeof JobResultSchema>;

export const ALL_IMAGE_AI_TOOLS = Object.values(ImageAiTool);
export const ALL_VIDEO_AI_TOOLS = Object.values(VideoAiTool);

export const IMAGE_AI_TOOL_LABELS: Record<ImageAiToolId, string> = {
  [ImageAiTool.RemoveBackground]: 'Remove Background',
  [ImageAiTool.ReplaceBackground]: 'Replace Background',
  [ImageAiTool.ExpandImage]: 'Expand Image',
  [ImageAiTool.RemoveObject]: 'Remove Object',
  [ImageAiTool.ReplaceObject]: 'Replace Object',
  [ImageAiTool.Relight]: 'AI Relight',
  [ImageAiTool.Shadow]: 'AI Shadow',
  [ImageAiTool.Reflection]: 'AI Reflection',
  [ImageAiTool.ProductScene]: 'AI Product Scene',
  [ImageAiTool.StyleTransfer]: 'AI Style Transfer',
  [ImageAiTool.Upscale]: 'AI Upscale',
  [ImageAiTool.FaceRestore]: 'AI Face Restore',
  [ImageAiTool.MagicEraser]: 'AI Magic Eraser',
  [ImageAiTool.ColorCorrection]: 'AI Color Correction',
  [ImageAiTool.SmartCrop]: 'AI Smart Crop',
  [ImageAiTool.DetectProduct]: 'Detect Product',
};

export const VIDEO_AI_TOOL_LABELS: Record<VideoAiToolId, string> = {
  [VideoAiTool.MakeTikTokAd]: 'Make TikTok Ad',
  [VideoAiTool.AutoSubtitle]: 'Auto Subtitle',
  [VideoAiTool.AutoCaption]: 'Auto Caption',
  [VideoAiTool.AutoHighlight]: 'Auto Highlight',
  [VideoAiTool.RemoveSilence]: 'Remove Silence',
  [VideoAiTool.AiVoiceover]: 'AI Voiceover',
  [VideoAiTool.AiTranslation]: 'AI Translation',
  [VideoAiTool.AutoResize]: 'Auto Resize',
  [VideoAiTool.BRollSuggest]: 'AI B-roll Suggestion',
  [VideoAiTool.AiTransition]: 'AI Transition',
  [VideoAiTool.HookGenerator]: 'AI Hook Generator',
  [VideoAiTool.CtaEnding]: 'AI CTA Ending',
  [VideoAiTool.BackgroundMusic]: 'AI Background Music',
  [VideoAiTool.ProductAnimation]: 'AI Product Animation',
};
