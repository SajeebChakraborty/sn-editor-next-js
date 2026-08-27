/**
 * Seed templates — real multi-layer layouts for every TEMPLATE_CHANNEL.
 */
import {
  createArtboard,
  createCtaLayer,
  createEmptyDocument,
  createHeadingLayer,
  createLayer,
  createSubheadingLayer,
  type DesignDocument,
  type LayerNode,
} from '@sn-editor/editor-core';
import {
  TEMPLATE_CHANNELS,
  TEMPLATE_CHANNEL_LABELS,
  TEMPLATE_SIZES,
  type TemplateChannel,
} from '@sn-editor/shared';

export interface SeedTemplate {
  id: string;
  channel: TemplateChannel;
  name: string;
  document: DesignDocument;
}

type Palette = {
  bg: string;
  accent: string;
  accent2: string;
  ink: string;
  muted: string;
  ctaBg: string;
  ctaText: string;
};

type LayoutSpec = {
  name: string;
  palette: Palette;
  heading: string;
  subheading: string;
  cta?: string;
  /** Layout variant key for positioning accents/text */
  variant: 'hero-left' | 'hero-center' | 'split' | 'bold-bar' | 'circle-pop' | 'diagonal';
};

const PALETTES: Palette[] = [
  {
    bg: '#0f172a',
    accent: '#38bdf8',
    accent2: '#818cf8',
    ink: '#f8fafc',
    muted: '#94a3b8',
    ctaBg: '#38bdf8',
    ctaText: '#0f172a',
  },
  {
    bg: '#fff7ed',
    accent: '#ea580c',
    accent2: '#fbbf24',
    ink: '#1c1917',
    muted: '#78716c',
    ctaBg: '#ea580c',
    ctaText: '#fff7ed',
  },
  {
    bg: '#ecfdf5',
    accent: '#059669',
    accent2: '#34d399',
    ink: '#064e3b',
    muted: '#047857',
    ctaBg: '#059669',
    ctaText: '#ecfdf5',
  },
  {
    bg: '#1a0a14',
    accent: '#f472b6',
    accent2: '#fb7185',
    ink: '#fdf2f8',
    muted: '#f9a8d4',
    ctaBg: '#f472b6',
    ctaText: '#1a0a14',
  },
  {
    bg: '#eff6ff',
    accent: '#2563eb',
    accent2: '#60a5fa',
    ink: '#1e3a8a',
    muted: '#3b82f6',
    ctaBg: '#2563eb',
    ctaText: '#eff6ff',
  },
  {
    bg: '#18181b',
    accent: '#facc15',
    accent2: '#a1a1aa',
    ink: '#fafafa',
    muted: '#a1a1aa',
    ctaBg: '#facc15',
    ctaText: '#18181b',
  },
  {
    bg: '#faf5ff',
    accent: '#7c3aed',
    accent2: '#c4b5fd',
    ink: '#2e1065',
    muted: '#6d28d9',
    ctaBg: '#7c3aed',
    ctaText: '#faf5ff',
  },
  {
    bg: '#fff1f2',
    accent: '#e11d48',
    accent2: '#fb7185',
    ink: '#881337',
    muted: '#be123c',
    ctaBg: '#e11d48',
    ctaText: '#fff1f2',
  },
];

function t(
  x: number,
  y: number,
  width: number,
  height: number,
  rotation = 0,
): LayerNode['transform'] {
  return { x, y, width, height, rotation, scaleX: 1, scaleY: 1 };
}

function shape(
  name: string,
  shapeType: LayerNode['shape'],
  fill: string,
  transform: LayerNode['transform'],
): LayerNode {
  return createLayer({
    type: 'shape',
    name,
    shape: shapeType,
    fill,
    transform,
  });
}

