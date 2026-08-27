/**
 * @fileoverview Presigned S3 URL helpers for browser uploads/downloads.
 */

import { GetObjectCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface SignedUrlOptions {
  client: S3Client;
  bucket: string;
  key: string;
  /** Seconds until expiry (default 900). */
  expiresIn?: number;
  contentType?: string;
}

/**
 * Create a presigned PUT URL for direct-to-S3 uploads.
 */
export async function getSignedUploadUrl(options: SignedUrlOptions): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: options.bucket,
    Key: options.key,
    ContentType: options.contentType,
  });
  // STUB: phase-1 — add Content-MD5 / SSE headers when bucket policy requires them
  return getSignedUrl(options.client, command, { expiresIn: options.expiresIn ?? 900 });
}

/**
 * Create a presigned GET URL for time-limited downloads.
 */
export async function getSignedDownloadUrl(options: SignedUrlOptions): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: options.bucket,
    Key: options.key,
  });
  return getSignedUrl(options.client, command, { expiresIn: options.expiresIn ?? 900 });
}
