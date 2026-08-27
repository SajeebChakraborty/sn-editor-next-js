import { NextRequest, NextResponse } from 'next/server';
import { ensureSeeded } from '@/server/account/seed';
import { findPlanById, updateUser } from '@/server/account/store';
import { getCurrentUser } from '@/server/auth/session';
import { getStripe, loadStripeSettings } from '@/server/stripe';
import { rateLimit } from '@/lib/observability';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  await ensureSeeded();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!rateLimit(`checkout:${user.id}`, 20)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  if (user.role === 'admin') {
    return NextResponse.json({ error: 'Admin accounts already have full access' }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as { planId?: string } | null;
  const planId = body?.planId?.trim();
  if (!planId) {
    return NextResponse.json({ error: 'planId is required' }, { status: 400 });
  }
  const plan = await findPlanById(planId);
  if (!plan || !plan.active) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  const settings = await loadStripeSettings();
  if (!settings.stripeSecretKey) {
    return NextResponse.json(
      { error: 'Stripe is not configured yet. Ask an admin to add the secret key.' },
      { status: 400 },
    );
  }
  if (!plan.stripePriceId) {
    return NextResponse.json(
      { error: 'This plan is not synced with Stripe yet. Ask an admin to save the plan again.' },
      { status: 400 },
    );
  }

  const origin = req.nextUrl.origin;
  const stripe = await getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing`,
    customer: user.stripeCustomerId || undefined,
    customer_email: user.stripeCustomerId ? undefined : user.email,
    client_reference_id: user.id,
    metadata: { userId: user.id, planId: plan.id },
    subscription_data: {
      metadata: { userId: user.id, planId: plan.id },
    },
  });

  if (session.customer && typeof session.customer === 'string' && !user.stripeCustomerId) {
    await updateUser(user.id, { stripeCustomerId: session.customer });
  }

  return NextResponse.json({ url: session.url });
}
