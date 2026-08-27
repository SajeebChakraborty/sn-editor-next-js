/**
 * Public branding for landing, editors, and login chrome.
 */
'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Branding = {
  brandName: string;
  brandLogo: string;
};

const DEFAULT_BRAND: Branding = { brandName: 'SN Editor', brandLogo: '' };

type BrandState = Branding & {
  loading: boolean;
  refresh: () => Promise<void>;
};

const BrandContext = createContext<BrandState | null>(null);

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brand, setBrand] = useState<Branding>(DEFAULT_BRAND);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/branding', { cache: 'no-store' });
      const data = (await res.json()) as Partial<Branding>;
      const next = {
        brandName: data.brandName?.trim() || DEFAULT_BRAND.brandName,
        brandLogo: data.brandLogo ?? '',
      };
      setBrand(next);
      if (typeof document !== 'undefined') {
        document.title = next.brandName;
      }
    } catch {
      setBrand(DEFAULT_BRAND);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<BrandState>(
    () => ({ ...brand, loading, refresh }),
    [brand, loading, refresh],
  );

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand(): BrandState {
  const ctx = useContext(BrandContext);
  if (!ctx) {
    throw new Error('useBrand must be used inside BrandProvider');
  }
  return ctx;
}
