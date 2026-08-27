/**
 * Device mockups + decorative frames for the image editor Elements → Frames panel.
 * SVGs use a soft landscape placeholder in the screen / photo area (Canva-style).
 */

function landscapeScreen(x: number, y: number, w: number, h: number, rx = 8): string {
  const id = `sky-${Math.round(x)}-${Math.round(y)}`;
  return `
    <defs>
      <clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/></clipPath>
      <linearGradient id="g-${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#7dd3fc"/>
        <stop offset="55%" stop-color="#bae6fd"/>
        <stop offset="100%" stop-color="#86efac"/>
      </linearGradient>
    </defs>
    <g clip-path="url(#${id})">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#g-${id})"/>
      <ellipse cx="${x + w * 0.28}" cy="${y + h * 0.22}" rx="${w * 0.08}" ry="${h * 0.045}" fill="#fff" opacity="0.95"/>
      <ellipse cx="${x + w * 0.72}" cy="${y + h * 0.18}" rx="${w * 0.1}" ry="${h * 0.05}" fill="#fff" opacity="0.9"/>
      <path d="M${x} ${y + h * 0.72}
        C${x + w * 0.2} ${y + h * 0.58}, ${x + w * 0.4} ${y + h * 0.78}, ${x + w * 0.55} ${y + h * 0.65}
        C${x + w * 0.72} ${y + h * 0.52}, ${x + w * 0.88} ${y + h * 0.7}, ${x + w} ${y + h * 0.62}
        V${y + h} H${x} Z" fill="#4ade80"/>
      <path d="M${x} ${y + h * 0.82}
        C${x + w * 0.25} ${y + h * 0.7}, ${x + w * 0.5} ${y + h * 0.88}, ${x + w * 0.7} ${y + h * 0.74}
        C${x + w * 0.85} ${y + h * 0.66}, ${x + w * 0.95} ${y + h * 0.8}, ${x + w} ${y + h * 0.78}
        V${y + h} H${x} Z" fill="#22c55e"/>
    </g>`;
}

function toDataUrl(svg: string): string {
  // Blob URLs keep internal url(#…) refs working (data: URLs break on encoded #).
  return URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
}

export type FrameMockup = {
  id: string;
  label: string;
  category: 'devices' | 'shapes';
  /** Suggested canvas size */
  width: number;
  height: number;
  src: string;
  /** CSS preview for the panel tile */
  preview: string;
};

function phoneSvg(color = '#111827'): string {
  return toDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 440" fill="none">
    <rect x="8" y="8" width="204" height="424" rx="36" fill="${color}"/>
    <rect x="18" y="18" width="184" height="404" rx="28" fill="#0a0a0a"/>
    ${landscapeScreen(28, 48, 164, 320, 4)}
    <rect x="88" y="28" width="44" height="8" rx="4" fill="#1f2937"/>
    <circle cx="110" cy="400" r="14" fill="#1f2937" stroke="#374151" stroke-width="2"/>
  </svg>`);
}

function tabletSvg(color = '#1f2937'): string {
  return toDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 480" fill="none">
    <rect x="10" y="10" width="340" height="460" rx="28" fill="${color}"/>
    <rect x="22" y="22" width="316" height="436" rx="18" fill="#0a0a0a"/>
    ${landscapeScreen(36, 48, 288, 360, 6)}
    <circle cx="180" cy="440" r="10" fill="#374151"/>
  </svg>`);
}

function laptopSvg(color = '#e5e7eb'): string {
  return toDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 340" fill="none">
    <rect x="60" y="20" width="400" height="250" rx="12" fill="${color}" stroke="#9ca3af" stroke-width="2"/>
    <rect x="78" y="36" width="364" height="210" rx="4" fill="#111827"/>
    ${landscapeScreen(86, 44, 348, 194, 2)}
    <rect x="20" y="270" width="480" height="28" rx="4" fill="${color}" stroke="#9ca3af" stroke-width="2"/>
    <rect x="200" y="274" width="120" height="8" rx="2" fill="#d1d5db"/>
    <path d="M20 298h480l12 18H8z" fill="#9ca3af"/>
  </svg>`);
}

function monitorSvg(color = '#111827'): string {
  return toDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360" fill="none">
    <rect x="40" y="16" width="400" height="260" rx="10" fill="${color}"/>
    <rect x="56" y="32" width="368" height="220" rx="4" fill="#0a0a0a"/>
    ${landscapeScreen(64, 40, 352, 204, 2)}
    <rect x="210" y="276" width="60" height="28" fill="#374151"/>
    <rect x="160" y="304" width="160" height="14" rx="3" fill="#4b5563"/>
  </svg>`);
}

