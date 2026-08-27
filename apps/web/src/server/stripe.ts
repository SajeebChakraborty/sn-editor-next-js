/**
 * Stripe helpers — keys come from admin settings (env used as fallback).
 */

import Stripe from 'stripe';
import { getSettings } from '@/server/account/store';
import type { AppSettings, BillingPlan } from '@/server/account/types';

export async function loadStripeSettings(): Promise<AppSettings> {
  const stored = await getSettings();
  return {
    stripePublishableKey:
      stored.stripePublishableKey.trim() || process.env.STRIPE_PUBLISHABLE_KEY?.trim() || '',
    stripeSecretKey: stored.stripeSecretKey.trim() || process.env.STRIPE_SECRET_KEY?.trim() || '',
    stripeWebhookSecret:
      stored.stripeWebhookSecret.trim() || process.env.STRIPE_WEBHOOK_SECRET?.trim() || '',
  };
}

export async function getStripe(): Promise<Stripe> {
  const settings = await loadStripeSettings();
  if (!settings.stripeSecretKey) {
    throw new Error('Stripe secret key is not configured. Add it in the admin panel.');
  }
  return new Stripe(settings.stripeSecretKey);
}

export function maskSecret(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 8) return '••••';
  return `${trimmed.slice(0, 7)}••••${trimmed.slice(-4)}`;
}

export async function syncPlanWithStripe(plan: BillingPlan): Promise<Partial<BillingPlan>> {
  const stripe = await getStripe();
  const amount = Math.max(0, Math.round(plan.amountCents));
  const currency = (plan.currency || 'usd').toLowerCase();
  const interval = plan.interval === 'year' ? 'year' : 'month';

  let productId = plan.stripeProductId;
  if (productId) {
    await stripe.products.update(productId, {
      name: plan.name,
      description: plan.description || undefined,
      active: plan.active,
    });
  } else {
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description || undefined,
      metadata: { snPlanId: plan.id },
    });
    productId = product.id;
  }

  let priceId = plan.stripePriceId;
  let needsNewPrice = !priceId;
  if (priceId) {
    const existing = await stripe.prices.retrieve(priceId);
    const same =
      existing.unit_amount === amount &&
      existing.currency === currency &&
      existing.recurring?.interval === interval;
    if (!same) needsNewPrice = true;
  }

  if (needsNewPrice) {
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: amount,
      currency,
      recurring: { interval },
      metadata: { snPlanId: plan.id },
    });
    priceId = price.id;
  }

  return { stripeProductId: productId, stripePriceId: priceId };
}
