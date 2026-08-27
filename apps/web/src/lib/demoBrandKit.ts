/**
 * Sample brand kit used by demos and BrandKitPanel.
 * Logos use inline SVG data URLs so they render without static files.
 */
import type { BrandKit } from '@sn-editor/editor-core';

const markSvg = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
    <rect width="96" height="96" rx="22" fill="#7c3aed"/>
    <path d="M28 62V34h12.5c8.2 0 13.2 4.2 13.2 11.2 0 7.1-5 11.3-13.2 11.3H40v5.5H28zm12-16.8c3.2 0 5-1.6 5-4.4s-1.8-4.3-5-4.3H40v8.7h0zM58 62V34h18v9.2H69.2V62H58z" fill="#ffffff"/>
  </svg>`,
);

const watermarkSvg = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 48" fill="none">
    <text x="0" y="34" font-family="Georgia, serif" font-size="28" font-weight="700" fill="#0f766e">SN Editor</text>
  </svg>`,
);

export const DEMO_BRAND_KIT: BrandKit = {
  id: 'brand_demo_sn_editor',
  name: 'SN Editor Demo',
  logos: [
    {
      id: 'logo_primary',
      kind: 'logo',
      name: 'SN Editor Mark',
      urlOrKey: `data:image/svg+xml,${markSvg}`,
    },
  ],
  colors: ['#0f766e', '#f4f7f8', '#0a1214', '#f59e0b', '#e11d48'],
  fonts: [{ family: 'Fraunces' }, { family: 'Source Sans 3' }],
  watermark: {
    id: 'wm_demo',
    kind: 'logo',
    name: 'Watermark',
    urlOrKey: `data:image/svg+xml,${watermarkSvg}`,
  },
  ctaStyles: [
    {
      id: 'cta_primary',
      label: 'Shop Now',
      fill: '#0f766e',
      textColor: '#ffffff',
      borderRadius: 10,
    },
    {
      id: 'cta_secondary',
      label: 'Learn More',
      fill: '#0a1214',
      textColor: '#f4f7f8',
      borderRadius: 999,
    },
  ],
};

/** Alternate kit so re-applying / switching brand is visibly different. */
export const ALT_BRAND_KIT: BrandKit = {
  id: 'brand_demo_ember',
  name: 'Ember Studio',
  logos: [
    {
      id: 'logo_ember',
      kind: 'logo',
      name: 'Ember Mark',
      urlOrKey: `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="#c2410c"/><circle cx="48" cy="48" r="22" fill="#ffedd5"/></svg>`,
      )}`,
    },
  ],
  colors: ['#c2410c', '#fff7ed', '#1c1917', '#ea580c', '#fbbf24'],
  fonts: [{ family: 'Fraunces' }, { family: 'Source Sans 3' }],
  ctaStyles: [
    {
      id: 'cta_ember',
      label: 'Buy Now',
      fill: '#c2410c',
      textColor: '#fff7ed',
      borderRadius: 8,
    },
  ],
};
