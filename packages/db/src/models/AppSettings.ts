/**
 * @fileoverview Singleton app settings — Stripe keys stored by admin.
 */

import mongoose, { Schema, type InferSchemaType, type Model, Types } from 'mongoose';

const appSettingsSchema = new Schema(
  {
    stripePublishableKey: { type: String, default: '' },
    stripeSecretKey: { type: String, default: '' },
    stripeWebhookSecret: { type: String, default: '' },
    brandName: { type: String, default: 'SN Editor' },
    brandLogo: { type: String, default: '' },
  },
  { timestamps: true },
);

export type AppSettingsDocument = InferSchemaType<typeof appSettingsSchema> & {
  _id: Types.ObjectId;
};

export const AppSettings: Model<AppSettingsDocument> =
  (mongoose.models.AppSettings as Model<AppSettingsDocument> | undefined) ??
  mongoose.model<AppSettingsDocument>('AppSettings', appSettingsSchema);
