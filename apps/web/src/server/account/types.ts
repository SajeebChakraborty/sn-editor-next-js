/**
 * Shared account / billing types used by the JSON + Mongo adapters.
 */

export type UserRole = 'user' | 'admin';
export type UserPlan = 'free' | 'premium';
export type SubscriptionStatus = 'none' | 'active' | 'canceled' | 'past_due' | 'trialing';
export type PlanInterval = 'month' | 'year';

export interface AccountUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  image?: string;
  plan: UserPlan;
  currentPlanId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus: SubscriptionStatus;
  createdAt: string;
  updatedAt: string;
}

export type PublicUser = Omit<AccountUser, 'passwordHash'>;

export interface BillingPlan {
  id: string;
  name: string;
  description: string;
  amountCents: number;
  currency: string;
  interval: PlanInterval;
  features: string[];
  stripeProductId?: string;
  stripePriceId?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  stripePublishableKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  brandName: string;
  brandLogo: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  stripePublishableKey: '',
  stripeSecretKey: '',
  stripeWebhookSecret: '',
  brandName: 'SN Editor',
  brandLogo: '',
};

export function toPublicUser(user: AccountUser): PublicUser {
  const { passwordHash: _pw, ...rest } = user;
  return rest;
}
