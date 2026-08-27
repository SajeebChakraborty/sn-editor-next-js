import { NextRequest, NextResponse } from 'next/server';
import { ALL_PREMIUM_FEATURE_IDS } from '@/lib/premiumFeatures';
import { ensureSeeded } from '@/server/account/seed';
import { createPlan, listPlans, updatePlan } from '@/server/account/store';
import { isAdminUser, requireAdminResponse } from '@/server/auth/adminGuard';
import { loadStripeSettings, syncPlanWithStripe } from '@/server/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PlanBody = {
  name?: string;
  description?: string;
  amountCents?: number;
  amount?: number;
  currency?: string;
  interval?: 'month' | 'year';
  features?: string[];
  active?: boolean;
  syncStripe?: boolean;
};

function parsePlanInput(body: PlanBody) {
  const name = body.name?.trim();
  if (!name) return { error: 'Name is required' as const };
  const amountCents =
    typeof body.amountCents === 'number'
      ? Math.round(body.amountCents)
      : typeof body.amount === 'number'
        ? Math.round(body.amount * 100)
        : NaN;
  if (!Number.isFinite(amountCents) || amountCents < 0) {
    return { error: 'Enter a valid price' as const };
  }
  const features = Array.isArray(body.features)
    ? body.features.filter((f) => ALL_PREMIUM_FEATURE_IDS.includes(f as (typeof ALL_PREMIUM_FEATURE_IDS)[number]))
    : [...ALL_PREMIUM_FEATURE_IDS];
  return {
    name,
    description: body.description?.trim() ?? '',
    amountCents,
    currency: (body.currency || 'usd').toLowerCase(),
    interval: body.interval === 'year' ? ('year' as const) : ('month' as const),
    features,
    active: body.active !== false,
  };
}

export async function GET() {
  await ensureSeeded();
  const admin = await requireAdminResponse();
  if (!isAdminUser(admin)) return admin;
  const plans = await listPlans();
  return NextResponse.json({ plans });
}

export async function POST(req: NextRequest) {
  await ensureSeeded();
  const admin = await requireAdminResponse();
  if (!isAdminUser(admin)) return admin;
  const body = (await req.json().catch(() => null)) as PlanBody | null;
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  const parsed = parsePlanInput(body);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  let plan = await createPlan({ ...parsed, stripeProductId: undefined, stripePriceId: undefined });
  const settings = await loadStripeSettings();
  if (body.syncStripe !== false && settings.stripeSecretKey) {
    try {
      const stripeIds = await syncPlanWithStripe(plan);
      const updated = await updatePlan(plan.id, stripeIds);
      if (updated) plan = updated;
    } catch (err) {
      return NextResponse.json(
        {
          plan,
          warning: err instanceof Error ? err.message : 'Plan saved, but Stripe sync failed',
        },
        { status: 201 },
      );
    }
  }
  return NextResponse.json({ plan }, { status: 201 });
}
