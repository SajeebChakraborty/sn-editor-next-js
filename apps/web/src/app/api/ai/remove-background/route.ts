/**
 * Cloud background removal via Replicate when REPLICATE_API_TOKEN is set.
 * Without a token, returns { useClient: true } so the browser rembg path runs.
 *
 * Env: REPLICATE_API_TOKEN=r8_...
 * Model default: lucataco/remove-bg (override with REPLICATE_REMBG_VERSION).
 */
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/observability';
import { getCurrentUser } from '@/server/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_VERSION =
  process.env.REPLICATE_REMBG_VERSION ??
  // lucataco/remove-bg latest known version pin (override via env)
  '95fcc2a26d3899cd6c2691c2473554149252bc25b6b5adacc59719eef775d2bb';

async function waitForPrediction(
  id: string,
  token: string,
  maxAttempts = 60,
): Promise<{ status: string; output?: unknown; error?: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${token}`, Prefer: 'wait' },
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Replicate poll failed: ${res.status} ${text.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      status: string;
      output?: unknown;
      error?: string;
    };
    if (data.status === 'succeeded' || data.status === 'failed' || data.status === 'canceled') {
      return data;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Replicate prediction timed out');
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!rateLimit(`rembg:${user.id}`, 30)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const token = process.env.REPLICATE_API_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ useClient: true });
  }

  const body = (await req.json().catch(() => null)) as { imageUrl?: string } | null;
  const imageUrl = body?.imageUrl?.trim();
  if (!imageUrl) {
    return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
  }

  try {
    const create = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'wait',
      },
      body: JSON.stringify({
        version: DEFAULT_VERSION,
        input: { image: imageUrl },
      }),
    });

    if (!create.ok) {
      const errText = await create.text();
      // Fall back to client rather than hard-failing the editor UX
      return NextResponse.json({
        useClient: true,
        error: `Cloud rembg unavailable (${create.status}): ${errText.slice(0, 160)}`,
      });
    }

    let prediction = (await create.json()) as {
      id: string;
      status: string;
      output?: unknown;
      error?: string;
    };

    if (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
      prediction = {
        ...prediction,
        ...(await waitForPrediction(prediction.id, token)),
      };
    }

    if (prediction.status !== 'succeeded') {
      return NextResponse.json({
        useClient: true,
        error: prediction.error ?? 'Cloud rembg failed',
      });
    }

    const output = prediction.output;
    const url = Array.isArray(output) ? String(output[0]) : String(output ?? '');
    if (!url || url === 'undefined') {
      return NextResponse.json({ useClient: true, error: 'Empty cloud output' });
    }

    return NextResponse.json({ url, provider: 'replicate' });
  } catch (err) {
    return NextResponse.json({
      useClient: true,
      error: err instanceof Error ? err.message : 'Cloud rembg error',
    });
  }
}
