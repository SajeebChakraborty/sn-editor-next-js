import { NextResponse } from 'next/server';
import { getMePayload } from '@/server/auth/session';
import { ensureSeeded } from '@/server/account/seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  await ensureSeeded();
  const payload = await getMePayload();
  return NextResponse.json(payload);
}
