/**
 * @fileoverview Template Mongoose model — channel starter documents.
 * Matches docs/DATA_MODEL.md `templates` collection.
 */

import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

const templateSchema = new Schema(
  {
    channel: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['image', 'video'], required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    /** Starter DesignDocument / VideoProject JSON. */
    document: { type: Schema.Types.Mixed, required: true, default: {} },
    thumbnailKey: { type: String },
    published: { type: Boolean, required: true, default: false, index: true },
  },
  { timestamps: true },
);

export type TemplateDocument = InferSchemaType<typeof templateSchema> & {
  _id: Types.ObjectId;
};

export const Template: Model<TemplateDocument> =
  (model.models.Template as Model<TemplateDocument> | undefined) ??
  model<TemplateDocument>('Template', templateSchema);
