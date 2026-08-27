/**
 * @fileoverview Auth.js / NextAuth session type stubs for SN Editor.
 * The real Auth.js config will live in `apps/web`; this package shares types + guards.
 */

export type UserRole = 'user' | 'admin';
export type UserPlan = 'free' | 'premium';

/** Authenticated SN Editor user embedded in the session. */
export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role?: UserRole;
  plan?: UserPlan;
}

/** Minimal session shape compatible with Auth.js `Session`. */
export interface SnEditorSession {
  user: SessionUser;
  expires: string;
}

/**
 * Module augmentation hint for Auth.js — apps should mirror these fields
 * when wiring `next-auth` / `@auth/core` callbacks.
 */
export type AuthSession = SnEditorSession;
