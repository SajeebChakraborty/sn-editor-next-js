/**
 * Process-local in-memory stores for demo API routes when Redis/Mongo are offline.
 */
import type { DesignDocument, BrandKit, AssetRef } from '@sn-editor/editor-core';
import type { JobStatus } from '@sn-editor/ai-contracts';
import { createId } from '@sn-editor/shared';

export interface StoredJob {
  id: string;
  type: string;
  status: JobStatus;
  progress: number;
  input?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

const g = globalThis as typeof globalThis & {
  __snEditorJobs?: Map<string, StoredJob>;
  __snEditorProjects?: Map<string, DesignDocument>;
  __snEditorBrandKits?: Map<string, BrandKit>;
  __snEditorAssets?: Map<string, AssetRef>;
};

export const jobStore = g.__snEditorJobs ?? (g.__snEditorJobs = new Map());
export const projectStore = g.__snEditorProjects ?? (g.__snEditorProjects = new Map());
export const brandKitStore = g.__snEditorBrandKits ?? (g.__snEditorBrandKits = new Map());
export const assetStore = g.__snEditorAssets ?? (g.__snEditorAssets = new Map());

export function newJobId(): string {
  return createId('job');
}
