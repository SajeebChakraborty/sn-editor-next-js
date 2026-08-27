import { NextResponse } from 'next/server';
import type { AccountUser } from '@/server/account/types';
import { getCurrentUser } from '@/server/auth/session';

export async function requireAdminResponse(): Promise<AccountUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return user;
}

export function isAdminUser(value: AccountUser | NextResponse): value is AccountUser {
  return !(value instanceof NextResponse);
}
