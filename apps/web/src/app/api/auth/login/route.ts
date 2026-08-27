import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { findUserByEmail } from '@/server/account/store';
import { ensureSeeded } from '@/server/account/seed';
import { attachSessionCookie, toSessionUser } from '@/server/auth/session';
import { rateLimit } from '@/lib/observability';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!rateLimit('auth-login', 30)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  await ensureSeeded();
  const body = (await req.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? '';
  const password = body?.password ?? '';
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  return attachSessionCookie(NextResponse.json({ user: toSessionUser(user) }), user);
}
