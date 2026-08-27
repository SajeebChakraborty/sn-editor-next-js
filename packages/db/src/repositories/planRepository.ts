/**
 * @fileoverview Billing plan repository.
 */

import { Plan, type PlanDocument } from '../models/Plan';
import { createOne, deleteById, findById, findMany, updateById } from './helpers';

export const planRepository = {
  create: (data: Partial<PlanDocument>) => createOne(Plan, data),
  findById: (id: string) => findById(Plan, id),
  list: (filter?: Record<string, unknown>) => findMany(Plan, filter ?? {}, 200),
  update: (id: string, update: Partial<PlanDocument>) => updateById(Plan, id, update),
  delete: (id: string) => deleteById(Plan, id),
};
