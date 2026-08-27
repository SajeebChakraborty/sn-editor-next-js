/**
 * Dev session helpers used when Auth.js is not configured yet.
 */
import type { SessionUser } from './session';

/** Demo session for local development without OAuth. */
export function getDevSession(): SessionUser {
  return {
    id: process.env.DEV_USER_ID ?? 'dev-user-1',
    email: process.env.DEV_USER_EMAIL ?? 'dev@sneditor.app',
    name: 'SN Editor Dev',
  };
}

/**
 * Ensure the session user owns the resource.
 * @throws Error when unauthorized
 */
export function assertOwner(userId: string, ownerId: string, resource = 'resource'): void {
  if (userId !== ownerId) {
    const err = new Error(`Forbidden: not owner of ${resource}`);
    (err as Error & { status: number }).status = 403;
    throw err;
  }
}

export function assertAuthenticated(
  user: SessionUser | null | undefined,
): asserts user is SessionUser {
  if (!user?.id) {
    const err = new Error('Unauthorized');
    (err as Error & { status: number }).status = 401;
    throw err;
  }
}
