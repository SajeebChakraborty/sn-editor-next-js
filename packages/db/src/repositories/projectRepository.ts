/**
 * @fileoverview Project collection repository — basic CRUD.
 */

import { Project, type ProjectDocument } from '../models/Project';
import { createOne, deleteById, findById, findMany, updateById } from './helpers';

export const projectRepository = {
  create: (data: Partial<ProjectDocument>) => createOne(Project, data),
  findById: (id: string) => findById(Project, id),
  listByOwner: (ownerId: string) => findMany(Project, { ownerId }),
  update: (id: string, update: Partial<ProjectDocument>) => updateById(Project, id, update),
  delete: (id: string) => deleteById(Project, id),
};
