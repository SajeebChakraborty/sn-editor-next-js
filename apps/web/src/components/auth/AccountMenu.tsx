'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMe } from './MeProvider';

export function AccountMenu({ onDark = false }: { onDark?: boolean }) {
  const { user, loading, logout } = useMe();
  const [open, setOpen] = useState(false);

  if (loading) {
    return <span className={onDark ? 'text-sm text-white/60' : 'text-sm text-ink-500'}>…</span>;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className={onDark ? 'landing-nav-link-on-dark' : 'text-sm font-semibold text-ink-800'}>
          Log in
        </Link>
        <Link href="/register" className={onDark ? 'landing-cta-primary landing-cta-compact' : 'canva-topbar-share'}>
          Register
        </Link>
      </div>
    );
  }

  const initial = (user.name || user.email).slice(0, 1).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        className="flex items-center gap-2 rounded-full border border-fog-200 bg-[var(--sn-editor-panel)] px-2 py-1 text-sm text-ink-900"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--sn-editor-accent)] text-xs font-bold text-white">
          {initial}
        </span>
        <span className="hidden max-w-[140px] truncate sm:inline">{user.name || user.email}</span>
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 min-w-[200px] rounded-xl border border-fog-200 bg-[var(--sn-editor-panel)] p-1 shadow-lg">
          <p className="px-3 py-2 text-[11px] text-ink-500">{user.email}</p>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-600">
            {user.role === 'admin' ? 'Admin' : user.plan === 'premium' ? 'Premium' : 'Free'}
          </p>
          <Link href="/pricing" className="btn-tool w-full justify-start" onClick={() => setOpen(false)}>
            Plans
          </Link>
          {user.role === 'admin' ? (
            <Link href="/admin" className="btn-tool w-full justify-start" onClick={() => setOpen(false)}>
              Admin panel
            </Link>
          ) : null}
          <button type="button" className="btn-tool w-full justify-start" onClick={() => void logout()}>
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
