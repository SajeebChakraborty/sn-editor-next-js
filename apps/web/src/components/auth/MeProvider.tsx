'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { hasFeature } from '@/lib/premiumFeatures';
import type { PublicUser } from '@/server/account/types';

type MeState = {
  user: PublicUser | null;
  features: string[];
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  hasPremiumFeature: (feature: string) => boolean;
};

const MeContext = createContext<MeState | null>(null);

export function MeProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [features, setFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/me', { cache: 'no-store' });
      const data = (await res.json()) as { user?: PublicUser | null; features?: string[] };
      setUser(data.user ?? null);
      setFeatures(data.features ?? []);
    } catch {
      setUser(null);
      setFeatures([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setFeatures([]);
    window.location.href = '/';
  }, []);

  const value = useMemo<MeState>(
    () => ({
      user,
      features,
      loading,
      refresh,
      logout,
      hasPremiumFeature: (feature: string) => hasFeature(features, feature),
    }),
    [user, features, loading, refresh, logout],
  );

  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}

export function useMe(): MeState {
  const ctx = useContext(MeContext);
  if (!ctx) {
    throw new Error('useMe must be used inside MeProvider');
  }
  return ctx;
}
