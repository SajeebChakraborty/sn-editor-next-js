/**
 * JWT cookie sessions for email/password auth.
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { SessionUser } from '@sn-editor/auth';
import type { AccountUser } from '@/server/account/types';
import { toPublicUser } from '@/server/account/types';
import { findUserById, listPlans } from '@/server/account/store';
import { ensureSeeded } from '@/server/account/seed';
import { resolveFeatureIds } from '@/lib/premiumFeatures';
import { signHs256Jwt, verifyHs256Jwt } from '@/lib/jwtHs256';

export const SESSION_COOKIE = 'sn_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function toSessionUser(user: AccountUser): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image ?? null,
    role: user.role,
    plan: user.plan,
  };
}

export async function signSessionToken(user: AccountUser): Promise<string> {
  return signHs256Jwt(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
    },
    SESSION_MAX_AGE,
  );
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  const payload = await verifyHs256Jwt(token);
  if (!payload) return null;
  const id = typeof payload.sub === 'string' ? payload.sub : '';
  const email = typeof payload.email === 'string' ? payload.email : '';
  if (!id || !email) return null;
  return {
    id,
    email,
    name: typeof payload.name === 'string' ? payload.name : null,
    role: payload.role === 'admin' ? 'admin' : 'user',
    plan: payload.plan === 'premium' ? 'premium' : 'free',
  };
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  };
}

export async function attachSessionCookie<T>(response: NextResponse<T>, user: AccountUser): Promise<NextResponse<T>> {
  const token = await signSessionToken(user);
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}

export async function attachLogoutCookie<T>(response: NextResponse<T>): Promise<NextResponse<T>> {
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

export async function setSessionCookie(user: AccountUser): Promise<void> {
  const token = await signSessionToken(user);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSessionFromCookie(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getCurrentUser(): Promise<AccountUser | null> {
  await ensureSeeded();
  const session = await getSessionFromCookie();
  if (!session) return null;
  return findUserById(session.id);
}

export async function requireCurrentUser(): Promise<AccountUser> {
  const user = await getCurrentUser();
  if (!user) {
    const err = new Error('Unauthorized');
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  return user;
}

export async function requireAdmin(): Promise<AccountUser> {
  const user = await requireCurrentUser();
  if (user.role !== 'admin') {
    const err = new Error('Forbidden');
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  return user;
}

export async function getMePayload() {
  const user = await getCurrentUser();
  if (!user) return { user: null, features: [] as string[] };
  const plans = await listPlans();
  return {
    user: toPublicUser(user),
    features: resolveFeatureIds(user, plans),
  };
}
