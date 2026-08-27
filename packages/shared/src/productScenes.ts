/** One-click product scene backgrounds for eCommerce Product Center. */
export const PRODUCT_SCENES = [
  'luxury',
  'white',
  'transparent',
  'wood_table',
  'studio',
  'kitchen',
  'beach',
  'dark_theme',
  'christmas',
  'eid',
  'black_friday',
] as const;

export type ProductScene = (typeof PRODUCT_SCENES)[number];

export const PRODUCT_SCENE_LABELS: Record<ProductScene, string> = {
  luxury: 'Luxury Background',
  white: 'White Background',
  transparent: 'Transparent',
  wood_table: 'Wood Table',
  studio: 'Studio',
  kitchen: 'Kitchen',
  beach: 'Beach',
  dark_theme: 'Dark Theme',
  christmas: 'Christmas',
  eid: 'Eid',
  black_friday: 'Black Friday',
};

export const PRODUCT_TYPES = ['bottle', 'shoe', 'phone', 'watch'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];
