/**
 * JSON file persistence when MongoDB is not configured.
 * File: <cwd>/data/sn-editor.json (typically apps/web/data).
 */

import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_SETTINGS, type AccountUser, type AppSettings, type BillingPlan } from './types';

export interface FileDb {
  users: AccountUser[];
  plans: BillingPlan[];
  settings: AppSettings;
}

const EMPTY: FileDb = { users: [], plans: [], settings: { ...DEFAULT_SETTINGS } };

let writeChain: Promise<void> = Promise.resolve();

function filePath(): string {
  return path.join(process.cwd(), 'data', 'sn-editor.json');
}

function ensureDir(): void {
  const dir = path.dirname(filePath());
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readFileDb(): FileDb {
  try {
    const raw = fs.readFileSync(filePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<FileDb>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      plans: Array.isArray(parsed.plans) ? parsed.plans : [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
  } catch {
    return { users: [], plans: [], settings: { ...DEFAULT_SETTINGS } };
  }
}

function persist(db: FileDb): void {
  ensureDir();
  fs.writeFileSync(filePath(), JSON.stringify(db, null, 2), 'utf8');
}

export function writeFileDb(next: FileDb): Promise<void> {
  writeChain = writeChain.then(() => {
    persist(next);
  });
  return writeChain;
}

export function mutateFileDb(mutator: (db: FileDb) => void): FileDb {
  const db = readFileDb();
  mutator(db);
  persist(db);
  return db;
}

export { EMPTY as EMPTY_FILE_DB };
