/**
 * @fileoverview `@sn-editor/db` public API — Mongo models, client, and repositories.
 * Domain logic should use repositories; apps should not poke schemas directly when avoidable.
 */

export { connectMongo, disconnectMongo } from './client';
export * from './models';
export * from './repositories';
