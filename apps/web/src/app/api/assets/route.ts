import { NextRequest, NextResponse } from 'next/server';
import type { AssetRef } from '@sn-editor/editor-core';
import { createId } from '@sn-editor/shared';
import { assetStore } from '@/server/memoryStore';
import { getCurrentUser } from '@/server/auth/session';
import { log, rateLimit } from '@/lib/observability';
import { DEMO_LIBRARY_ASSETS, isRenderableAssetUrl } from '@/lib/demoLibraryAssets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function ensureDemo(): void {
  for (const a of DEMO_LIBRARY_ASSETS) {
    assetStore.set(a.id, a);
  }
}

export async function GET(req: NextRequest) {
  ensureDemo();
  const kind = new URL(req.url).searchParams.get('kind');
  let assets = Array.from(assetStore.values()).filter((a) => isRenderableAssetUrl(a.urlOrKey));
  if (kind) assets = assets.filter((a) => a.kind === kind);
  return NextResponse.json({ assets });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!rateLimit(`assets:${user.id}`, 80)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const body = (await req.json().catch(() => null)) as Partial<AssetRef> | null;
  if (!body?.kind || !body?.name || !body?.urlOrKey) {
    return NextResponse.json({ error: 'kind, name, urlOrKey required' }, { status: 400 });
  }
  const asset: AssetRef = {
    id: body.id ?? createId('asset'),
    kind: body.kind,
    name: body.name,
    urlOrKey: body.urlOrKey,
  };
  assetStore.set(asset.id, asset);
  log.info('asset_saved', { assetId: asset.id, userId: user.id });
  return NextResponse.json(asset, { status: 201 });
}
