/**
 * Account store — MongoDB when MONGODB_URI is set, otherwise a JSON file.
 */

import { createId } from '@sn-editor/shared';
import { connectMongo } from '@sn-editor/db/client';
import { AppSettings as AppSettingsModel, type AppSettingsDocument } from '@sn-editor/db/models/AppSettings';
import { Plan, type PlanDocument } from '@sn-editor/db/models/Plan';
import { User, type UserDocument } from '@sn-editor/db/models/User';
import { mutateFileDb, readFileDb } from './fileDb';
import {
  DEFAULT_SETTINGS,
  toPublicUser,
  type AccountUser,
  type AppSettings,
  type BillingPlan,
  type PublicUser,
  type SubscriptionStatus,
  type UserPlan,
} from './types';

function mongoEnabled(): boolean {
  return Boolean(process.env.MONGODB_URI?.trim());
}

async function ensureMongo(): Promise<void> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error('MONGODB_URI is not set');
  await connectMongo(uri);
}

function nowIso(): string {
  return new Date().toISOString();
}

function userFromMongo(doc: UserDocument): AccountUser {
  return {
    id: String(doc._id),
    email: doc.email,
    name: doc.name,
    passwordHash: doc.passwordHash,
    role: doc.role,
    image: doc.image ?? undefined,
    plan: doc.plan,
    currentPlanId: doc.currentPlanId ?? undefined,
    stripeCustomerId: doc.stripeCustomerId ?? undefined,
    stripeSubscriptionId: doc.stripeSubscriptionId ?? undefined,
    subscriptionStatus: doc.subscriptionStatus,
    createdAt: (doc as UserDocument & { createdAt?: Date }).createdAt?.toISOString?.() ?? nowIso(),
    updatedAt: (doc as UserDocument & { updatedAt?: Date }).updatedAt?.toISOString?.() ?? nowIso(),
  };
}

function planFromMongo(doc: PlanDocument): BillingPlan {
  return {
    id: String(doc._id),
    name: doc.name,
    description: doc.description ?? '',
    amountCents: doc.amountCents,
    currency: doc.currency,
    interval: doc.interval,
    features: [...(doc.features ?? [])],
    stripeProductId: doc.stripeProductId ?? undefined,
    stripePriceId: doc.stripePriceId ?? undefined,
    active: doc.active,
    createdAt: (doc as PlanDocument & { createdAt?: Date }).createdAt?.toISOString?.() ?? nowIso(),
    updatedAt: (doc as PlanDocument & { updatedAt?: Date }).updatedAt?.toISOString?.() ?? nowIso(),
  };
}

function settingsFromMongo(doc: AppSettingsDocument): AppSettings {
  const extra = doc as AppSettingsDocument & { brandName?: string; brandLogo?: string };
  return {
    stripePublishableKey: doc.stripePublishableKey ?? '',
    stripeSecretKey: doc.stripeSecretKey ?? '',
    stripeWebhookSecret: doc.stripeWebhookSecret ?? '',
    brandName: extra.brandName?.trim() || DEFAULT_SETTINGS.brandName,
    brandLogo: extra.brandLogo ?? '',
  };
}

export async function listUsers(): Promise<AccountUser[]> {
  if (mongoEnabled()) {
    await ensureMongo();
    const docs = await User.find().exec();
    return docs.map(userFromMongo);
  }
  return readFileDb().users;
}

export async function listPublicUsers(): Promise<PublicUser[]> {
  const users = await listUsers();
  return users.map(toPublicUser);
}

export async function findUserById(id: string): Promise<AccountUser | null> {
  if (mongoEnabled()) {
    await ensureMongo();
    const doc = await User.findById(id).exec();
    return doc ? userFromMongo(doc) : null;
  }
  return readFileDb().users.find((u) => u.id === id) ?? null;
}

export async function findUserByEmail(email: string): Promise<AccountUser | null> {
  const normalized = email.trim().toLowerCase();
  if (mongoEnabled()) {
    await ensureMongo();
    const doc = await User.findOne({ email: normalized }).exec();
    return doc ? userFromMongo(doc) : null;
  }
  return readFileDb().users.find((u) => u.email === normalized) ?? null;
}

export async function createUser(input: {
  email: string;
  name: string;
  passwordHash: string;
  role?: AccountUser['role'];
  plan?: UserPlan;
  subscriptionStatus?: SubscriptionStatus;
}): Promise<AccountUser> {
  const email = input.email.trim().toLowerCase();
  const now = nowIso();
  if (mongoEnabled()) {
    await ensureMongo();
    const doc = await User.create({
      email,
      name: input.name.trim() || 'User',
      passwordHash: input.passwordHash,
      role: input.role ?? 'user',
      plan: input.plan ?? 'free',
      subscriptionStatus: input.subscriptionStatus ?? 'none',
    });
    return userFromMongo(doc);
  }
  const user: AccountUser = {
    id: createId('user'),
    email,
    name: input.name.trim() || 'User',
    passwordHash: input.passwordHash,
    role: input.role ?? 'user',
    plan: input.plan ?? 'free',
    subscriptionStatus: input.subscriptionStatus ?? 'none',
    createdAt: now,
    updatedAt: now,
  };
  mutateFileDb((db) => {
    db.users.push(user);
  });
  return user;
}

