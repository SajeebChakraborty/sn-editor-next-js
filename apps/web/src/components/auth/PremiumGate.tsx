'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMe } from '@/components/auth/MeProvider';

export function PremiumGate({
  feature,
  label,
  children,
}: {
  feature: string;
  label?: string;
  children: ReactNode;
}) {
  const { loading, hasPremiumFeature } = useMe();
  if (loading || hasPremiumFeature(feature)) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-[160px]">
      <div className="pointer-events-none select-none opacity-40 blur-[0.3px]">{children}</div>
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--sn-editor-panel)]/80 p-4 backdrop-blur-[2px]">
        <div className="max-w-[220px] rounded-2xl border border-fog-200 bg-[var(--sn-editor-panel)] p-4 text-center shadow-lg">
          <p className="text-xs font-semibold text-ink-900">{label ?? 'Premium feature'}</p>
          <p className="mt-1 text-[11px] text-ink-600">Subscribe to unlock this tool.</p>
          <Link href="/pricing" className="btn-tool btn-tool-active mt-3 inline-flex">
            Upgrade
          </Link>
        </div>
      </div>
    </div>
  );
}
