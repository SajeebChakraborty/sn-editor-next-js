/**
 * @fileoverview Generic CRUD helpers shared by collection repositories.
 */

import type { FilterQuery, Model, UpdateQuery } from 'mongoose';

/**
 * Create a document.
 * @param model - Mongoose model
 * @param data - Partial document payload
 */
export async function createOne<T>(
  model: Model<T>,
  data: Partial<T>,
): Promise<T> {
  return model.create(data as T);
}

/**
 * Find by Mongo `_id`.
 */
export async function findById<T>(model: Model<T>, id: string): Promise<T | null> {
  return model.findById(id).exec();
}

/**
 * Find many matching a filter (capped for safety).
 * @param limit - Max results (default 100)
 */
export async function findMany<T>(
  model: Model<T>,
  filter: FilterQuery<T> = {},
  limit = 100,
): Promise<T[]> {
  return model.find(filter).limit(limit).exec();
}

/**
 * Update by id; returns the updated document or null.
 */
export async function updateById<T>(
  model: Model<T>,
  id: string,
  update: UpdateQuery<T>,
): Promise<T | null> {
  return model.findByIdAndUpdate(id, update, { new: true }).exec();
}

/**
 * Soft-delete stub: currently hard-deletes. Prefer status flags later.
 */
export async function deleteById<T>(model: Model<T>, id: string): Promise<boolean> {
  // STUB: phase-1 — hard delete; soft-delete when recycle bin ships
  const result = await model.findByIdAndDelete(id).exec();
  return result != null;
}
