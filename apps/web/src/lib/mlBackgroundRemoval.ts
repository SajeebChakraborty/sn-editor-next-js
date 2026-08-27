import { createTimedProgress } from '@/lib/processProgress';

export type BgProgressHandler = (message: string) => void;

const MODEL_PUBLIC_PATH =
  'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/';

let removeBackgroundFn:
  | typeof import('@imgly/background-removal').removeBackground
  | null = null;

let warmPromise: Promise<void> | null = null;

async function loadRemoveBackground() {
  if (removeBackgroundFn) return removeBackgroundFn;
  const mod = await import('@imgly/background-removal');
  removeBackgroundFn = mod.removeBackground;
  return removeBackgroundFn;
}

/** Prefetch the AI model so the first remove/replace feels faster. */
export function warmBackgroundRemoval(onProgress?: BgProgressHandler): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (removeBackgroundFn) {
    onProgress?.('AI model ready');
    return Promise.resolve();
  }
  if (!warmPromise) {
    warmPromise = (async () => {
      onProgress?.('Warming up AI model…');
      await loadRemoveBackground();
      // Tiny 1×1 PNG to trigger model download + init
      const tiny =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      const res = await fetch(tiny);
      const blob = await res.blob();
      const removeBackground = await loadRemoveBackground();
      await removeBackground(blob, {
        publicPath: MODEL_PUBLIC_PATH,
        model: 'isnet_fp16',
        device: 'cpu',
        proxyToWorker: false,
        output: { format: 'image/png', quality: 0.5 },
        progress: (key, current, total) => {
          const pct = total > 0 ? Math.round((current / total) * 100) : 0;
          const label = key.split('/').pop() ?? key;
          onProgress?.(`Downloading AI · ${label} ${pct}%`);
        },
      });
      onProgress?.('AI model ready');
    })().catch(() => {
      warmPromise = null;
    });
  }
  return warmPromise ?? Promise.resolve();
}

async function srcToBlob(src: string): Promise<Blob> {
  const res = await fetch(src);
  if (!res.ok) {
    throw new Error('Could not read image for background removal');
  }
  return res.blob();
}

export async function mlCutoutPng(src: string, onProgress?: BgProgressHandler): Promise<Blob> {
  if (typeof window === 'undefined') {
    throw new Error('Background removal only runs in the browser');
  }

  const { report } = createTimedProgress(onProgress);
  report('Loading AI model… first run can take 1–2 min');
  const removeBackground = await loadRemoveBackground();
  const input = await srcToBlob(src);

  report('Cutting out the subject…');
  const result = await removeBackground(input, {
    publicPath: MODEL_PUBLIC_PATH,
    model: 'isnet_fp16',
    device: 'cpu',
    proxyToWorker: false,
    output: { format: 'image/png', quality: 1 },
    progress: (key, current, total) => {
      const pct = total > 0 ? Math.round((current / total) * 100) : 0;
      const label = key.split('/').pop() ?? key;
      report(`Downloading AI · ${label} ${pct}%`);
    },
  });
  report('Background removed');
  return result;
}
