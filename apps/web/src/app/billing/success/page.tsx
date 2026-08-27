'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';

function SuccessInner() {
  const search = useSearchParams();
  const sessionId = search.get('session_id');
  const [status, setStatus] = useState('Confirming your subscription…');

  useEffect(() => {
    if (!sessionId) {
      setStatus('Missing checkout session.');
      return;
    }
    void fetch('/api/billing/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
      .then(async (res) => {
        const data = (await res.json()) as { error?: string };
        setStatus(res.ok ? 'Premium is now active. You can use locked editor features.' : data.error || 'Could not confirm yet.');
      })
      .catch(() => setStatus('Could not confirm checkout.'));
  }, [sessionId]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--sn-editor-surface)] px-4">
      <div className="w-full max-w-md rounded-3xl border border-fog-200 bg-[var(--sn-editor-panel)] p-8 text-center">
        <h1 className="font-display text-3xl text-ink-950">Thanks</h1>
        <p className="mt-3 text-sm text-ink-600">{status}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/editor" className="landing-cta-primary">
            Image editor
          </Link>
          <Link href="/video" className="landing-cta-secondary">
            Video editor
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm">Loading…</div>}>
      <SuccessInner />
    </Suspense>
  );
}
