import { NextRequest, NextResponse } from 'next/server';
import { ensureSeeded } from '@/server/account/seed';
import { findUserById, updateUser } from '@/server/account/store';
import { getCurrentUser } from '@/server/auth/session';
import { getStripe } from '@/server/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  await ensureSeeded();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { sessionId?: string } | null;
  const sessionId = body?.sessionId?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const stripe = await getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== 'paid' && session.status !== 'complete') {
    return NextResponse.json({ error: 'Checkout is not complete yet' }, { status: 400 });
  }

  const userId = session.metadata?.userId || session.client_reference_id || user.id;
  if (userId !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const planId = session.metadata?.planId;
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : undefined;
  const customerId = typeof session.customer === 'string' ? session.customer : undefined;
  const target = await findUserById(userId);
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const updated = await updateUser(userId, {
    plan: 'premium',
    subscriptionStatus: 'active',
    currentPlanId: planId ?? target.currentPlanId,
    stripeSubscriptionId: subscriptionId ?? target.stripeSubscriptionId,
    stripeCustomerId: customerId ?? target.stripeCustomerId,
  });

  return NextResponse.json({ ok: true, plan: updated?.plan ?? 'premium' });
}