function watchSvg(color = '#111827'): string {
  return toDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 320" fill="none">
    <rect x="78" y="8" width="84" height="52" rx="10" fill="#374151"/>
    <rect x="48" y="56" width="144" height="180" rx="36" fill="${color}"/>
    <rect x="60" y="68" width="120" height="156" rx="28" fill="#0a0a0a"/>
    ${landscapeScreen(70, 78, 100, 136, 20)}
    <rect x="78" y="240" width="84" height="72" rx="10" fill="#374151"/>
  </svg>`);
}

function polaroidSvg(): string {
  return toDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 340" fill="none">
    <rect x="8" y="8" width="264" height="324" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
    <rect x="28" y="28" width="224" height="224" fill="#e2e8f0"/>
    ${landscapeScreen(28, 28, 224, 224, 0)}
    <rect x="28" y="260" width="224" height="52" fill="#f8fafc"/>
  </svg>`);
}

function tapedFrameSvg(): string {
  return toDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" fill="none">
    <rect x="36" y="36" width="228" height="228" fill="#fff" stroke="#e2e8f0" stroke-width="2"/>
    ${landscapeScreen(48, 48, 204, 204, 0)}
    <rect x="120" y="18" width="60" height="28" rx="2" fill="#d6b58a" opacity="0.85" transform="rotate(-6 150 32)"/>
    <rect x="220" y="40" width="48" height="22" rx="2" fill="#d6b58a" opacity="0.8" transform="rotate(18 244 51)"/>
  </svg>`);
}

function goldCircleFrameSvg(): string {
  return toDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" fill="none">
    <circle cx="150" cy="150" r="132" fill="none" stroke="#d4a017" stroke-width="14"/>
    <circle cx="150" cy="150" r="118" fill="none" stroke="#f5d76e" stroke-width="4"/>
    <circle cx="150" cy="150" r="110" fill="#bae6fd"/>
    ${landscapeScreen(40, 40, 220, 220, 110)}
  </svg>`);
}

function heartFrameSvg(): string {
  return toDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 280" fill="none">
    <path d="M150 250 C40 170 20 90 70 50 C100 28 130 40 150 70 C170 40 200 28 230 50 C280 90 260 170 150 250Z"
      fill="#fda4af" stroke="#fb7185" stroke-width="8"/>
    <path d="M150 220 C70 160 55 100 90 72 C110 56 132 68 150 96 C168 68 190 56 210 72 C245 100 230 160 150 220Z"
      fill="#bae6fd"/>
  </svg>`);
}

function starFrameSvg(): string {
  return toDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" fill="none">
    <path d="M150 20 L180 110 L275 110 L198 165 L225 255 L150 200 L75 255 L102 165 L25 110 L120 110 Z"
      fill="#fde68a" stroke="#f59e0b" stroke-width="8" stroke-linejoin="round"/>
    <circle cx="150" cy="145" r="70" fill="#bae6fd"/>
  </svg>`);
}

