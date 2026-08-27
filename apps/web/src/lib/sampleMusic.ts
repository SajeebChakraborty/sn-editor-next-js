/**
 * Royalty-free procedural sample music beds (generated in-browser).
 * No external downloads — safe, free, always available.
 */
'use client';

export type SampleMusicGenre =
  | 'upbeat'
  | 'chill'
  | 'cinematic'
  | 'corporate'
  | 'hiphop'
  | 'electronic'
  | 'acoustic'
  | 'energetic';

export interface SampleMusicTrack {
  id: SampleMusicGenre;
  name: string;
  genre: string;
  mood: string;
  durationMs: number;
  bpm: number;
}

export const SAMPLE_MUSIC_LIBRARY: SampleMusicTrack[] = [
  {
    id: 'upbeat',
    name: 'Sunny Hook',
    genre: 'Upbeat Pop',
    mood: 'Bright · social ads',
    durationMs: 12_000,
    bpm: 118,
  },
  {
    id: 'chill',
    name: 'Soft Loft',
    genre: 'Chill / Lo-fi',
    mood: 'Calm · lifestyle',
    durationMs: 14_000,
    bpm: 84,
  },
  {
    id: 'cinematic',
    name: 'Wide Horizon',
    genre: 'Cinematic',
    mood: 'Epic · trailers',
    durationMs: 16_000,
    bpm: 96,
  },
  {
    id: 'corporate',
    name: 'Clean Pitch',
    genre: 'Corporate',
    mood: 'Polished · explainers',
    durationMs: 12_000,
    bpm: 110,
  },
  {
    id: 'hiphop',
    name: 'Night Pulse',
    genre: 'Hip-Hop Beat',
    mood: 'Urban · reels',
    durationMs: 12_000,
    bpm: 92,
  },
  {
    id: 'electronic',
    name: 'Neon Drive',
    genre: 'Electronic',
    mood: 'Tech · product',
    durationMs: 12_000,
    bpm: 126,
  },
  {
    id: 'acoustic',
    name: 'Warm Strings',
    genre: 'Acoustic',
    mood: 'Soft · stories',
    durationMs: 14_000,
    bpm: 88,
  },
  {
    id: 'energetic',
    name: 'Launch Energy',
    genre: 'Energetic',
    mood: 'Hype · CTA',
    durationMs: 10_000,
    bpm: 132,
  },
];

const cache = new Map<SampleMusicGenre, { url: string; durationMs: number }>();

