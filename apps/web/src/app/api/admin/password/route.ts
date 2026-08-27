import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { ensureSeeded } from '@/server/account/seed';
import { updateUser } from '@/server/account/store';
import { isAdminUser, requireAdminResponse } from '@/server/auth/adminGuard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  await ensureSeeded();
  const admin = await requireAdminResponse();
  if (!isAdminUser(admin)) return admin;

  const body = (await req.json().catch(() => null)) as {
    currentPassword?: string;
    newPassword?: string;
  } | null;
  const currentPassword = body?.currentPassword ?? '';
  const newPassword = body?.newPassword ?? '';
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
  }

  const ok = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updateUser(admin.id, { passwordHash });
  return NextResponse.json({ ok: true });
}
