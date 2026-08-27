/**
 * @fileoverview Shared Mongoose subdocument shapes used across collections.
 */

/** Lightweight pointer to an asset stored in S3 / the assets collection. */
export interface AssetRef {
  assetId: string;
  s3Key?: string;
}

/** Brand kit font entry. */
export interface BrandFont {
  family: string;
  url?: string;
}
