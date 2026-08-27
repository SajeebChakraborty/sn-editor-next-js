# Runbook

Operational guide for SN Editor production services.

## Services

| Service | Runtime | Role |
|---------|---------|------|
| `apps/web` | ECS / Amplify / Vercel-compatible | Editor UI + BFF routes |
| `ai-worker` | ECS GPU | AI image/video inference jobs |
| `image-worker` | ECS Fargate | Sharp resize/export |
| `video-worker` | ECS Fargate | FFmpeg export |
| `export-worker` | ECS Fargate | Package + upload final artifacts |
| Redis | ElastiCache | BullMQ |
| MongoDB | Atlas | Source of truth |
| S3 | AWS | Assets & exports |

## Job lifecycle

1. API creates Mongo `jobs` doc (`queued`) with idempotency key.
2. Enqueue BullMQ job with same id.
3. Worker sets `running`, reports progress via Redis pub/sub.
4. On success: upload S3, set `succeeded`, patch project document if applicable.
5. On failure: retry with backoff; after max attempts → DLQ + `failed`.

## Common incidents

### Queue lag / backlog

- Check ElastiCache CPU/memory and BullMQ waiting counts.
- Scale ECS desired count for the saturated worker.
- Alert: `pixizen.queue.wait_ms` > SLA (see alerts below).

### GPU saturation

- Scale AI worker ASG / ECS capacity providers.
- Shed load: reject low-priority tools or enforce quotas.

### Poison jobs

- Inspect DLQ payloads in Redis / CloudWatch.
- Use replay tooling in `packages/queue` (`replayDeadLetter`).
- Fix handler bug before mass-replay.

### Export failures

- Verify FFmpeg image health, disk space on task, S3 permissions.
- Re-run job with same idempotency key (safe).

## SLA alerts (definitions)

| Alert | Condition |
|-------|-----------|
| QueueLag | P95 wait > 60s for 5m |
| GpuErrorBudget | Failure rate > 5% for 10m |
| GpuSaturation | GPU util > 90% for 15m |
| ExportTimeout | Jobs running > 30m |

## Backup / restore

- **MongoDB Atlas**: continuous backup + point-in-time restore.
- **S3**: versioning enabled; lifecycle for temp job inputs.
- Restore drill: document steps quarterly in incident channel.

## Feature flags

Kill-switch any AI tool via env / remote config mapped in `@sn-editor/shared/featureFlags` without redeploying workers if flag is read per job.
