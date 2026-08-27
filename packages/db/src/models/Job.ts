/**
 * @fileoverview Job Mongoose model — durable AI/export job records.
 * Matches docs/DATA_MODEL.md `jobs` collection.
 */

import { Schema, model, type InferSchemaType, type Model, Types } from 'mongoose';

const jobSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    /** Job type ID from `@sn-editor/ai-contracts` (ImageAiTool | VideoAiTool | ExportJobType). */
    type: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['queued', 'running', 'succeeded', 'failed', 'cancelled'],
      required: true,
      default: 'queued',
      index: true,
    },
    idempotencyKey: { type: String, required: true, unique: true },
    progress: { type: Number, required: true, default: 0, min: 0, max: 100 },
    input: { type: Schema.Types.Mixed, required: true, default: {} },
    output: { type: Schema.Types.Mixed },
    error: { type: String },
    attempts: { type: Number, required: true, default: 0 },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

export type JobDocument = InferSchemaType<typeof jobSchema> & {
  _id: Types.ObjectId;
};

export const Job: Model<JobDocument> =
  (model.models.Job as Model<JobDocument> | undefined) ?? model<JobDocument>('Job', jobSchema);