export async function updateUser(
  id: string,
  patch: Partial<Omit<AccountUser, 'id' | 'createdAt'>>,
): Promise<AccountUser | null> {
  if (mongoEnabled()) {
    await ensureMongo();
    const doc = await User.findByIdAndUpdate(id, patch, { new: true }).exec();
    return doc ? userFromMongo(doc) : null;
  }
  let updated: AccountUser | null = null;
  mutateFileDb((db) => {
    const idx = db.users.findIndex((u) => u.id === id);
    if (idx < 0) return;
    const next = { ...db.users[idx]!, ...patch, updatedAt: nowIso() };
    db.users[idx] = next;
    updated = next;
  });
  return updated;
}

export async function listPlans(): Promise<BillingPlan[]> {
  if (mongoEnabled()) {
    await ensureMongo();
    const docs = await Plan.find().sort({ createdAt: -1 }).exec();
    return docs.map(planFromMongo);
  }
  return readFileDb().plans;
}

export async function findPlanById(id: string): Promise<BillingPlan | null> {
  if (mongoEnabled()) {
    await ensureMongo();
    const doc = await Plan.findById(id).exec();
    return doc ? planFromMongo(doc) : null;
  }
  return readFileDb().plans.find((p) => p.id === id) ?? null;
}

export async function createPlan(input: Omit<BillingPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<BillingPlan> {
  const now = nowIso();
  if (mongoEnabled()) {
    await ensureMongo();
    const doc = await Plan.create(input);
    return planFromMongo(doc);
  }
  const plan: BillingPlan = { ...input, id: createId('plan'), createdAt: now, updatedAt: now };
  mutateFileDb((db) => {
    db.plans.push(plan);
  });
  return plan;
}

export async function updatePlan(
  id: string,
  patch: Partial<Omit<BillingPlan, 'id' | 'createdAt'>>,
): Promise<BillingPlan | null> {
  if (mongoEnabled()) {
    await ensureMongo();
    const doc = await Plan.findByIdAndUpdate(id, patch, { new: true }).exec();
    return doc ? planFromMongo(doc) : null;
  }
  let updated: BillingPlan | null = null;
  mutateFileDb((db) => {
    const idx = db.plans.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const next = { ...db.plans[idx]!, ...patch, updatedAt: nowIso() };
    db.plans[idx] = next;
    updated = next;
  });
  return updated;
}

export async function deletePlan(id: string): Promise<boolean> {
  if (mongoEnabled()) {
    await ensureMongo();
    const result = await Plan.findByIdAndDelete(id).exec();
    return result != null;
  }
  let removed = false;
  mutateFileDb((db) => {
    const before = db.plans.length;
    db.plans = db.plans.filter((p) => p.id !== id);
    removed = db.plans.length !== before;
  });
  return removed;
}

export async function getSettings(): Promise<AppSettings> {
  if (mongoEnabled()) {
    await ensureMongo();
    const doc = await AppSettingsModel.findOne().exec();
    return doc ? settingsFromMongo(doc) : { ...DEFAULT_SETTINGS };
  }
  return { ...DEFAULT_SETTINGS, ...readFileDb().settings };
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  if (mongoEnabled()) {
    await ensureMongo();
    const existing = await AppSettingsModel.findOne().exec();
    if (existing) {
      Object.assign(existing, patch);
      await existing.save();
      return settingsFromMongo(existing);
    }
    const created = await AppSettingsModel.create(patch);
    return settingsFromMongo(created);
  }
  let next = { ...DEFAULT_SETTINGS };
  mutateFileDb((db) => {
    db.settings = { ...db.settings, ...patch };
    next = db.settings;
  });
  return next;
}

export async function findUserByStripeCustomerId(customerId: string): Promise<AccountUser | null> {
  if (mongoEnabled()) {
    await ensureMongo();
    const doc = await User.findOne({ stripeCustomerId: customerId }).exec();
    return doc ? userFromMongo(doc) : null;
  }
  return readFileDb().users.find((u) => u.stripeCustomerId === customerId) ?? null;
}

export async function findUserByStripeSubscriptionId(subscriptionId: string): Promise<AccountUser | null> {
  if (mongoEnabled()) {
    await ensureMongo();
    const doc = await User.findOne({ stripeSubscriptionId: subscriptionId }).exec();
    return doc ? userFromMongo(doc) : null;
  }
  return readFileDb().users.find((u) => u.stripeSubscriptionId === subscriptionId) ?? null;
}
