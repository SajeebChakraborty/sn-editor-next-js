import { NextResponse } from 'next/server';
import { jobStore } from '@/server/memoryStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Get a single job by id. */
export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const job = jobStore.get(id);
  if (!job) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(job);
}