function buildLayers(
  size: { width: number; height: number },
  spec: LayoutSpec,
): LayerNode[] {
  const { width: w, height: h } = size;
  const p = spec.palette;
  const layers: LayerNode[] = [];
  const pad = Math.round(Math.min(w, h) * 0.06);
  const headingSize = Math.round(Math.min(w, h) * (h > w * 1.4 ? 0.07 : 0.085));
  const subSize = Math.round(headingSize * 0.42);

  switch (spec.variant) {
    case 'hero-left': {
      layers.push(shape('Accent bar', 'rect', p.accent, t(0, 0, Math.round(w * 0.08), h)));
      layers.push(
        shape('Accent circle', 'ellipse', p.accent2, t(w - pad * 3.2, pad, pad * 2.4, pad * 2.4)),
      );
      break;
    }
    case 'hero-center': {
      layers.push(
        shape('Top band', 'rect', p.accent, t(0, 0, w, Math.round(h * 0.12))),
      );
      layers.push(
        shape(
          'Bottom band',
          'rect',
          p.accent2,
          t(0, h - Math.round(h * 0.08), w, Math.round(h * 0.08)),
        ),
      );
      break;
    }
    case 'split': {
      layers.push(
        shape('Split panel', 'rect', p.accent, t(Math.round(w * 0.55), 0, Math.round(w * 0.45), h)),
      );
      layers.push(
        shape(
          'Accent triangle',
          'triangle',
          p.accent2,
          t(Math.round(w * 0.42), Math.round(h * 0.35), Math.round(w * 0.18), Math.round(h * 0.22)),
        ),
      );
      break;
    }
    case 'bold-bar': {
      layers.push(
        shape(
          'Bold stripe',
          'rect',
          p.accent,
          t(pad, Math.round(h * 0.55), w - pad * 2, Math.round(h * 0.06)),
        ),
      );
      layers.push(
        shape(
          'Corner block',
          'rect',
          p.accent2,
          t(w - pad * 2.5, pad, pad * 1.8, pad * 1.8),
        ),
      );
      break;
    }
    case 'circle-pop': {
      layers.push(
        shape(
          'Big circle',
          'ellipse',
          p.accent,
          t(-pad, h - Math.round(h * 0.35), Math.round(w * 0.55), Math.round(w * 0.55)),
        ),
      );
      layers.push(
        shape(
          'Small circle',
          'ellipse',
          p.accent2,
          t(w - Math.round(w * 0.28), Math.round(h * 0.12), Math.round(w * 0.22), Math.round(w * 0.22)),
        ),
      );
      break;
    }
    case 'diagonal': {
      layers.push(
        shape(
          'Diagonal band',
          'rect',
          p.accent,
          t(-pad, Math.round(h * 0.62), w + pad * 2, Math.round(h * 0.14), -8),
        ),
      );
      layers.push(
        shape(
          'Accent triangle',
          'triangle',
          p.accent2,
          t(w - Math.round(w * 0.32), pad * 0.8, Math.round(w * 0.24), Math.round(w * 0.22)),
        ),
      );
      break;
    }
  }

  const heading = createHeadingLayer(spec.heading);
  heading.textStyle = {
    ...heading.textStyle!,
    fill: p.ink,
    fontSize: headingSize,
    fontFamily: 'Fraunces',
    fontWeight: 700,
    align: spec.variant === 'hero-center' ? 'center' : 'left',
  };

  const sub = createSubheadingLayer(spec.subheading);
  sub.textStyle = {
    ...sub.textStyle!,
    fill: p.muted,
    fontSize: subSize,
    fontFamily: 'Source Sans 3',
    fontWeight: 500,
    align: spec.variant === 'hero-center' ? 'center' : 'left',
  };

  if (spec.variant === 'hero-center') {
    heading.transform = t(pad, Math.round(h * 0.32), w - pad * 2, headingSize * 1.4);
    sub.transform = t(pad * 1.5, Math.round(h * 0.32) + headingSize * 1.6, w - pad * 3, subSize * 2.2);
  } else if (spec.variant === 'split') {
    heading.transform = t(pad, Math.round(h * 0.28), Math.round(w * 0.48), headingSize * 1.5);
    sub.transform = t(pad, Math.round(h * 0.28) + headingSize * 1.7, Math.round(w * 0.45), subSize * 2.4);
  } else if (spec.variant === 'circle-pop') {
    heading.transform = t(pad, pad * 1.4, Math.round(w * 0.7), headingSize * 1.5);
    sub.transform = t(pad, pad * 1.4 + headingSize * 1.7, Math.round(w * 0.65), subSize * 2.2);
  } else {
    const hx = spec.variant === 'hero-left' ? pad + Math.round(w * 0.08) : pad;
    heading.transform = t(hx, Math.round(h * 0.22), w - hx - pad, headingSize * 1.5);
    sub.transform = t(hx, Math.round(h * 0.22) + headingSize * 1.7, w - hx - pad * 1.5, subSize * 2.2);
  }

  layers.push(heading, sub);

  if (spec.cta) {
    const cta = createCtaLayer();
    cta.text = spec.cta;
    cta.fill = p.ctaBg;
    cta.textStyle = {
      ...cta.textStyle!,
      fill: p.ctaText,
      fontSize: Math.round(subSize * 0.95),
      fontWeight: 700,
      align: 'center',
    };
    const ctaW = Math.min(280, Math.round(w * 0.35));
    const ctaH = Math.round(Math.min(h, w) * 0.055);
    const ctaX =
      spec.variant === 'hero-center'
        ? Math.round((w - ctaW) / 2)
        : spec.variant === 'hero-left'
          ? pad + Math.round(w * 0.08)
          : pad;
    const ctaY = Math.round(h * (h > w * 1.3 ? 0.78 : 0.72));
    cta.transform = t(ctaX, ctaY, ctaW, ctaH);
    layers.push(cta);
  }

  return layers;
}

