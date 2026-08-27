import { NextRequest, NextResponse } from 'next/server';
import type { BrandKit } from '@sn-editor/editor-core';
import { DEMO_BRAND_KIT } from '@/lib/demoBrandKit';
import { getCurrentUser } from '@/server/auth/session';
import { brandKitStore } from '@/server/memoryStore';
import { log, rateLimit } from '@/lib/observability';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function ensureDemo(): void {
  if (!brandKitStore.has(DEMO_BRAND_KIT.id)) {
    brandKitStore.set(DEMO_BRAND_KIT.id, DEMO_BRAND_KIT);
  }
}

export async function GET() {
  ensureDemo();
  return NextResponse.json({ brandKits: Array.from(brandKitStore.values()) });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!rateLimit(`brand:${user.id}`, 40)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const body = (await req.json().catch(() => null)) as BrandKit | null;
  if (!body?.id || !body?.name) {
    return NextResponse.json({ error: 'Invalid brand kit' }, { status: 400 });
  }
  brandKitStore.set(body.id, body);
  log.info('brand_kit_saved', { brandKitId: body.id, userId: user.id });
  return NextResponse.json(body, { status: 201 });
}
