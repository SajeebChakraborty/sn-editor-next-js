import { NextResponse } from 'next/server';
import { ensureSeeded } from '@/server/account/seed';
import { getSettings } from '@/server/account/store';
import { DEFAULT_SETTINGS } from '@/server/account/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  await ensureSeeded();
  const settings = await getSettings();
  return NextResponse.json({
    brandName: settings.brandName?.trim() || DEFAULT_SETTINGS.brandName,
    brandLogo: settings.brandLogo ?? '',
  });
}
