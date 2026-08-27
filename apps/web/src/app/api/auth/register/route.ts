import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail } from '@/server/account/store';
import { ensureSeeded } from '@/server/account/seed';
import { attachSessionCookie, toSessionUser } from '@/server/auth/session';
import { rateLimit } from '@/lib/observability';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  if (!rateLimit('auth-register', 20)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  await ensureSeeded();
  const body = (await req.json().catch(() => null)) as {
    email?: string;
    password?: string;
    name?: string;
  } | null;
  const email = body?.email?.trim().toLowerCase() ?? '';
  const password = body?.password ?? '';
  const name = body?.name?.trim() || email.split('@')[0] || 'User';

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createUser({ email, name, passwordHash });

  return attachSessionCookie(NextResponse.json({ user: toSessionUser(user) }, { status: 201 }), user);
}