function writeWav(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

function env(t: number, a: number, d: number, s: number, r: number, dur: number): number {
  if (t < a) return t / a;
  if (t < a + d) return 1 - ((1 - s) * (t - a)) / d;
  if (t < dur - r) return s;
  if (t < dur) return s * (1 - (t - (dur - r)) / r);
  return 0;
}

type GenreRecipe = {
  bpm: number;
  durationSec: number;
  root: number;
  scale: number[];
  kick: boolean;
  hat: boolean;
  bass: boolean;
  pad: boolean;
  arp: boolean;
  bright: number;
};

const RECIPES: Record<SampleMusicGenre, GenreRecipe> = {
  upbeat: {
    bpm: 118,
    durationSec: 12,
    root: 62,
    scale: [0, 2, 4, 5, 7, 9, 11],
    kick: true,
    hat: true,
    bass: true,
    pad: true,
    arp: true,
    bright: 1.1,
  },
  chill: {
    bpm: 84,
    durationSec: 14,
    root: 57,
    scale: [0, 2, 3, 5, 7, 8, 10],
    kick: true,
    hat: true,
    bass: true,
    pad: true,
    arp: false,
    bright: 0.75,
  },
  cinematic: {
    bpm: 96,
    durationSec: 16,
    root: 50,
    scale: [0, 2, 3, 5, 7, 8, 10],
    kick: true,
    hat: false,
    bass: true,
    pad: true,
    arp: true,
    bright: 0.9,
  },
  corporate: {
    bpm: 110,
    durationSec: 12,
    root: 60,
    scale: [0, 2, 4, 5, 7, 9, 11],
    kick: true,
    hat: true,
    bass: true,
    pad: true,
    arp: true,
    bright: 1,
  },
  hiphop: {
    bpm: 92,
    durationSec: 12,
    root: 48,
    scale: [0, 3, 5, 7, 10],
    kick: true,
    hat: true,
    bass: true,
    pad: true,
    arp: false,
    bright: 0.85,
  },
  electronic: {
    bpm: 126,
    durationSec: 12,
    root: 55,
    scale: [0, 2, 4, 7, 9],
    kick: true,
    hat: true,
    bass: true,
    pad: false,
    arp: true,
    bright: 1.2,
  },
  acoustic: {
    bpm: 88,
    durationSec: 14,
    root: 64,
    scale: [0, 2, 4, 5, 7, 9, 11],
    kick: false,
    hat: true,
    bass: true,
    pad: true,
    arp: true,
    bright: 0.95,
  },
  energetic: {
    bpm: 132,
    durationSec: 10,
    root: 57,
    scale: [0, 2, 4, 7, 9, 11],
    kick: true,
    hat: true,
    bass: true,
    pad: true,
    arp: true,
    bright: 1.25,
  },
};

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function renderGenre(genre: SampleMusicGenre): Float32Array {
  const recipe = RECIPES[genre];
  const sampleRate = 22050;
  const durationSec = recipe.durationSec;
  const n = Math.floor(sampleRate * durationSec);
  const out = new Float32Array(n);
  const beat = 60 / recipe.bpm;
  const scale = recipe.scale;
  const root = recipe.root;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let s = 0;

    // Kick
    if (recipe.kick) {
      const beatPos = t % (beat * 2);
      if (beatPos < 0.12) {
        const kt = beatPos;
        s += Math.sin(2 * Math.PI * (110 * Math.exp(-kt * 28)) * kt) * env(kt, 0.001, 0.08, 0.1, 0.04, 0.12) * 0.55;
      }
      // snare-ish on offbeats
      const off = (t + beat) % (beat * 2);
      if (off < 0.08) {
        const nt = off;
        const noise = Math.random() * 2 - 1;
        s += noise * env(nt, 0.001, 0.04, 0.05, 0.03, 0.08) * 0.22 * recipe.bright;
      }
    }

    // Hats
    if (recipe.hat) {
      const hatBeat = beat / 2;
      const hp = t % hatBeat;
      if (hp < 0.03) {
        const noise = Math.random() * 2 - 1;
        s += noise * env(hp, 0.001, 0.01, 0.05, 0.015, 0.03) * 0.12 * recipe.bright;
      }
    }

    // Bass
    if (recipe.bass) {
      const bar = Math.floor(t / (beat * 4));
      const step = Math.floor((t % (beat * 4)) / beat);
      const deg = scale[step % scale.length]!;
      const note = root - 12 + (bar % 2 === 0 ? deg : scale[(step + 2) % scale.length]!);
      const f = midiToHz(note);
      const local = t % beat;
      s += Math.sin(2 * Math.PI * f * t) * env(local, 0.01, 0.08, 0.55, 0.08, beat) * 0.28;
      s += Math.sin(2 * Math.PI * f * 2 * t) * env(local, 0.01, 0.08, 0.3, 0.08, beat) * 0.08;
    }

    // Pad
    if (recipe.pad) {
      const chordDegs = [0, scale[2] ?? 4, scale[4] ?? 7];
      for (const d of chordDegs) {
        const f = midiToHz(root + d);
        s += Math.sin(2 * Math.PI * f * t) * 0.06 * recipe.bright;
        s += Math.sin(2 * Math.PI * (f * 1.002) * t) * 0.04;
      }
    }

    // Arp / lead
    if (recipe.arp) {
      const stepDur = beat / 2;
      const step = Math.floor(t / stepDur);
      const deg = scale[step % scale.length]!;
      const oct = step % 8 < 4 ? 12 : 0;
      const f = midiToHz(root + deg + oct);
      const local = t % stepDur;
      s += Math.sin(2 * Math.PI * f * t) * env(local, 0.005, 0.04, 0.25, 0.05, stepDur) * 0.18 * recipe.bright;
    }

    // Soft master envelope to avoid clicks
    const fade = Math.min(1, t * 4, (durationSec - t) * 4);
    out[i] = Math.max(-0.95, Math.min(0.95, s * fade * 0.85));
  }

  return out;
}

/** Build (or reuse) a playable blob URL for a sample track. */
export async function getSampleMusicUrl(
  genre: SampleMusicGenre,
): Promise<{ url: string; durationMs: number }> {
  const hit = cache.get(genre);
  if (hit) return hit;

  const recipe = RECIPES[genre];
  const samples = renderGenre(genre);
  const blob = writeWav(samples, 22050);
  const url = URL.createObjectURL(blob);
  const result = { url, durationMs: Math.round(recipe.durationSec * 1000) };
  cache.set(genre, result);
  return result;
}
