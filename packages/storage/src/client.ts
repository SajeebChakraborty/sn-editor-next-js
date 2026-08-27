/**
 * @fileoverview S3 client factory for SN Editor asset / export storage.
 */

import { S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';

export interface CreateS3ClientOptions {
  region: string;
  /** Optional endpoint override (LocalStack / MinIO in local dev). */
  endpoint?: string;
  forcePathStyle?: boolean;
  credentials?: S3ClientConfig['credentials'];
}

/**
 * Create a configured AWS S3 client.
 * @param options - Region and optional local endpoint overrides
 */
export function createS3Client(options: CreateS3ClientOptions): S3Client {
  // STUB: phase-1 — production uses IAM role credentials on ECS (omit credentials)
  return new S3Client({
    region: options.region,
    endpoint: options.endpoint,
    forcePathStyle: options.forcePathStyle ?? Boolean(options.endpoint),
    credentials: options.credentials,
  });
}
