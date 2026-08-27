/**
 * Seed default accounts and a starter Premium plan on first boot.
 */

import bcrypt from 'bcryptjs';
import { ALL_PREMIUM_FEATURE_IDS } from '@/lib/premiumFeatures';
import { createPlan, createUser, findUserByEmail, listPlans, updateUser } from './store';

const DEFAULT_PASSWORD = '12345678';

let seeded = false;
let seedPromise: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  if (!seedPromise) {
    seedPromise = runSeed().finally(() => {
      seeded = true;
    });
  }
  await seedPromise;
}

async function runSeed(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const admin = await findUserByEmail('admin@gmail.com');
  if (!admin) {
    await createUser({
      email: 'admin@gmail.com',
      name: 'SN Editor Admin',
      passwordHash,
      role: 'admin',
      plan: 'premium',
      subscriptionStatus: 'active',
    });
  }

  const user = await findUserByEmail('user@gmail.com');
  if (!user) {
    await createUser({
      email: 'user@gmail.com',
      name: 'SN Editor User',
      passwordHash,
      role: 'user',
      plan: 'premium',
      subscriptionStatus: 'active',
    });
  } else if (user.plan !== 'premium' || user.subscriptionStatus !== 'active') {
    await updateUser(user.id, {
      plan: 'premium',
      subscriptionStatus: 'active',
    });
  }

  const plans = await listPlans();
  if (plans.length === 0) {
    await createPlan({
      name: 'Premium',
      description: 'Unlock brand kit, HD/PDF export, video animate, transitions, filters, and video export.',
      amountCents: 999,
      currency: 'usd',
      interval: 'month',
      features: [...ALL_PREMIUM_FEATURE_IDS],
      active: true,
    });
  }

  const demoUser = await findUserByEmail('user@gmail.com');
  const latestPlans = await listPlans();
  const premiumPlanId = latestPlans[0]?.id;
  if (demoUser && premiumPlanId) {
    await updateUser(demoUser.id, {
      plan: 'premium',
      subscriptionStatus: 'active',
      currentPlanId: premiumPlanId,
    });
  }
}
