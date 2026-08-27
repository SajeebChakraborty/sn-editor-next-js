/**
 * @fileoverview Singleton app settings repository.
 */

import { AppSettings, type AppSettingsDocument } from '../models/AppSettings';

export const settingsRepository = {
  async get(): Promise<AppSettingsDocument | null> {
    return AppSettings.findOne().exec();
  },
  async upsert(update: Partial<AppSettingsDocument>): Promise<AppSettingsDocument> {
    const existing = await AppSettings.findOne().exec();
    if (existing) {
      Object.assign(existing, update);
      await existing.save();
      return existing;
    }
    return AppSettings.create(update);
  },
};
