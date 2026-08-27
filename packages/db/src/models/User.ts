/**
 * @fileoverview User Mongoose model — accounts, roles, and billing fields.
 * Matches docs/DATA_MODEL.md `users` collection.
 */

import mongoose, { Schema, type InferSchemaType, type Model, Types } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    image: { type: String },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], required: true, default: 'user' },
    plan: { type: String, enum: ['free', 'premium'], required: true, default: 'free' },
    currentPlanId: { type: String },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    subscriptionStatus: {
      type: String,
      enum: ['none', 'active', 'canceled', 'past_due', 'trialing'],
      required: true,
      default: 'none',
    },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };

export const User: Model<UserDocument> =
  (mongoose.models.User as Model<UserDocument> | undefined) ??
  mongoose.model<UserDocument>('User', userSchema);
