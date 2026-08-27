/**
 * @fileoverview `@sn-editor/storage` public API — S3 client, key layout, presigned URLs.
 */

export { createS3Client, type CreateS3ClientOptions } from './client';
export {
  buildAssetKey,
  buildProjectDocumentKey,
  buildExportKey,
  buildJobInputKey,
  buildJobOutputKey,
  buildTemplateThumbKey,
  type AssetKeyParts,
} from './keys';
export {
  getSignedUploadUrl,
  getSignedDownloadUrl,
  type SignedUrlOptions,
} from './presign';
