'use client';

import { BrandWordmark } from '@/components/brand/BrandWordmark';
import { useBrand } from '@/components/brand/BrandProvider';
import { TypeSnEditor } from './TypeSnEditor';

export function LandingHeroTitle({ className }: { className?: string }) {
  const { brandName } = useBrand();
  return <TypeSnEditor text={brandName} className={className} />;
}

export function LandingHeroAside({ className }: { className?: string }) {
  const { brandName } = useBrand();
  return (
    <p className={className}>
      Watch the HD tutorial on the right — then build the same workflow in {brandName}.
    </p>
  );
}

export function LandingFooter() {
  const { brandName } = useBrand();
  return (
    <footer className="landing-footer px-6 py-8 text-center text-sm">
      <BrandWordmark className="font-display text-ink-900" />
      <span className="landing-footer-sep">·</span>
      {brandName} for eCommerce creatives
    </footer>
  );
}
