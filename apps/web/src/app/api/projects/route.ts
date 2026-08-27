import { NextRequest, NextResponse } from 'next/server';
import type { DesignDocument } from '@sn-editor/editor-core';
import { projectStore } from '@/server/memoryStore';
import { log, rateLimit } from '@/lib/observability';
import { getCurrentUser } from '@/server/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** List design documents, or load one via ?id= */
export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (id) {
    const doc = projectStore.get(id);
    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(doc);
  }
  const projects = Array.from(projectStore.values());
  return NextResponse.json({ projects });
}

/** Save (upsert) a design document. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!rateLimit(`projects:${user.id}`, 60)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as DesignDocument | null;
  if (!body?.id || !body?.meta?.name) {
    return NextResponse.json({ error: 'Invalid design document' }, { status: 400 });
  }

  const saved: DesignDocument = {
    ...body,
    meta: { ...body.meta, updatedAt: new Date().toISOString() },
  };
  projectStore.set(saved.id, saved);
  log.info('project_saved', { projectId: saved.id, userId: user.id });
  return NextResponse.json(saved);
}
