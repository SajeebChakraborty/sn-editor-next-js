/**
 * @fileoverview Template collection repository — basic CRUD + published list.
 */

import { Template, type TemplateDocument } from '../models/Template';
import { createOne, deleteById, findById, findMany, updateById } from './helpers';

export const templateRepository = {
  create: (data: Partial<TemplateDocument>) => createOne(Template, data),
  findById: (id: string) => findById(Template, id),
  listPublished: () => findMany(Template, { published: true }),
  listByChannel: (channel: string) => findMany(Template, { channel, published: true }),
  update: (id: string, update: Partial<TemplateDocument>) => updateById(Template, id, update),
  delete: (id: string) => deleteById(Template, id),
};
