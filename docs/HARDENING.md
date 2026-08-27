# Observability & hardening stubs (Phase 6)

## OpenTelemetry

Instrument `apps/web` API routes and all workers with `@opentelemetry/sdk-node`.
Export to AWS X-Ray / OTLP collector. Metric names:

- `pixizen.job.duration_ms`
- `pixizen.queue.wait_ms`
- `pixizen.export.failures`

## Rate limits & quotas

| Scope | Default |
|-------|---------|
| AI jobs / user / hour | 60 |
| Exports / user / hour | 30 |
| Upload bytes / day | 2 GB |

Enforce in API before enqueue (`apps/web/src/lib/rateLimit.ts`).

## Feature flags

See `@sn-editor/shared` `featureFlags`. Remote config can override env later.

## Security checklist

- [ ] Project/asset/job routes call `assertOwner`
- [ ] Signed S3 URLs only (no public buckets)
- [ ] CSRF on cookie sessions
- [ ] Secrets in AWS Secrets Manager / SSM
