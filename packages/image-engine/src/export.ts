import type { DesignDocument } from '@sn-editor/editor-core';

export type ImageExportFormat = 'png' | 'jpeg' | 'webp';

export interface ImageExportRequest {
  document: DesignDocument;
  artboardId: string;
  format: ImageExportFormat;
  quality?: number;
  /** When true, prefer server Sharp worker for large boards. */
  preferWorker?: boolean;
}

/**
 * Decide client vs worker export. Client handles small artboards; workers handle large.
 */
export function shouldUseExportWorker(
  width: number,
  height: number,
  preferWorker?: boolean,
): boolean {
  if (preferWorker) return true;
  return width * height > 4_000_000;
}
