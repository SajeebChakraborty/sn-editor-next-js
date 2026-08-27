import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { ensureSeeded } from '@/server/account/seed';
import {
  findUserById,
  findUserByStripeCustomerId,
  findUserByStripeSubscriptionId,
  updateUser,
} from '@/server/account/store';
import { getStripe, loadStripeSettings } from '@/server/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function applySubscription(
  userId: string,
  planId: string | undefined,
  subscriptionId: string | undefined,
  customerId: string | undefined,
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'none',
) {
  const user = await findUserById(userId);
  if (!user) return;
  const premium = status === 'active' || status === 'trialing';
  await updateUser(userId, {
    plan: premium ? 'premium' : 'free',
    subscriptionStatus: status,
    currentPlanId: planId ?? user.currentPlanId,
    stripeSubscriptionId: subscriptionId ?? user.stripeSubscriptionId,
    stripeCustomerId: customerId ?? user.stripeCustomerId,
  });
}

export async function POST(req: NextRequest) {
  await ensureSeeded();
  const settings = await loadStripeSettings();
  const stripe = await getStripe();
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event: Stripe.Event;
  if (settings.stripeWebhookSecret && signature) {
    try {
      event = stripe.webhooks.constructEvent(payload, signature, settings.stripeWebhookSecret);
    } catch {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: 'Webhook secret is not configured' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId || session.client_reference_id || '';
    const planId = session.metadata?.planId;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : undefined;
    const customerId = typeof session.customer === 'string' ? session.customer : undefined;
    if (userId) {
      await applySubscription(userId, planId, subscriptionId, customerId, 'active');
    }
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    const planId = sub.metadata?.planId;
    const customerId = typeof sub.customer === 'string' ? sub.customer : undefined;
    const user =
      (sub.metadata?.userId ? await findUserById(sub.metadata.userId) : null) ??
      (await findUserByStripeSubscriptionId(sub.id)) ??
      (customerId ? await findUserByStripeCustomerId(customerId) : null);
    if (user) {
      const mapped =
        event.type === 'customer.subscription.deleted'
          ? 'canceled'
          : sub.status === 'active'
            ? 'active'
            : sub.status === 'trialing'
              ? 'trialing'
              : sub.status === 'past_due'
                ? 'past_due'
                : 'canceled';
      await applySubscription(user.id, planId, sub.id, customerId, mapped);
    }
  }

  return NextResponse.json({ received: true });
}
