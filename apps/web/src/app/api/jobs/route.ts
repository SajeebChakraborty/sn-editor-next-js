import { NextRequest, NextResponse } from 'next/server';
import { createId } from '@sn-editor/shared';
import { jobStore, newJobId, type StoredJob } from '@/server/memoryStore';
import { getCurrentUser } from '@/server/auth/session';
import { log, rateLimit } from '@/lib/observability';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Create an AI / export job (in-memory demo queue). */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!rateLimit(`jobs:${user.id}`, 120)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as {
    type?: string;
    input?: Record<string, unknown>;
  } | null;

  if (!body?.type) {
    return NextResponse.json({ error: 'type is required' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const job: StoredJob = {
    id: newJobId(),
    type: body.type,
    status: 'queued',
    progress: 0,
    input: body.input,
    createdAt: now,
    updatedAt: now,
  };
  jobStore.set(job.id, job);
  log.info('job_created', { jobId: job.id, type: job.type, userId: user.id });

  // Demo auto-progress without workers.
  queueMicrotask(() => {
    const running: StoredJob = {
      ...job,
      status: 'running',
      progress: 20,
      updatedAt: new Date().toISOString(),
    };
    jobStore.set(job.id, running);
    setTimeout(() => {
      jobStore.set(job.id, {
        ...running,
        status: 'succeeded',
        progress: 100,
        result: {
          outputKeys: [`demo/${job.id}`],
          meta: { requestId: createId('req') },
        },
        updatedAt: new Date().toISOString(),
      });
    }, 900);
  });

  return NextResponse.json(job, { status: 201 });
}

export async function GET() {
  const jobs = Array.from(jobStore.values()).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  );
  return NextResponse.json({ jobs });
}
