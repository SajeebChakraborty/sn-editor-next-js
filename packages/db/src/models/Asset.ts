/**
 * @fileoverview Asset Mongoose model — user media stored in S3.
 * Matches docs/DATA_MODEL.md `assets` collection.
 */

import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

const assetSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: {
      type: String,
      enum: ['image', 'video', 'logo', 'music', 'icon'],
      required: true,
    },
    name: { type: String, required: true },
    s3Key: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    folder: { type: String },
    tags: { type: [String], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type AssetDocument = InferSchemaType<typeof assetSchema> & {
  _id: Types.ObjectId;
};

export const Asset: Model<AssetDocument> =
  (model.models.Asset as Model<AssetDocument> | undefined) ??
  model<AssetDocument>('Asset', assetSchema);
