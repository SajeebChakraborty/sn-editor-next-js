/**
 * @fileoverview Stripe billing plan documents created by admins.
 */

import mongoose, { Schema, type InferSchemaType, type Model, Types } from 'mongoose';

const planSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    amountCents: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'usd' },
    interval: { type: String, enum: ['month', 'year'], required: true, default: 'month' },
    features: { type: [String], default: [] },
    stripeProductId: { type: String },
    stripePriceId: { type: String },
    active: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

export type PlanDocument = InferSchemaType<typeof planSchema> & { _id: Types.ObjectId };

export const Plan: Model<PlanDocument> =
  (mongoose.models.Plan as Model<PlanDocument> | undefined) ??
  mongoose.model<PlanDocument>('Plan', planSchema);
