/**
 * Shared Text-panel presets for image + video editors (Canva-style Text tab).
 */

/** 28 Google + system fonts for Canva-parity dropdown. */
export const TEXT_FONTS = [
  'Inter',
  'Source Sans 3',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Raleway',
  'Nunito',
  'Oswald',
  'Merriweather',
  'Playfair Display',
  'Fraunces',
  'PT Serif',
  'Libre Baskerville',
  'DM Sans',
  'Space Grotesk',
  'Work Sans',
  'Rubik',
  'Manrope',
  'Josefin Sans',
  'Bebas Neue',
  'Pacifico',
  'Lobster',
  'Georgia',
  'Arial',
  'Times New Roman',
  'Courier New',
] as const;

/** Google Fonts CSS URL for web loading. */
export const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,400;0,700;1,400&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;1,9..144,400&family=Inter:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Josefin+Sans:ital,wght@0,400;0,700;1,400&family=Lato:ital,wght@0,400;0,700;1,400&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Lobster&family=Manrope:wght@400;600;700&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Montserrat:ital,wght@0,400;0,600;0,700;1,400&family=Nunito:ital,wght@0,400;0,700;1,400&family=Open+Sans:ital,wght@0,400;0,600;0,700;1,400&family=Oswald:wght@400;600&family=PT+Serif:ital,wght@0,400;0,700;1,400&family=Pacifico&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Poppins:ital,wght@0,400;0,600;0,700;1,400&family=Raleway:ital,wght@0,400;0,600;0,700;1,400&family=Roboto:ital,wght@0,400;0,500;0,700;1,400&family=Rubik:ital,wght@0,400;0,600;1,400&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&family=Space+Grotesk:wght@400;600;700&family=Work+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap';

export interface FontCombination {
  id: string;
  name: string;
  displayFont: string;
  bodyFont: string;
  tags: string[];
}

/** Local “Apps” / font combination packs (not third-party marketplace). */
export const FONT_COMBINATIONS: FontCombination[] = [
  {
    id: 'typecraft',
    name: 'TypeCraft',
    displayFont: 'Playfair Display',
    bodyFont: 'Source Sans 3',
    tags: ['elegant', 'serif', 'editorial'],
  },
  {
    id: 'bold-stack',
    name: 'Bold Stack',
    displayFont: 'Inter',
    bodyFont: 'Source Sans 3',
    tags: ['modern', 'sans', 'clean'],
  },
  {
    id: 'soft-story',
    name: 'Soft Story',
    displayFont: 'Fraunces',
    bodyFont: 'Merriweather',
    tags: ['warm', 'story', 'serif'],
  },
  {
    id: 'tech-brief',
    name: 'Tech Brief',
    displayFont: 'Space Grotesk',
    bodyFont: 'DM Sans',
    tags: ['tech', 'product', 'ui'],
  },
  {
    id: 'classic-pair',
    name: 'Classic Pair',
    displayFont: 'Libre Baskerville',
    bodyFont: 'Lato',
    tags: ['classic', 'print'],
  },
  {
    id: 'promo-pop',
    name: 'Promo Pop',
    displayFont: 'Bebas Neue',
    bodyFont: 'Poppins',
    tags: ['promo', 'fun', 'ads'],
  },
];

export type TextPresetRole = 'heading' | 'subheading' | 'body' | 'textbox';

export const TEXT_PRESET_STYLES: Record<
  TextPresetRole,
  { fontSize: number; fontWeight: number; fontFamily: string }
> = {
  heading: { fontSize: 48, fontWeight: 700, fontFamily: 'Inter' },
  subheading: { fontSize: 28, fontWeight: 500, fontFamily: 'Inter' },
  body: { fontSize: 18, fontWeight: 400, fontFamily: 'Source Sans 3' },
  textbox: { fontSize: 18, fontWeight: 400, fontFamily: 'Source Sans 3' },
};

export const TEXT_PRESET_COPY: Record<TextPresetRole, string> = {
  heading: 'Add a heading',
  subheading: 'Add a subheading',
  body: 'Add a little bit of body text',
  textbox: 'Text',
};

/** Client-side Magic Write stub — template copy from a short prompt. */
export function magicWriteStub(
  prompt: string,
  kind: 'headline' | 'body' | 'cta' = 'headline',
): string {
  const topic = prompt.trim() || 'your brand';
  if (kind === 'cta') return `Shop ${topic} today`;
  if (kind === 'body') {
    return `Discover ${topic} — crafted for clarity, built for results. Tell your story in a few short lines.`;
  }
  return `${topic.charAt(0).toUpperCase()}${topic.slice(1)} that stands out`;
}

export function filterFonts(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...TEXT_FONTS];
  return TEXT_FONTS.filter((f) => f.toLowerCase().includes(q));
}

export function filterCombinations(query: string, expanded: boolean): FontCombination[] {
  const list = expanded ? FONT_COMBINATIONS : FONT_COMBINATIONS.slice(0, 3);
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return FONT_COMBINATIONS.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.displayFont.toLowerCase().includes(q) ||
      c.bodyFont.toLowerCase().includes(q) ||
      c.tags.some((t) => t.includes(q)),
  );
}

/** Apply textCase for display without mutating stored string. */
export function applyTextCase(
  text: string,
  textCase?: 'none' | 'uppercase' | 'lowercase' | 'capitalize',
): string {
  if (!textCase || textCase === 'none') return text;
  if (textCase === 'uppercase') return text.toUpperCase();
  if (textCase === 'lowercase') return text.toLowerCase();
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Prefix lines with bullets or numbers (render-time only). */
export function applyListStyle(
  text: string,
  listStyle?: 'none' | 'bullet' | 'number',
): string {
  if (!listStyle || listStyle === 'none') return text;
  return text
    .split('\n')
    .map((line, i) => {
      const t = line.replace(/^([•\-*]|\d+\.)\s+/, '');
      if (listStyle === 'bullet') return `• ${t}`;
      return `${i + 1}. ${t}`;
    })
    .join('\n');
}

/** Compose display text: case then list prefixes. */
export function formatDisplayText(
  text: string,
  opts?: {
    textCase?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    listStyle?: 'none' | 'bullet' | 'number';
  },
): string {
  return applyListStyle(applyTextCase(text, opts?.textCase), opts?.listStyle);
}

/** Compose Konva fontStyle from weight + italic. */
export function konvaFontStyle(
  fontWeight: number | string | undefined,
  fontStyle?: 'normal' | 'italic',
): string {
  const bold = Number(fontWeight) >= 600 || fontWeight === 'bold';
  const italic = fontStyle === 'italic';
  if (bold && italic) return 'italic bold';
  if (italic) return 'italic';
  if (bold) return 'bold';
  return 'normal';
}
