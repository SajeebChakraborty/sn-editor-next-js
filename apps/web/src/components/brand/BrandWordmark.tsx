'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useBrand } from './BrandProvider';

export function BrandWordmark({
  href = '/',
  className,
  imgClassName,
}: {
  href?: string | null;
  className?: string;
  imgClassName?: string;
}) {
  const { brandName, brandLogo } = useBrand();
  const inner = (
    <>
      {brandLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brandLogo} alt="" className={clsx('h-7 w-7 shrink-0 rounded object-contain', imgClassName)} />
      ) : null}
      <span>{brandName}</span>
    </>
  );
  const cls = clsx('inline-flex items-center gap-2', className);
  if (!href) {
    return <span className={cls}>{inner}</span>;
  }
  return (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}
