/**
 * @fileoverview BrandKit collection repository — basic CRUD.
 */

import { BrandKit, type BrandKitDocument } from '../models/BrandKit';
import { createOne, deleteById, findById, findMany, updateById } from './helpers';

export const brandKitRepository = {
  create: (data: Partial<BrandKitDocument>) => createOne(BrandKit, data),
  findById: (id: string) => findById(BrandKit, id),
  listByOwner: (ownerId: string) => findMany(BrandKit, { ownerId }),
  update: (id: string, update: Partial<BrandKitDocument>) => updateById(BrandKit, id, update),
  delete: (id: string) => deleteById(BrandKit, id),
};
