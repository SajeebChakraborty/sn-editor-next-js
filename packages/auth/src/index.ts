/**
 * @fileoverview `@sn-editor/auth` public API — Auth.js session types and route guards.
 * Non-goals: full Auth.js provider config (that belongs in `apps/web`).
 */

export type { SessionUser, SnEditorSession, AuthSession, UserRole, UserPlan } from './session';
export { requireUser, UnauthorizedError } from './requireUser';
/** // STUB: phase-1 — local/dev session helpers until Auth.js is wired */
export { getDevSession, assertOwner, assertAuthenticated } from './devSession';
