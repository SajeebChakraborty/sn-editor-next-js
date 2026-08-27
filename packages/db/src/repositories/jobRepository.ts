/**
 * @fileoverview Job collection repository — CRUD + idempotency lookup.
 */

import { Job, type JobDocument } from '../models/Job';
import { createOne, deleteById, findById, findMany, updateById } from './helpers';

export const jobRepository = {
  create: (data: Partial<JobDocument>) => createOne(Job, data),
  findById: (id: string) => findById(Job, id),
  findByIdempotencyKey: (idempotencyKey: string) => Job.findOne({ idempotencyKey }).exec(),
  listByOwner: (ownerId: string) => findMany(Job, { ownerId }),
  update: (id: string, update: Partial<JobDocument>) => updateById(Job, id, update),
  delete: (id: string) => deleteById(Job, id),
};
