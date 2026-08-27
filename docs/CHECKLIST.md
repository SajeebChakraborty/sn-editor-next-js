# SN Editor Build Checklist

Track progress phase by phase. Exit criteria per phase: **shippable, no known blockers, unfinished tools feature-flagged**.

Legend: `[x]` done · `[ ]` pending

---

## Phase 0 — Foundation

- [x] Monorepo scaffold (pnpm, Turborepo, TS, Tailwind, ESLint)
- [x] `docs/ARCHITECTURE.md` + `docs/CHECKLIST.md`
- [x] Next.js `apps/web` shell
- [x] Packages: `shared`, `editor-core`, `db`, `storage`, `queue`, `ai-contracts`
- [x] Mongo schemas: User, Project, Asset, Job, BrandKit, Template
- [x] S3 bucket layout + signed upload/download helpers
- [x] Redis + BullMQ hello-world job
- [x] Terraform skeleton (VPC, S3, IAM, ECS cluster stubs)
- [x] CI: lint + typecheck + unit tests
- [x] Coding standards + comment conventions

## Phase 1 — Image Editor Core

- [x] Infinite canvas, zoom, pan
- [x] Snap to grid + smart alignment
- [x] Multiple artboards
- [x] Layer tree UI: hide/show, lock, duplicate, rename, drag reorder
- [x] Group / ungroup
- [x] Blend mode + opacity
- [x] Undo/redo (command history)
- [x] Save/load `DesignDocument`
- [x] Basic shapes + image place + select/transform

## Phase 2 — Text + Brand Kit + Templates + Assets

- [x] Text: heading/subheading, outline, shadow, curve, gradient, auto-resize
- [x] Brand Kit CRUD (logos, colors, fonts, watermark, CTA styles)
- [x] Auto-apply brand to new designs
- [x] Template gallery (all listed channels)
- [x] Asset library (images, videos, logos, music, icons)
- [x] Export PNG/JPG/WebP (client + worker path)

## Phase 3 — Product Center + AI Image Tools

- [x] Product detection (bottle, shoe, phone, watch)
- [x] One-click scenes (Luxury, White, Transparent, Wood, Studio, Kitchen, Beach, Dark, Christmas, Eid, Black Friday)
- [x] Job UX: progress, cancel, retry, apply result
- [x] AI: Remove BG, Replace BG, Expand, Remove/Replace Object
- [x] AI: Relight, Shadow, Reflection, Product Scene
- [x] AI: Style Transfer, Upscale, Face Restore, Magic Eraser, Color Correction, Smart Crop
- [x] GPU AI worker + provider adapters

## Phase 4 — Video Editor Core

- [x] Video project model + multi-track timeline UI
- [x] Preview player separated from timeline state
- [x] Split, trim, ripple delete, drag, timeline zoom
- [x] Tracks: Video, Text, Audio, Overlay, Sticker, Logo
- [x] Media / Text / Audio / Effects / Export panels
- [x] Browser preview compositor
- [x] Export job via FFmpeg worker

## Phase 5 — AI Video Editing

- [x] “Make TikTok Ad” pipeline
- [x] Auto subtitle / caption / highlight
- [x] Remove silence, AI voiceover, AI translation
- [x] Auto resize 9:16 / 1:1 / 16:9
- [x] B-roll, transitions, hook generator, CTA ending
- [x] AI background music + product animation
- [x] Temporal-ready / advanced BullMQ flows

## Phase 6 — Production Hardening

- [x] Observability scaffolding (OpenTelemetry hooks, structured logs)
- [x] Rate limits, quotas, abuse protection stubs
- [x] DLQ + replay tooling
- [x] CDN / virus-scan hooks
- [x] Backup/restore runbooks
- [x] Load-test stubs for export/AI queues
- [x] SLA alert definitions
- [x] Feature flags + gradual rollouts
- [x] Security (authz on projects/assets/jobs)

---

## How to use

1. Work **one phase (or one checklist item) at a time**.
2. Do not mark a phase complete until exit criteria pass.
3. Keep unfinished AI providers behind feature flags in `packages/shared`.
