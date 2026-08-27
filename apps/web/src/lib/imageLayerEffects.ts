/**
 * Canvas pixel ops for image layers (remove/replace BG, filters, etc.).
 * Works on blob:/data:/http(s) image URLs loaded into the browser.
 */
'use client';

export function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // crossOrigin on blob:/data: can break decode in some browsers
    if (!src.startsWith('blob:') && !src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      if (!img.naturalWidth) {
        reject(new Error('Image decoded with zero size'));
        return;
      }
      resolve(img);
    };
    img.onerror = () => reject(new Error('Could not load image for AI processing'));
    img.src = src;
  });
}

export function canvasToBlobUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to encode image'));
          return;
        }
        resolve(URL.createObjectURL(blob));
      },
      'image/png',
      1,
    );
  });
}

function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function saturation(r: number, g: number, b: number): number {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function sampleCornerAverage(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): { r: number; g: number; b: number; opaque: number; lum: number } {
  const regions: Array<[number, number]> = [
    [2, 2],
    [Math.max(0, w - 12), 2],
    [2, Math.max(0, h - 12)],
    [Math.max(0, w - 12), Math.max(0, h - 12)],
  ];
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const size = 12;
  for (const [sx, sy] of regions) {
    for (let y = sy; y < Math.min(h, sy + size); y++) {
      for (let x = sx; x < Math.min(w, sx + size); x++) {
        const i = (y * w + x) * 4;
        if (data[i + 3]! < 128) continue;
        r += data[i]!;
        g += data[i + 1]!;
        b += data[i + 2]!;
        n++;
      }
    }
  }
  if (n === 0) return { r: 255, g: 255, b: 255, opaque: 0, lum: 255 };
  r /= n;
  g /= n;
  b /= n;
  return { r, g, b, opaque: n, lum: luminance(r, g, b) };
}

function chromaDist(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
): number {
  const y1 = luminance(r1, g1, b1);
  const y2 = luminance(r2, g2, b2);
  return Math.hypot(b1 - y1 - (b2 - y2), r1 - y1 - (r2 - y2)) * 1.4 + Math.abs(y1 - y2) * 0.35;
}

function looksLikeSkin(r: number, g: number, b: number): boolean {
  const y = luminance(r, g, b);
  if (y < 55 || y > 242) return false;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return cr > 133 && cr < 178 && cb > 77 && cb < 132 && r > g && r >= b - 8;
}

function sampleBorderBackground(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): { r: number; g: number; b: number; opaque: number; lum: number } {
  const corners = sampleCornerAverage(data, w, h);
  const band = Math.max(2, Math.round(Math.min(w, h) * 0.015));
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  const take = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    if (data[i + 3]! < 128) return;
    if (looksLikeSkin(data[i]!, data[i + 1]!, data[i + 2]!)) return;
    rs.push(data[i]!);
    gs.push(data[i + 1]!);
    bs.push(data[i + 2]!);
  };
  for (let x = 0; x < w; x++) {
    for (let t = 0; t < band; t++) {
      take(x, t);
      take(x, h - 1 - t);
    }
  }
  for (let y = band; y < h - band; y++) {
    for (let t = 0; t < band; t++) {
      take(t, y);
      take(w - 1 - t, y);
    }
  }
  if (rs.length < 8) return corners;
  const mid = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[sorted.length >> 1] ?? 255;
  };
  const r = mid(rs);
  const g = mid(gs);
  const b = mid(bs);
  return { r, g, b, opaque: rs.length, lum: luminance(r, g, b) };
}

function isLikelyBackground(
  r: number,
  g: number,
  b: number,
  a: number,
  bg: { r: number; g: number; b: number; lum: number },
  hard: number,
): boolean {
  if (a < 10) return true;
  if (looksLikeSkin(r, g, b)) return false;
  const chroma = chromaDist(r, g, b, bg.r, bg.g, bg.b);
  const rgb = colorDist(r, g, b, bg.r, bg.g, bg.b);
  if (chroma <= hard || rgb <= hard * 0.9) return true;
  const lum = luminance(r, g, b);
  const sat = saturation(r, g, b);
  // Studio paper only when it also matches the sampled backdrop
  if (bg.lum >= 200 && lum >= 238 && sat <= 18 && rgb < hard * 2.2) return true;
  if (bg.lum <= 36 && lum <= 26 && chroma < hard * 1.5) return true;
  return false;
}

function featherAlpha(imageData: ImageData, radius = 1): ImageData {
  const { data, width: w, height: h } = imageData;
  const src = new Uint8ClampedArray(data);
  const r = Math.max(1, radius);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          sum += src[(yy * w + xx) * 4 + 3]!;
          n++;
        }
      }
      data[(y * w + x) * 4 + 3] = Math.round(sum / n);
    }
  }
  return imageData;
}

