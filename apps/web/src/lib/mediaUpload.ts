/**
 * Client-side media upload helpers.
 * Large videos (hours / multi-GB) use blob: URLs — never data URLs.
 */

export type UploadableKind = 'image' | 'video' | 'logo' | 'music' | 'icon';

export interface LocalUpload {
  name: string;
  kind: UploadableKind;
  mimeType: string;
  /** Object URL or data URL usable in <img>/<video>/Konva */
  url: string;
  width?: number;
  height?: number;
  durationMs?: number;
  /** Original file size in bytes (for large-media UX). */
  sizeBytes?: number;
}

/** Soft warning threshold — still supported via blob URL. */
export const LARGE_FILE_BYTES = 500 * 1024 * 1024; // 500 MB
export const HUGE_FILE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

function kindFromMime(mime: string, fallback: UploadableKind): UploadableKind {
  if (mime.startsWith('image/')) return fallback === 'logo' || fallback === 'icon' ? fallback : 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'music';
  return fallback;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function revokeUploadUrl(url: string): void {
  if (url.startsWith('blob:')) URL.revokeObjectURL(url);
}

/** Read natural size of an image URL. */
export function loadImageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

/** Read video frame size from a media URL. */
export function loadVideoSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      video.removeAttribute('src');
      video.load();
      resolve({ width, height });
    };
    video.onerror = () => reject(new Error('Failed to load video metadata'));
    video.src = url;
  });
}

/**
 * Read duration of a video/audio file URL.
 * Works for long files (1–2h+) because only metadata is loaded.
 */
export function loadMediaDurationMs(url: string): Promise<number> {
  return new Promise((resolve) => {
    const el = document.createElement('video');
    el.preload = 'metadata';
    const finish = (ms: number) => {
      el.removeAttribute('src');
      el.load();
      resolve(ms);
    };
    el.onloadedmetadata = () => {
      const ms = Number.isFinite(el.duration) ? Math.round(el.duration * 1000) : 5000;
      finish(Math.max(1, ms));
    };
    el.onerror = () => finish(5000);
    // Some browsers need a short timeout fallback for odd containers
    const t = window.setTimeout(() => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        finish(Math.round(el.duration * 1000));
      }
    }, 15_000);
    el.addEventListener(
      'loadedmetadata',
      () => window.clearTimeout(t),
      { once: true },
    );
    el.src = url;
  });
}

const IMAGE_DATA_URL_MAX_BYTES = 12 * 1024 * 1024;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Turn a File into a LocalUpload.
 * Images/logos become data URLs so library thumbs and the canvas survive refresh.
 * Large videos stay as blob URLs — never read the whole file into memory as base64.
 */
export async function fileToLocalUpload(
  file: File,
  preferredKind?: UploadableKind,
): Promise<LocalUpload> {
  const kind = kindFromMime(file.type, preferredKind ?? 'image');
  const useDataUrl =
    (kind === 'image' || kind === 'logo' || kind === 'icon') &&
    file.size <= IMAGE_DATA_URL_MAX_BYTES;
  const url = useDataUrl ? await fileToDataUrl(file) : URL.createObjectURL(file);
  const base: LocalUpload = {
    name: file.name.replace(/\.[^.]+$/, '') || file.name,
    kind,
    mimeType: file.type || 'application/octet-stream',
    url,
    sizeBytes: file.size,
  };

  if (kind === 'image' || kind === 'logo' || kind === 'icon') {
    try {
      const size = await loadImageSize(url);
      const max = 640;
      const scale = Math.min(1, max / Math.max(size.width, size.height));
      return {
        ...base,
        width: Math.round(size.width * scale),
        height: Math.round(size.height * scale),
      };
    } catch {
      return { ...base, width: 400, height: 300 };
    }
  }

  if (kind === 'video' || kind === 'music') {
    const durationMs = await loadMediaDurationMs(url);
    let width = 480;
    let height = 854;
    if (kind === 'video') {
      try {
        const size = await loadVideoSize(url);
        width = size.width || width;
        height = size.height || height;
      } catch {
        /* keep defaults */
      }
    }
    return { ...base, durationMs, width, height };
  }

  return base;
}

/** Open a hidden file input and resolve with selected files. */
export function pickFiles(options: {
  accept: string;
  multiple?: boolean;
}): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = options.accept;
    input.multiple = Boolean(options.multiple);
    input.style.display = 'none';
    const cleanup = () => {
      input.remove();
    };
    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      cleanup();
      resolve(files);
    };
    input.oncancel = () => {
      cleanup();
      resolve([]);
    };
    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Persist asset metadata to API. Skips body for huge local blob URLs
 * (S3 multipart upload is the production path for 5GB+ files).
 */
export async function persistAssetToApi(upload: LocalUpload): Promise<void> {
  const huge = (upload.sizeBytes ?? 0) >= LARGE_FILE_BYTES;
  if (huge && upload.url.startsWith('blob:')) {
    // Local-only for now — do not POST multi-GB blobs to the demo API
    return;
  }
  if (upload.url.startsWith('blob:')) {
    // Blob URLs are tab-local — posting local:// made thumbs and canvas images break.
    return;
  }
  try {
    await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: upload.kind,
        name: upload.name,
        urlOrKey: upload.url,
        sizeBytes: upload.sizeBytes,
        durationMs: upload.durationMs,
      }),
    });
  } catch {
    // Local insert still works if API is down
  }
}