const VARIANTS: LayoutSpec['variant'][] = [
  'hero-left',
  'hero-center',
  'split',
  'bold-bar',
  'circle-pop',
  'diagonal',
];

/** Copy + palette themes per channel focus. */
const CHANNEL_COPY: Partial<
  Record<TemplateChannel, Array<{ name: string; heading: string; sub: string; cta?: string }>>
> = {
  instagram_post: [
    { name: 'Bold Drop', heading: 'New Drop', sub: 'Limited edition — shop the look', cta: 'Shop Now' },
    { name: 'Quote Card', heading: 'Create daily', sub: 'Small steps, big designs', cta: 'Start Free' },
    { name: 'Sale Burst', heading: '40% OFF', sub: 'Weekend flash sale ends Sunday', cta: 'Grab Deal' },
    { name: 'Brand Story', heading: 'Meet SN Editor', sub: 'Design that feels effortless', cta: 'Learn More' },
    { name: 'Tip Grid', heading: '3 Pro Tips', sub: 'Compose · Contrast · Crop', cta: 'Save Post' },
  ],
  instagram_story: [
    { name: 'Story Launch', heading: 'Launch Day', sub: 'Swipe up for early access', cta: 'Swipe Up' },
    { name: 'Poll Frame', heading: 'This or That?', sub: 'Tap to vote — results tonight', cta: 'Vote' },
    { name: 'Countdown', heading: '24 Hours', sub: 'Drop goes live tomorrow', cta: 'Remind Me' },
    { name: 'Behind Scenes', heading: 'BTS', sub: 'How we design in SN Editor', cta: 'Watch' },
    { name: 'Daily Tip', heading: 'Tip #12', sub: 'Lock layers before exporting', cta: 'Try It' },
  ],
  facebook_post: [
    { name: 'Link Preview', heading: 'Fresh guide', sub: 'Grow your brand with better visuals', cta: 'Read More' },
    { name: 'Event Invite', heading: 'Join us live', sub: 'Thursday 7pm · Free webinar', cta: 'RSVP' },
    { name: 'Community', heading: 'Thank you', sub: '10k creators and counting', cta: 'Share' },
    { name: 'Promo Banner', heading: 'Spring Sale', sub: 'Up to 30% on Pro plans', cta: 'Upgrade' },
    { name: 'How-to', heading: 'How to resize', sub: 'Magic Resize in one click', cta: 'Try Now' },
  ],
  youtube_thumbnail: [
    { name: 'Click Magnet', heading: 'I tried this', sub: 'You won’t believe the result', cta: 'WATCH' },
    { name: 'Tutorial', heading: '10-min edit', sub: 'Canva-style tips in SN Editor', cta: 'PLAY' },
    { name: 'Versus', heading: 'A vs B', sub: 'Which design wins?', cta: 'SEE' },
    { name: 'Reveal', heading: 'Secret sauce', sub: 'Brand kits explained', cta: 'LEARN' },
    { name: 'Episode', heading: 'Ep. 07', sub: 'Export at 3× without blur', cta: 'WATCH' },
  ],
  linkedin_post: [
    { name: 'Thought Lead', heading: 'Design is strategy', sub: 'Clarity beats decoration every time', cta: 'Read' },
    { name: 'Hiring', heading: 'We’re hiring', sub: 'Product designer · Remote', cta: 'Apply' },
    { name: 'Case Study', heading: '2× engagement', sub: 'How a brand kit changed everything', cta: 'Download' },
    { name: 'Announcement', heading: 'Now shipping', sub: 'Multi-page artboards + Magic Resize', cta: 'Explore' },
    { name: 'Carousel Cover', heading: '5 frameworks', sub: 'Swipe for the full list', cta: 'Save' },
  ],
  facebook_ads: [
    { name: 'Ad Conversion', heading: 'Start free', sub: 'No credit card · Export in minutes', cta: 'Sign Up' },
    { name: 'Ad Retarget', heading: 'Still thinking?', sub: 'Finish your first design today', cta: 'Continue' },
  ],
  tiktok: [
    { name: 'Hook Frame', heading: 'Wait for it…', sub: 'Template that pops on For You', cta: 'Duet' },
    { name: 'Trend Cap', heading: 'Trend alert', sub: 'Use this layout before it’s gone', cta: 'Use Sound' },
  ],
  amazon: [
    { name: 'Product Hero', heading: 'Best seller', sub: 'Crystal-clear product frame', cta: 'Buy Now' },
    { name: 'Feature Grid', heading: 'Why us', sub: 'Quality · Speed · Support', cta: 'Add to Cart' },
  ],
  daraz: [
    { name: 'Mega Deal', heading: 'Flash Deal', sub: 'Today only — free shipping', cta: 'Order' },
    { name: 'Bundle', heading: 'Buy 2 Save', sub: 'Mix & match bestsellers', cta: 'Shop' },
  ],
  shopify: [
    { name: 'Store Hero', heading: 'Your store', sub: 'Look polished from day one', cta: 'Open Store' },
    { name: 'Collection', heading: 'New arrivals', sub: 'Curated for your homepage', cta: 'Browse' },
  ],
  banner: [
    { name: 'Wide Promo', heading: 'Design faster', sub: 'Templates for every channel', cta: 'Get Started' },
    { name: 'Site Header', heading: 'SN Editor Pro', sub: 'Brand kits · Icons · Export 3×', cta: 'Go Pro' },
  ],
  poster: [
    { name: 'Event Poster', heading: 'Open Studio', sub: 'Sat 6pm · Downtown gallery', cta: 'Tickets' },
    { name: 'Campaign', heading: 'Make noise', sub: 'A poster that stops the scroll', cta: 'Print' },
  ],
  flyer: [
    { name: 'Print Flyer', heading: 'Grand opening', sub: 'Coffee · Design · Community', cta: 'Visit Us' },
    { name: 'Workshop', heading: 'Workshop', sub: 'Learn layout in one afternoon', cta: 'Register' },
  ],
};