function archFrameSvg(): string {
  return toDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 320" fill="none">
    <path d="M28 300 V140 A92 92 0 0 1 212 140 V300 Z" fill="#111827"/>
    <path d="M44 286 V140 A76 76 0 0 1 196 140 V286 Z" fill="#0a0a0a"/>
    ${landscapeScreen(52, 72, 136, 200, 0)}
  </svg>`);
}

/** Preview CSS for panel tiles (lightweight, no full SVG load needed for all). */
const PREVIEWS: Record<string, string> = {
  phone:
    'linear-gradient(180deg,#111 0%,#111 12%,#7dd3fc 12%,#86efac 88%,#111 88%)',
  phoneGold:
    'linear-gradient(180deg,#78350f 0%,#78350f 12%,#7dd3fc 12%,#86efac 88%,#78350f 88%)',
  tablet: 'linear-gradient(180deg,#1f2937 8%,#7dd3fc 12%,#86efac 86%,#1f2937 90%)',
  laptop: 'linear-gradient(180deg,#e5e7eb 6%,#7dd3fc 14%,#86efac 70%,#e5e7eb 78%,#9ca3af 100%)',
  monitor: 'linear-gradient(180deg,#111 5%,#7dd3fc 12%,#86efac 70%,#111 78%,#4b5563 100%)',
  watch: 'linear-gradient(180deg,#374151 10%,#111 18%,#7dd3fc 28%,#86efac 72%,#111 82%,#374151 100%)',
  polaroid: 'linear-gradient(180deg,#f8fafc 6%,#7dd3fc 12%,#86efac 70%,#f8fafc 78%)',
  taped: 'linear-gradient(135deg,#d6b58a 0 12%,#fff 12% 18%,#7dd3fc 18% 75%,#fff 75%)',
  goldCircle: 'radial-gradient(circle,#7dd3fc 0 55%,#f5d76e 55% 68%,#d4a017 68% 100%)',
  heart: 'radial-gradient(circle at 50% 40%,#bae6fd 0 45%,#fda4af 45% 100%)',
  star: 'radial-gradient(circle,#bae6fd 0 40%,#fde68a 40% 100%)',
  arch: 'linear-gradient(180deg,#111 0 18%,#7dd3fc 18% 75%,#111 75%)',
  rounded: 'linear-gradient(#7dd3fc,#86efac)',
  hex: 'linear-gradient(#7dd3fc,#86efac)',
  diamond: 'linear-gradient(135deg,#7dd3fc,#86efac)',
};

export const DEVICE_MOCKUPS: FrameMockup[] = [
  {
    id: 'phone',
    label: 'Phone',
    category: 'devices',
    width: 180,
    height: 360,
    src: phoneSvg('#111827'),
    preview: PREVIEWS.phone!,
  },
  {
    id: 'phone-gold',
    label: 'Phone Gold',
    category: 'devices',
    width: 180,
    height: 360,
    src: phoneSvg('#78350f'),
    preview: PREVIEWS.phoneGold!,
  },
  {
    id: 'tablet',
    label: 'Tablet',
    category: 'devices',
    width: 260,
    height: 340,
    src: tabletSvg(),
    preview: PREVIEWS.tablet!,
  },
  {
    id: 'laptop',
    label: 'Laptop',
    category: 'devices',
    width: 420,
    height: 275,
    src: laptopSvg(),
    preview: PREVIEWS.laptop!,
  },
  {
    id: 'monitor',
    label: 'Monitor',
    category: 'devices',
    width: 400,
    height: 300,
    src: monitorSvg(),
    preview: PREVIEWS.monitor!,
  },
  {
    id: 'watch',
    label: 'Watch',
    category: 'devices',
    width: 160,
    height: 210,
    src: watchSvg(),
    preview: PREVIEWS.watch!,
  },
];

export const SHAPE_FRAMES: FrameMockup[] = [
  {
    id: 'polaroid',
    label: 'Polaroid',
    category: 'shapes',
    width: 240,
    height: 290,
    src: polaroidSvg(),
    preview: PREVIEWS.polaroid!,
  },
  {
    id: 'taped',
    label: 'Taped',
    category: 'shapes',
    width: 260,
    height: 260,
    src: tapedFrameSvg(),
    preview: PREVIEWS.taped!,
  },
  {
    id: 'gold-circle',
    label: 'Gold Circle',
    category: 'shapes',
    width: 280,
    height: 280,
    src: goldCircleFrameSvg(),
    preview: PREVIEWS.goldCircle!,
  },
  {
    id: 'heart',
    label: 'Heart',
    category: 'shapes',
    width: 260,
    height: 240,
    src: heartFrameSvg(),
    preview: PREVIEWS.heart!,
  },
  {
    id: 'star-frame',
    label: 'Star',
    category: 'shapes',
    width: 280,
    height: 280,
    src: starFrameSvg(),
    preview: PREVIEWS.star!,
  },
  {
    id: 'arch',
    label: 'Arch',
    category: 'shapes',
    width: 200,
    height: 270,
    src: archFrameSvg(),
    preview: PREVIEWS.arch!,
  },
];

export const ALL_FRAME_MOCKUPS = [...DEVICE_MOCKUPS, ...SHAPE_FRAMES];
