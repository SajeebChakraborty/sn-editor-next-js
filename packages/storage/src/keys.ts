/**
 * @fileoverview S3 object key builders — layout from docs/DATA_MODEL.md.
 *
 * ```
 * users/{userId}/assets/{assetId}/{filename}
 * users/{userId}/projects/{projectId}/document.json
 * users/{userId}/projects/{projectId}/exports/{jobId}.{ext}
 * users/{userId}/jobs/{jobId}/input/...
 * users/{userId}/jobs/{jobId}/output/...
 * templates/{templateId}/thumb.{ext}
 * ```
 */

export interface AssetKeyParts {
  userId: string;
  assetId: string;
  filename: string;
}

/**
 * Build a user asset object key.
 * @example users/u1/assets/a1/product.png
 */
export function buildAssetKey(parts: AssetKeyParts): string {
  return `users/${parts.userId}/assets/${parts.assetId}/${parts.filename}`;
}

/** Project document JSON key. */
export function buildProjectDocumentKey(userId: string, projectId: string): string {
  return `users/${userId}/projects/${projectId}/document.json`;
}

/** Export artifact key (png, mp4, zip, …). */
export function buildExportKey(
  userId: string,
  projectId: string,
  jobId: string,
  ext: string,
): string {
  const normalized = ext.replace(/^\./, '');
  return `users/${userId}/projects/${projectId}/exports/${jobId}.${normalized}`;
}

/** Job input/output prefix helpers. */
export function buildJobInputKey(userId: string, jobId: string, filename: string): string {
  return `users/${userId}/jobs/${jobId}/input/${filename}`;
}

export function buildJobOutputKey(userId: string, jobId: string, filename: string): string {
  return `users/${userId}/jobs/${jobId}/output/${filename}`;
}

/** Template thumbnail key. */
export function buildTemplateThumbKey(templateId: string, ext: string): string {
  const normalized = ext.replace(/^\./, '');
  return `templates/${templateId}/thumb.${normalized}`;
}
