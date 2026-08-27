/**
 * @fileoverview BrandKit Mongoose model — logos, colors, fonts, CTAs.
 * Matches docs/DATA_MODEL.md `brandKits` collection.
 */

import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

const assetRefSchema = new Schema(
  {
    assetId: { type: String, required: true },
    s3Key: { type: String },
  },
  { _id: false },
);

const brandFontSchema = new Schema(
  {
    family: { type: String, required: true },
    url: { type: String },
  },
  { _id: false },
);

const brandKitSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    logos: { type: [assetRefSchema], default: [] },
    colors: { type: [String], default: [] },
    fonts: { type: [brandFontSchema], default: [] },
    watermark: { type: assetRefSchema },
    ctaStyles: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true },
);

export type BrandKitDocument = InferSchemaType<typeof brandKitSchema> & {
  _id: Types.ObjectId;
};

export const BrandKit: Model<BrandKitDocument> =
  (model.models.BrandKit as Model<BrandKitDocument> | undefined) ??
  model<BrandKitDocument>('BrandKit', brandKitSchema);
