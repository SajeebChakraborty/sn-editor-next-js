/**
 * @fileoverview Asset collection repository — basic CRUD.
 */

import { Asset, type AssetDocument } from '../models/Asset';
import { createOne, deleteById, findById, findMany, updateById } from './helpers';

export const assetRepository = {
  create: (data: Partial<AssetDocument>) => createOne(Asset, data),
  findById: (id: string) => findById(Asset, id),
  listByOwner: (ownerId: string) => findMany(Asset, { ownerId }),
  update: (id: string, update: Partial<AssetDocument>) => updateById(Asset, id, update),
  delete: (id: string) => deleteById(Asset, id),
};
