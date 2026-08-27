/**
 * @fileoverview User collection repository — basic CRUD.
 */

import { User, type UserDocument } from '../models/User';
import { createOne, deleteById, findById, findMany, updateById } from './helpers';

export const userRepository = {
  create: (data: Partial<UserDocument>) => createOne(User, data),
  findById: (id: string) => findById(User, id),
  findByEmail: (email: string) => User.findOne({ email }).exec(),
  list: (filter?: Record<string, unknown>) => findMany(User, filter ?? {}),
  update: (id: string, update: Partial<UserDocument>) => updateById(User, id, update),
  delete: (id: string) => deleteById(User, id),
};
