'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { PREMIUM_FEATURES } from '@/lib/premiumFeatures';
import type { BillingPlan, PublicUser } from '@/server/account/types';
import { BrandWordmark } from '@/components/brand/BrandWordmark';
import { useBrand } from '@/components/brand/BrandProvider';

type Settings = {
  stripePublishableKey: string;
  stripeSecretKeyMasked: string;
  stripeWebhookSecretMasked: string;
  hasSecretKey: boolean;
  hasWebhookSecret: boolean;
  brandName?: string;
  brandLogo?: string;
};

type Tab = 'brand' | 'password' | 'plans' | 'stripe' | 'users';

const TAB_LABEL: Record<Tab, string> = {
  brand: 'Brand',
  password: 'Password',
  plans: 'Stripe plans',
  stripe: 'Stripe keys',
  users: 'Users',
};

export default function AdminPage() {
  const { refresh: refreshBrand } = useBrand();
  const [tab, setTab] = useState<Tab>('brand');
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [name, setName] = useState('Premium');
  const [description, setDescription] = useState('Unlock premium image and video tools');
  const [amount, setAmount] = useState('9.99');
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [features, setFeatures] = useState<string[]>(PREMIUM_FEATURES.map((f) => f.id));
  const [editingId, setEditingId] = useState<string | null>(null);

  const [publishable, setPublishable] = useState('');
  const [secret, setSecret] = useState('');
  const [webhook, setWebhook] = useState('');

  const [brandName, setBrandName] = useState('SN Editor');
  const [brandLogo, setBrandLogo] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const load = useCallback(async () => {
    const [p, s, u] = await Promise.all([
      fetch('/api/admin/plans').then((r) => r.json()) as Promise<{ plans?: BillingPlan[] }>,
      fetch('/api/admin/settings').then((r) => r.json()) as Promise<Settings>,
      fetch('/api/admin/users').then((r) => r.json()) as Promise<{ users?: PublicUser[] }>,
    ]);
    setPlans(p.plans ?? []);
    setSettings(s);
    setPublishable(s.stripePublishableKey || '');
    setBrandName(s.brandName?.trim() || 'SN Editor');
    setBrandLogo(s.brandLogo ?? '');
    setUsers(u.users ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleFeature = (id: string) => {
    setFeatures((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  const savePlan = async () => {
    setStatus(null);
    const payload = {
      name,
      description,
      amount: Number(amount),
      interval,
      features,
      active: true,
    };
    const res = await fetch(editingId ? `/api/admin/plans/${editingId}` : '/api/admin/plans', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { error?: string; warning?: string };
    if (!res.ok) {
      setStatus(data.error || 'Could not save plan');
      return;
    }
    setStatus(data.warning || (editingId ? 'Plan updated' : 'Plan created'));
    setEditingId(null);
    await load();
  };

  const editPlan = (plan: BillingPlan) => {
    setEditingId(plan.id);
    setName(plan.name);
    setDescription(plan.description);
    setAmount(String(plan.amountCents / 100));
    setInterval(plan.interval);
    setFeatures(plan.features.length ? plan.features : PREMIUM_FEATURES.map((f) => f.id));
    setTab('plans');
  };

  const removePlan = async (id: string) => {
    if (!confirm('Delete this plan?')) return;
    await fetch(`/api/admin/plans/${id}`, { method: 'DELETE' });
    await load();
  };

  const saveStripe = async () => {
    setStatus(null);
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stripePublishableKey: publishable,
        stripeSecretKey: secret,
        stripeWebhookSecret: webhook,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setStatus(data.error || 'Could not save Stripe keys');
      return;
    }
    setSecret('');
    setWebhook('');
    setStatus('Stripe keys saved');
    await load();
  };

  const saveBrand = async () => {
    setStatus(null);
    const trimmed = brandName.trim();
    if (!trimmed) {
      setStatus('Brand name is required');
      return;
    }
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandName: trimmed, brandLogo }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setStatus(data.error || 'Could not save brand');
      return;
    }
    setStatus('Brand saved');
    await load();
    await refreshBrand();
  };

  const onLogoFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStatus('Logo must be an image (PNG, JPG, SVG, or WebP)');
      return;
    }
    if (file.size > 500_000) {
      setStatus('Logo must be under 500 KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setBrandLogo(String(reader.result || ''));
      setStatus(null);
    };
    reader.readAsDataURL(file);
  };

  const savePassword = async () => {
    setStatus(null);
    if (newPassword !== confirmPassword) {
      setStatus('New password and confirmation do not match');
      return;
    }
    const res = await fetch('/api/admin/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setStatus(data.error || 'Could not change password');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setStatus('Password updated');
  };

  const patchUser = async (userId: string, patch: { plan?: 'free' | 'premium'; role?: 'user' | 'admin' }) => {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...patch }),
    });
    await load();
  };

  return (
    <main className="min-h-screen bg-[var(--sn-editor-surface)] text-ink-900">
      <header className="flex items-center justify-between border-b border-fog-200 px-6 py-4">
        <div>
          <BrandWordmark className="font-display text-xl" />
          <p className="text-xs text-ink-500">Admin panel</p>
        </div>
        <Link href="/editor" className="text-sm font-semibold">
          Back to editor
        </Link>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 md:grid-cols-[200px_1fr]">
        <nav className="flex flex-col gap-1">
          {(['brand', 'password', 'plans', 'stripe', 'users'] as Tab[]).map((id) => (
            <button
              key={id}
              type="button"
              className={tab === id ? 'btn-tool btn-tool-active justify-start' : 'btn-tool justify-start'}
              onClick={() => setTab(id)}
            >
              {TAB_LABEL[id]}
            </button>
          ))}
        </nav>

        <section>
          {status ? <p className="mb-4 text-sm text-ink-700">{status}</p> : null}

          {tab === 'brand' ? (
            <div className="max-w-xl space-y-4 rounded-3xl border border-fog-200 bg-[var(--sn-editor-panel)] p-6">
              <h1 className="font-display text-2xl">Brand</h1>
              <p className="text-sm text-ink-600">
                This name and logo appear in the header, login, pricing, and editor chrome.
              </p>
              <label className="block text-sm font-semibold">
                Brand name
                <input
                  className="mt-1 w-full rounded-xl border border-fog-200 px-3 py-2 text-sm"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  maxLength={60}
                />
              </label>
              <div className="text-sm font-semibold">
                Logo
                <input
                  className="mt-1 block w-full text-sm"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => onLogoFile(e.target.files?.[0])}
                />
                <p className="mt-1 text-[11px] font-normal text-ink-500">PNG, JPG, WebP, or SVG. Max 500 KB.</p>
              </div>
              {brandLogo ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={brandLogo} alt="" className="h-12 w-12 rounded object-contain ring-1 ring-fog-200" />
                  <button type="button" className="btn-tool" onClick={() => setBrandLogo('')}>
                    Remove logo
                  </button>
                </div>
              ) : null}
              <button type="button" className="landing-cta-primary" onClick={() => void saveBrand()}>
                Save brand
              </button>
            </div>
          ) : null}

          {tab === 'password' ? (
            <div className="max-w-xl space-y-4 rounded-3xl border border-fog-200 bg-[var(--sn-editor-panel)] p-6">
              <h1 className="font-display text-2xl">Change password</h1>
              <p className="text-sm text-ink-600">Updates the password for the signed-in admin account.</p>
              <label className="block text-sm font-semibold">
                Current password
                <input
                  className="mt-1 w-full rounded-xl border border-fog-200 px-3 py-2 text-sm"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
              <label className="block text-sm font-semibold">
                New password
                <input
                  className="mt-1 w-full rounded-xl border border-fog-200 px-3 py-2 text-sm"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                />
              </label>
              <label className="block text-sm font-semibold">
                Confirm new password
                <input
                  className="mt-1 w-full rounded-xl border border-fog-200 px-3 py-2 text-sm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                />
              </label>
              <p className="text-[11px] text-ink-500">Minimum 8 characters.</p>
              <button type="button" className="landing-cta-primary" onClick={() => void savePassword()}>
                Update password
              </button>
            </div>
          ) : null}

          {tab === 'stripe' ? (
            <div className="max-w-xl space-y-4 rounded-3xl border border-fog-200 bg-[var(--sn-editor-panel)] p-6">
              <h1 className="font-display text-2xl">Stripe keys</h1>
              <p className="text-sm text-ink-600">
                Paste your publishable key and secret key. Leave secret/webhook blank to keep the current value.
              </p>
              <label className="block text-sm font-semibold">
                Publishable key
                <input
                  className="mt-1 w-full rounded-xl border border-fog-200 px-3 py-2 text-sm"
                  value={publishable}
                  onChange={(e) => setPublishable(e.target.value)}
                  placeholder="pk_test_..."
                />
              </label>
              <label className="block text-sm font-semibold">
                Secret key {settings?.hasSecretKey ? `(saved ${settings.stripeSecretKeyMasked})` : ''}
                <input
                  className="mt-1 w-full rounded-xl border border-fog-200 px-3 py-2 text-sm"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="sk_test_..."
                  type="password"
                />
              </label>
              <label className="block text-sm font-semibold">
                Webhook secret {settings?.hasWebhookSecret ? `(saved ${settings.stripeWebhookSecretMasked})` : ''}
                <input
                  className="mt-1 w-full rounded-xl border border-fog-200 px-3 py-2 text-sm"
                  value={webhook}
                  onChange={(e) => setWebhook(e.target.value)}
                  placeholder="whsec_..."
                  type="password"
                />
              </label>
              <p className="text-[11px] text-ink-500">
                Webhook URL: <code>/api/billing/webhook</code> — events: checkout.session.completed,
                customer.subscription.updated, customer.subscription.deleted
              </p>
              <button type="button" className="landing-cta-primary" onClick={() => void saveStripe()}>
                Save keys
              </button>
            </div>
          ) : null}

          {tab === 'plans' ? (
            <div className="space-y-6">
              <div className="rounded-3xl border border-fog-200 bg-[var(--sn-editor-panel)] p-6">
                <h1 className="font-display text-2xl">{editingId ? 'Update plan' : 'Add Stripe plan'}</h1>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold">
                    Name
                    <input className="mt-1 w-full rounded-xl border border-fog-200 px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
                  </label>
                  <label className="text-sm font-semibold">
                    Price (USD)
                    <input className="mt-1 w-full rounded-xl border border-fog-200 px-3 py-2 text-sm" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </label>
                  <label className="text-sm font-semibold sm:col-span-2">
                    Description
                    <input className="mt-1 w-full rounded-xl border border-fog-200 px-3 py-2 text-sm" value={description} onChange={(e) => setDescription(e.target.value)} />
                  </label>
                  <label className="text-sm font-semibold">
                    Interval
                    <select className="mt-1 w-full rounded-xl border border-fog-200 px-3 py-2 text-sm" value={interval} onChange={(e) => setInterval(e.target.value as 'month' | 'year')}>
                      <option value="month">Monthly</option>
                      <option value="year">Yearly</option>
                    </select>
                  </label>
                </div>
                <p className="mt-4 text-xs font-semibold uppercase text-ink-500">Premium features in this plan</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {PREMIUM_FEATURES.map((f) => (
                    <label key={f.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={features.includes(f.id)} onChange={() => toggleFeature(f.id)} />
                      {f.label}
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="button" className="landing-cta-primary" onClick={() => void savePlan()}>
                    {editingId ? 'Update plan' : 'Create plan'}
                  </button>
                  {editingId ? (
                    <button type="button" className="btn-tool" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  ) : null}
                </div>
                <p className="mt-3 text-[11px] text-ink-500">
                  Saving also creates/updates the Stripe Product and Price when a secret key is set.
                </p>
              </div>

              <div className="space-y-3">
                {plans.map((plan) => (
                  <article key={plan.id} className="rounded-2xl border border-fog-200 bg-[var(--sn-editor-panel)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold">{plan.name}</h2>
                        <p className="text-sm text-ink-600">
                          {(plan.amountCents / 100).toFixed(2)} {plan.currency.toUpperCase()} / {plan.interval}
                          {plan.active ? '' : ' · inactive'}
                        </p>
                        <p className="text-[11px] text-ink-500">
                          Stripe price: {plan.stripePriceId || 'not synced'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" className="btn-tool" onClick={() => editPlan(plan)}>
                          Edit
                        </button>
                        <button type="button" className="btn-tool" onClick={() => void removePlan(plan.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {tab === 'users' ? (
            <div className="overflow-x-auto rounded-3xl border border-fog-200 bg-[var(--sn-editor-panel)]">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-fog-200 text-xs uppercase text-ink-500">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-fog-200 last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{u.name}</div>
                        <div className="text-xs text-ink-500">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">{u.role}</td>
                      <td className="px-4 py-3">{u.plan}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn-tool"
                            onClick={() => void patchUser(u.id, { plan: u.plan === 'premium' ? 'free' : 'premium' })}
                          >
                            {u.plan === 'premium' ? 'Set free' : 'Grant premium'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
