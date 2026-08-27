import { NextRequest, NextResponse } from 'next/server';
import { ensureSeeded } from '@/server/account/seed';
import { listPublicUsers, updateUser } from '@/server/account/store';
import { isAdminUser, requireAdminResponse } from '@/server/auth/adminGuard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  await ensureSeeded();
  const admin = await requireAdminResponse();
  if (!isAdminUser(admin)) return admin;
  const users = await listPublicUsers();
  return NextResponse.json({ users });
}

export async function PATCH(req: NextRequest) {
  await ensureSeeded();
  const admin = await requireAdminResponse();
  if (!isAdminUser(admin)) return admin;
  const body = (await req.json().catch(() => null)) as {
    userId?: string;
    plan?: 'free' | 'premium';
    role?: 'user' | 'admin';
  } | null;
  if (!body?.userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }
  const patch: { plan?: 'free' | 'premium'; subscriptionStatus?: 'none' | 'active'; role?: 'user' | 'admin' } = {};
  if (body.plan === 'premium' || body.plan === 'free') {
    patch.plan = body.plan;
    patch.subscriptionStatus = body.plan === 'premium' ? 'active' : 'none';
  }
  if (body.role === 'user' || body.role === 'admin') {
    patch.role = body.role;
  }
  const user = await updateUser(body.userId, patch);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  const { passwordHash: _pw, ...publicUser } = user;
  return NextResponse.json({ user: publicUser });
}
