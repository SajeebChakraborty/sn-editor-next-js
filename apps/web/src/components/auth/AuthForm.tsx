'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { BrandWordmark } from '@/components/brand/BrandWordmark';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || '/editor';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(mode === 'login' ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }
      router.replace(next.startsWith('/') ? next : '/editor');
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--sn-editor-surface)] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-fog-200 bg-[var(--sn-editor-panel)] p-8 shadow-lg">
        <BrandWordmark className="font-display text-2xl text-ink-900" />
        <h1 className="mt-6 font-display text-3xl text-ink-950">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="mt-2 text-sm text-ink-600">
          {mode === 'login'
            ? 'Log in to open the image and video editors.'
            : 'Register to save designs and subscribe to Premium.'}
        </p>

        <form className="mt-6 space-y-4" onSubmit={(e) => void submit(e)}>
          {mode === 'register' ? (
            <label className="block text-sm font-semibold text-ink-800">
              Name
              <input
                className="mt-1 w-full rounded-xl border border-fog-200 bg-[var(--sn-editor-surface)] px-3 py-2 text-sm text-ink-900"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </label>
          ) : null}
          <label className="block text-sm font-semibold text-ink-800">
            Email
            <input
              type="email"
              required
              className="mt-1 w-full rounded-xl border border-fog-200 bg-[var(--sn-editor-surface)] px-3 py-2 text-sm text-ink-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="block text-sm font-semibold text-ink-800">
            Password
            <input
              type="password"
              required
              minLength={8}
              className="mt-1 w-full rounded-xl border border-fog-200 bg-[var(--sn-editor-surface)] px-3 py-2 text-sm text-ink-900"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="submit" className="landing-cta-primary w-full justify-center" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Register'}
          </button>
        </form>

        <p className="mt-6 text-sm text-ink-600">
          {mode === 'login' ? (
            <>
              No account?{' '}
              <Link href="/register" className="font-semibold text-[var(--sn-editor-accent-deep)]">
                Register
              </Link>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-[var(--sn-editor-accent-deep)]">
                Log in
              </Link>
            </>
          )}
        </p>

        {mode === 'login' ? (
          <div className="mt-6 rounded-2xl border border-fog-200 bg-[var(--sn-editor-surface)] p-4 text-[12px] text-ink-600">
            <p className="font-semibold text-ink-800">Demo accounts</p>
            <p className="mt-1">User: user@gmail.com / 12345678</p>
            <p>Admin: admin@gmail.com / 12345678</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
