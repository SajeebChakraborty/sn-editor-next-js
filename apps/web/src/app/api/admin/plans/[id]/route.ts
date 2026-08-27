import { NextRequest, NextResponse } from 'next/server';
import { ALL_PREMIUM_FEATURE_IDS } from '@/lib/premiumFeatures';
import { ensureSeeded } from '@/server/account/seed';
import { deletePlan, findPlanById, updatePlan } from '@/server/account/store';
import { isAdminUser, requireAdminResponse } from '@/server/auth/adminGuard';
import { loadStripeSettings, syncPlanWithStripe } from '@/server/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await ensureSeeded();
  const admin = await requireAdminResponse();
  if (!isAdminUser(admin)) return admin;
  const { id } = await ctx.params;
  const existing = await findPlanById(id);
  if (!existing) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    description?: string;
    amountCents?: number;
    amount?: number;
    currency?: string;
    interval?: 'month' | 'year';
    features?: string[];
    active?: boolean;
    syncStripe?: boolean;
  } | null;
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const amountCents =
    typeof body.amountCents === 'number'
      ? Math.round(body.amountCents)
      : typeof body.amount === 'number'
        ? Math.round(body.amount * 100)
        : existing.amountCents;

  const features = Array.isArray(body.features)
    ? body.features.filter((f) => ALL_PREMIUM_FEATURE_IDS.includes(f as (typeof ALL_PREMIUM_FEATURE_IDS)[number]))
    : existing.features;

  let plan = await updatePlan(id, {
    name: body.name?.trim() || existing.name,
    description: typeof body.description === 'string' ? body.description.trim() : existing.description,
    amountCents,
    currency: body.currency ? body.currency.toLowerCase() : existing.currency,
    interval: body.interval === 'year' || body.interval === 'month' ? body.interval : existing.interval,
    features,
    active: typeof body.active === 'boolean' ? body.active : existing.active,
  });
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

  const settings = await loadStripeSettings();
  if (body.syncStripe !== false && settings.stripeSecretKey) {
    try {
      const stripeIds = await syncPlanWithStripe(plan);
      plan = (await updatePlan(plan.id, stripeIds)) ?? plan;
    } catch (err) {
      return NextResponse.json({
        plan,
        warning: err instanceof Error ? err.message : 'Plan saved, but Stripe sync failed',
      });
    }
  }
  return NextResponse.json({ plan });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await ensureSeeded();
  const admin = await requireAdminResponse();
  if (!isAdminUser(admin)) return admin;
  const { id } = await ctx.params;
  const ok = await deletePlan(id);
  if (!ok) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
