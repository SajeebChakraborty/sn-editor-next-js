# Data Model

MongoDB Atlas collections used by SN Editor.

## users

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `email` | string | unique |
| `name` | string | |
| `image` | string? | avatar URL |
| `createdAt` | Date | |
| `updatedAt` | Date | |

## projects

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `ownerId` | ObjectId | ref users |
| `type` | `'image' \| 'video'` | |
| `name` | string | |
| `document` | object | DesignDocument or VideoProject JSON |
| `brandKitId` | ObjectId? | |
| `templateId` | ObjectId? | |
| `thumbnailKey` | string? | S3 key |
| `createdAt` / `updatedAt` | Date | |

## assets

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `ownerId` | ObjectId | |
| `kind` | `'image'\|'video'\|'logo'\|'music'\|'icon'` | |
| `name` | string | |
| `s3Key` | string | |
| `mimeType` | string | |
| `sizeBytes` | number | |
| `folder` | string? | |
| `tags` | string[] | |
| `createdAt` | Date | |

## jobs

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `ownerId` | ObjectId | |
| `projectId` | ObjectId? | |
| `type` | string | from `ai-contracts` / export enums |
| `status` | `'queued'\|'running'\|'succeeded'\|'failed'\|'cancelled'` | |
| `idempotencyKey` | string | unique |
| `progress` | number | 0–100 |
| `input` | object | |
| `output` | object? | S3 keys, layer patches |
| `error` | string? | |
| `attempts` | number | |
| `createdAt` / `updatedAt` / `completedAt` | Date | |

## brandKits

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `ownerId` | ObjectId | |
| `name` | string | |
| `logos` | AssetRef[] | |
| `colors` | string[] | hex |
| `fonts` | { family, url? }[] | |
| `watermark` | AssetRef? | |
| `ctaStyles` | object[] | |
| `createdAt` / `updatedAt` | Date | |

## templates

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `channel` | string | facebook_ads, instagram_story, etc. |
| `name` | string | |
| `type` | `'image'\|'video'` | |
| `width` / `height` | number | |
| `document` | object | starter DesignDocument / VideoProject |
| `thumbnailKey` | string? | |
| `published` | boolean | |

## S3 key layout

```text
users/{userId}/assets/{assetId}/{filename}
users/{userId}/projects/{projectId}/document.json
users/{userId}/projects/{projectId}/exports/{jobId}.{ext}
users/{userId}/jobs/{jobId}/input/...
users/{userId}/jobs/{jobId}/output/...
templates/{templateId}/thumb.{ext}
```
