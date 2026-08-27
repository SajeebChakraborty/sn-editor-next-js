/**
 * @fileoverview Session guards for API routes and server actions.
 */

import type { SnEditorSession, SessionUser } from './session';

export class UnauthorizedError extends Error {
  readonly status = 401;

  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Assert that a session contains a signed-in user; throws {@link UnauthorizedError} otherwise.
 * // STUB: phase-1 — integrate with real Auth.js `auth()` once web app lands
 *
 * @param session - Session from Auth.js (or null/undefined when anonymous)
 * @returns The authenticated {@link SessionUser}
 */
export function requireUser(session: SnEditorSession | null | undefined): SessionUser {
  if (!session?.user?.id || !session.user.email) {
    throw new UnauthorizedError();
  }
  return session.user;
}