function despillFringe(
  imageData: ImageData,
  bg: { r: number; g: number; b: number },
): ImageData {
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]! / 255;
    if (a <= 0.02 || a >= 0.96) continue;
    const t = 1 - a;
    data[i] = Math.max(0, Math.min(255, (data[i]! - bg.r * t) / a));
    data[i + 1] = Math.max(0, Math.min(255, (data[i + 1]! - bg.g * t) / a));
    data[i + 2] = Math.max(0, Math.min(255, (data[i + 2]! - bg.b * t) / a));
  }
  return imageData;
}

/**
 * Edge-connected chroma key. Protects skin and does not punch holes in the subject.
 */
export function floodClearEdges(imageData: ImageData, threshold = 34): ImageData {
  const { data, width: w, height: h } = imageData;
  const bg = sampleBorderBackground(data, w, h);
  if (bg.opaque < 4) return imageData;
  const hard = bg.lum >= 210 ? Math.max(threshold, 38) : threshold;

  const visited = new Uint8Array(w * h);
  const queue: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    const i = idx * 4;
    if (!isLikelyBackground(data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!, bg, hard)) return;
    visited[idx] = 1;
    queue.push(idx);
  };

  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }

  while (queue.length) {
    const idx = queue.pop()!;
    data[idx * 4 + 3] = 0;
    const x = idx % w;
    const y = (idx / w) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  return imageData;
}

/** Soft matte only on pixels that already touch transparency (no interior holes). */
export function matteOutBackground(imageData: ImageData, threshold = 30): ImageData {
  const { data, width: w, height: h } = imageData;
  const bg = sampleBorderBackground(data, w, h);
  if (bg.opaque < 4) return imageData;
  const hard = threshold;
  const soft = hard * 1.7;
  const near = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3]! >= 16) continue;
      for (let dy = -2; dy <= 2; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -2; dx <= 2; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          near[yy * w + xx] = 1;
        }
      }
    }
  }

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    if (!near[p] || data[i + 3] === 0) continue;
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    if (looksLikeSkin(r, g, b)) continue;
    const d = chromaDist(r, g, b, bg.r, bg.g, bg.b);
    if (d < hard) {
      data[i + 3] = 0;
    } else if (d < soft) {
      const t = (d - hard) / (soft - hard);
      data[i + 3] = Math.round(data[i + 3]! * Math.max(0, Math.min(1, t)));
    }
  }
  return imageData;
}

function clearHaloFringe(imageData: ImageData): ImageData {
  const { data, width: w, height: h } = imageData;
  const near = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3]! >= 24) continue;
      for (let dy = -3; dy <= 3; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -3; dx <= 3; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          near[yy * w + xx] = 1;
        }
      }
    }
  }
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    if (!near[p] || data[i + 3] === 0) continue;
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    if (looksLikeSkin(r, g, b)) continue;
    const lum = luminance(r, g, b);
    const sat = saturation(r, g, b);
    if (lum >= 210 && sat <= 36) data[i + 3] = 0;
  }
  return imageData;
}

function cutOutSubject(imageData: ImageData): ImageData {
  const bg = sampleBorderBackground(imageData.data, imageData.width, imageData.height);
  let data = floodClearEdges(imageData, 32);
  data = matteOutBackground(data, 28);
  data = floodClearEdges(data, 36);
  data = clearHaloFringe(data);
  data = featherAlpha(data, 1);
  data = despillFringe(data, bg);
  return data;
}

export async function removeImageBackground(
  src: string,
  onProgress?: (message: string) => void,
): Promise<string> {
  const { mlCutoutPng } = await import('@/lib/mlBackgroundRemoval');
  const blob = await mlCutoutPng(src, onProgress);
  return URL.createObjectURL(blob);
}

export type ReplaceBgStyle = {
  id: string;
  label: string;
  color: string;
  accent?: string;
};

/** High-contrast scenes first so the swap is obvious on white studio photos. */
export const REPLACE_BG_SCENES: ReplaceBgStyle[] = [
  { id: 'teal', label: 'Teal', color: '#0f766e', accent: '#14b8a6' },
  { id: 'dark', label: 'Dark', color: '#0a1214', accent: '#1e3a45' },
  { id: 'sunset', label: 'Sunset', color: '#ea580c', accent: '#f472b6' },
  { id: 'sky', label: 'Sky', color: '#0284c7', accent: '#7dd3fc' },
  { id: 'blush', label: 'Blush', color: '#db2777', accent: '#f9a8d4' },
  { id: 'lavender', label: 'Lavender', color: '#6d28d9', accent: '#c4b5fd' },
  { id: 'mint', label: 'Mint', color: '#15803d', accent: '#86efac' },
  { id: 'cream', label: 'Cream', color: '#fef3c7', accent: '#fde68a' },
  { id: 'studio', label: 'Studio', color: '#94a3b8', accent: '#e2e8f0' },
  { id: 'white', label: 'White', color: '#f8fafc', accent: '#e2e8f0' },
];

