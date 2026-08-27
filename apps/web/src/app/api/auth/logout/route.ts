import { NextResponse } from 'next/server';
import { attachLogoutCookie } from '@/server/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  return attachLogoutCookie(NextResponse.json({ ok: true }));
}
