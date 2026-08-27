/**
 * Built-in Uploads-library samples as inline data URLs.
 * Avoids missing /public/demo files that showed as broken thumbnails.
 */
import type { AssetRef } from '@sn-editor/editor-core';

function svgUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const PRODUCT = svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360" viewBox="0 0 240 360">
  <rect width="240" height="360" fill="#f4f7f8"/>
  <rect x="88" y="28" width="64" height="40" rx="10" fill="#0f766e"/>
  <rect x="72" y="68" width="96" height="22" rx="6" fill="#134e4a"/>
  <rect x="64" y="90" width="112" height="230" rx="36" fill="#0f766e"/>
  <ellipse cx="120" cy="150" rx="32" ry="18" fill="#99f6e4" opacity="0.45"/>
  <text x="120" y="220" text-anchor="middle" font-family="Georgia, serif" font-size="22" font-weight="700" fill="#ecfdf5">SN Editor</text>
</svg>`);

const MARK = svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <rect width="96" height="96" rx="22" fill="#7c3aed"/>
  <path d="M28 62V34h12.5c8.2 0 13.2 4.2 13.2 11.2 0 7.1-5 11.3-13.2 11.3H40v5.5H28zm12-16.8c3.2 0 5-1.6 5-4.4s-1.8-4.3-5-4.3H40v8.7h0zM58 62V34h18v9.2H69.2V62H58z" fill="#ffffff"/>
</svg>`);

const STAR = svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="#f59e0b" stroke="#b45309" stroke-width="1.4" stroke-linejoin="round">
  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
</svg>`);

const REEL = svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
  <rect width="320" height="180" rx="16" fill="#0a1214"/>
  <rect x="18" y="18" width="284" height="144" rx="10" fill="#1e293b"/>
  <polygon points="132,58 132,122 198,90" fill="#f8fafc"/>
</svg>`);

export const DEMO_LIBRARY_ASSETS: AssetRef[] = [
  { id: 'asset_img_1', kind: 'image', name: 'Product Bottle', urlOrKey: PRODUCT },
  { id: 'asset_logo_1', kind: 'logo', name: 'Brand Mark', urlOrKey: MARK },
  { id: 'asset_icon_1', kind: 'icon', name: 'Star Icon', urlOrKey: STAR },
  { id: 'asset_vid_1', kind: 'image', name: 'Hero Reel', urlOrKey: REEL },
  { id: 'asset_music_1', kind: 'music', name: 'Upbeat Bed', urlOrKey: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=' },
];

/** URLs the browser can actually paint (not the old local:// placeholders). */
export function isRenderableAssetUrl(url: string | undefined): boolean {
  if (!url) return false;
  if (url.startsWith('local://')) return false;
  return (
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('/')
  );
}
