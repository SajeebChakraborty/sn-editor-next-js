'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PREMIUM_FEATURES } from '@/lib/premiumFeatures';
import { useMe } from '@/components/auth/MeProvider';
import { BrandWordmark } from '@/components/brand/BrandWordmark';

type PublicPlan = {
  id: string;
  name: string;
  description: string;
  amountCents: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
};

function formatPrice(cents: number, currency: string, interval: string) {
  const amount = (cents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  });
  return `${amount} / ${interval}`;
}

export default function PricingPage() {
  const { user, hasPremiumFeature } = useMe();
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/billing/plans')
      .then((r) => r.json())
      .then((data: { plans?: PublicPlan[] }) => setPlans(data.plans ?? []));
  }, []);

  const subscribe = async (planId: string) => {
    if (!user) {
      window.location.href = `/login?next=/pricing`;
      return;
    }
    setBusyId(planId);
    setError(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error || 'Could not start checkout');
        return;
      }
      window.location.href = data.url;
    } finally {
      setBusyId(null);
    }
  };

  const isPremium = hasPremiumFeature('*') || user?.plan === 'premium' || user?.role === 'admin';

  return (
    <main className="min-h-screen bg-[var(--sn-editor-surface)] px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <BrandWordmark className="font-display text-2xl text-ink-900" />
          <Link href={user ? '/editor' : '/login'} className="text-sm font-semibold text-ink-700">
            {user ? 'Open editor' : 'Log in'}
          </Link>
        </div>
        <h1 className="mt-10 font-display text-4xl text-ink-950">Premium plans</h1>
        <p className="mt-3 max-w-2xl text-ink-600">
          Free accounts can design. Premium unlocks brand kit, HD/PDF export, image filters, and video
          animate, transitions, filters, and export.
        </p>
        {isPremium ? (
          <p className="mt-4 rounded-xl border border-fog-200 bg-[var(--sn-editor-panel)] px-4 py-3 text-sm text-ink-700">
            You already have Premium access.
          </p>
        ) : null}
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className="flex flex-col rounded-3xl border border-fog-200 bg-[var(--sn-editor-panel)] p-6 shadow-sm"
            >
              <h2 className="font-display text-2xl text-ink-950">{plan.name}</h2>
              <p className="mt-2 text-lg font-semibold text-[var(--sn-editor-accent-deep)]">
                {formatPrice(plan.amountCents, plan.currency, plan.interval)}
              </p>
              <p className="mt-2 text-sm text-ink-600">{plan.description}</p>
              <ul className="mt-4 flex-1 space-y-1 text-sm text-ink-700">
                {(plan.features.length ? PREMIUM_FEATURES.filter((f) => plan.features.includes(f.id) || plan.features.includes('all')) : PREMIUM_FEATURES).map(
                  (f) => (
                    <li key={f.id}>• {f.label}</li>
                  ),
                )}
              </ul>
              <button
                type="button"
                className="landing-cta-primary mt-6 justify-center"
                disabled={isPremium || busyId === plan.id}
                onClick={() => void subscribe(plan.id)}
              >
                {isPremium ? 'Current plan' : busyId === plan.id ? 'Redirecting…' : 'Subscribe'}
              </button>
            </article>
          ))}
        </div>
        {plans.length === 0 ? (
          <p className="mt-8 text-sm text-ink-600">No plans yet. An admin can add Stripe plans in the admin panel.</p>
        ) : null}
      </div>
    </main>
  );
}
