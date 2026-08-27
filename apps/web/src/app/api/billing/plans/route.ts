import { NextResponse } from 'next/server';
import { ensureSeeded } from '@/server/account/seed';
import { listPlans } from '@/server/account/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  await ensureSeeded();
  const plans = (await listPlans()).filter((p) => p.active);
  return NextResponse.json({
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      amountCents: p.amountCents,
      currency: p.currency,
      interval: p.interval,
      features: p.features,
    })),
  });
}
