/**
 * @fileoverview Project Mongoose model — image/video editor documents.
 * Matches docs/DATA_MODEL.md `projects` collection.
 */

import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

const projectSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['image', 'video'], required: true },
    name: { type: String, required: true },
    /** DesignDocument or VideoProject JSON — validated at API boundary with Zod. */
    document: { type: Schema.Types.Mixed, required: true, default: {} },
    brandKitId: { type: Schema.Types.ObjectId, ref: 'BrandKit' },
    templateId: { type: Schema.Types.ObjectId, ref: 'Template' },
    thumbnailKey: { type: String },
  },
  { timestamps: true },
);

export type ProjectDocument = InferSchemaType<typeof projectSchema> & {
  _id: Types.ObjectId;
};

export const Project: Model<ProjectDocument> =
  (model.models.Project as Model<ProjectDocument> | undefined) ??
  model<ProjectDocument>('Project', projectSchema);