export const REPLACE_BG_PALETTE = REPLACE_BG_SCENES.map((s) => s.color);

function paintSceneBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: ReplaceBgStyle,
): void {
  const accent = scene.accent ?? scene.color;
  const g = ctx.createLinearGradient(0, 0, width * 0.15, height);
  g.addColorStop(0, accent);
  g.addColorStop(0.5, scene.color);
  g.addColorStop(1, accent);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  const spot = ctx.createRadialGradient(
    width * 0.5,
    height * 0.32,
    Math.min(width, height) * 0.06,
    width * 0.5,
    height * 0.55,
    Math.max(width, height) * 0.75,
  );
  spot.addColorStop(0, 'rgba(255,255,255,0.28)');
  spot.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Cut out the subject and paint a new background INTO the image pixels.
 */
export async function replaceImageBackground(
  src: string,
  background: string | ReplaceBgStyle,
  onProgress?: (message: string) => void,
): Promise<string> {
  const scene: ReplaceBgStyle =
    typeof background === 'string'
      ? { id: 'custom', label: 'Custom', color: background, accent: background }
      : background;

  const { mlCutoutPng } = await import('@/lib/mlBackgroundRemoval');
  onProgress?.('Removing the current background…');
  const cutBlob = await mlCutoutPng(src, onProgress);
  const cutUrl = URL.createObjectURL(cutBlob);
  try {
    const cutImg = await loadHtmlImage(cutUrl);
    const width = cutImg.naturalWidth || cutImg.width;
    const height = cutImg.naturalHeight || cutImg.height;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    paintSceneBackground(ctx, width, height, scene);
    ctx.drawImage(cutImg, 0, 0);
    return canvasToBlobUrl(canvas);
  } finally {
    URL.revokeObjectURL(cutUrl);
  }
}

export async function applyCanvasFilter(src: string, filter: string): Promise<string> {
  const img = await loadHtmlImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.filter = filter;
  ctx.drawImage(img, 0, 0);
  ctx.filter = 'none';
  return canvasToBlobUrl(canvas);
}

export async function upscaleImage(src: string, factor = 1.25): Promise<string> {
  const img = await loadHtmlImage(src);
  const w = Math.round((img.naturalWidth || img.width) * factor);
  const h = Math.round((img.naturalHeight || img.height) * factor);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  return canvasToBlobUrl(canvas);
}

export async function expandImageEdges(src: string, pad = 48): Promise<string> {
  const img = await loadHtmlImage(src);
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const canvas = document.createElement('canvas');
  canvas.width = iw + pad * 2;
  canvas.height = ih + pad * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.filter = 'blur(18px)';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  ctx.filter = 'none';
  ctx.drawImage(img, pad, pad);
  return canvasToBlobUrl(canvas);
}

export async function smartCropImage(src: string, trim = 0.06): Promise<string> {
  const img = await loadHtmlImage(src);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const mx = Math.round(w * trim);
  const my = Math.round(h * trim);
  const cw = Math.max(1, w - mx * 2);
  const ch = Math.max(1, h - my * 2);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(img, mx, my, cw, ch, 0, 0, cw, ch);
  return canvasToBlobUrl(canvas);
}

export async function eraseCenterSoft(src: string): Promise<string> {
  const img = await loadHtmlImage(src);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(img, 0, 0);
  const cx = w / 2;
  const cy = h / 2;
  const rx = w * 0.22;
  const ry = h * 0.22;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(0.7, 'rgba(0,0,0,0.85)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return canvasToBlobUrl(canvas);
}

export async function addImageDropShadow(src: string): Promise<string> {
  const img = await loadHtmlImage(src);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const pad = 28;
  const canvas = document.createElement('canvas');
  canvas.width = w + pad * 2;
  canvas.height = h + pad * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetX = 6;
  ctx.shadowOffsetY = 12;
  ctx.drawImage(img, pad, pad);
  ctx.shadowColor = 'transparent';
  return canvasToBlobUrl(canvas);
}

export async function tintImage(src: string, hex: string, amount = 0.35): Promise<string> {
  const img = await loadHtmlImage(src);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = amount;
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  return canvasToBlobUrl(canvas);
}