function makeTemplate(
  channel: TemplateChannel,
  index: number,
  copy: { name: string; heading: string; sub: string; cta?: string },
): SeedTemplate {
  const size = TEMPLATE_SIZES[channel];
  const label = TEMPLATE_CHANNEL_LABELS[channel];
  const palette = PALETTES[(index + channel.length) % PALETTES.length]!;
  const variant = VARIANTS[index % VARIANTS.length]!;
  const num = String(index + 1).padStart(2, '0');
  const id = `tpl_${channel}_${num}`;

  const doc = createEmptyDocument(`${copy.name} · ${label}`);
  const artboard = createArtboard(label, size.width, size.height, 80, 80);
  artboard.background = palette.bg;

  const layers = buildLayers(size, {
    name: copy.name,
    palette,
    heading: copy.heading,
    subheading: copy.sub,
    cta: copy.cta,
    variant,
  });

  const now = new Date().toISOString();
  return {
    id,
    channel,
    name: copy.name,
    document: {
      ...doc,
      id: `doc_${id}`,
      artboards: [artboard],
      layers,
      meta: {
        name: `${copy.name} · ${label}`,
        templateId: id,
        createdAt: now,
        updatedAt: now,
      },
    },
  };
}

function buildAllTemplates(): SeedTemplate[] {
  const out: SeedTemplate[] = [];
  for (const channel of TEMPLATE_CHANNELS) {
    const copies = CHANNEL_COPY[channel] ?? [
      {
        name: `${TEMPLATE_CHANNEL_LABELS[channel]} A`,
        heading: TEMPLATE_CHANNEL_LABELS[channel],
        sub: 'Edit this SN Editor template',
        cta: 'Edit',
      },
      {
        name: `${TEMPLATE_CHANNEL_LABELS[channel]} B`,
        heading: 'Your headline',
        sub: 'Add a supporting line',
        cta: 'Go',
      },
    ];
    copies.forEach((copy, i) => out.push(makeTemplate(channel, i, copy)));
  }
  return out;
}

export const SEED_TEMPLATES: SeedTemplate[] = buildAllTemplates();

export function getTemplatesByChannel(channel: TemplateChannel): SeedTemplate[] {
  return SEED_TEMPLATES.filter((t) => t.channel === channel);
}

export function getTemplateById(id: string): SeedTemplate | undefined {
  return SEED_TEMPLATES.find((t) => t.id === id);
}
