# Coding Standards

## Goals

Clean, commented, flexible, and scalable code. First-service quality: no half-broken features in production.

## TypeScript

- `strict: true` everywhere.
- Prefer explicit public API types in package `index.ts`.
- Validate external input with **Zod** at API / worker boundaries.
- No `any` unless justified with a comment.

## Package boundaries

- `apps/web` is thin UI — domain logic lives in `packages/*`.
- Workers consume `@sn-editor/ai-contracts` and `@sn-editor/queue` only; never import React.
- Do not cross-import between `image-engine` and `video-engine` except via `editor-core` / `shared`.

## Comments

1. **File-level** JSDoc on engines, workers, and stores describing purpose and non-goals.
2. **Public APIs** — every exported function/type in packages gets JSDoc (`@param`, `@returns`, side effects).
3. Prefer **why** comments over **what** comments.
4. Mark temporary stubs with `// STUB:` and a ticket/phase reference.

## Naming

- Tool IDs and job types come from `@sn-editor/ai-contracts` enums — no magic strings.
- Zustand stores: `useXxxStore`.
- Commands: past tense verb (`RenameLayer`, `SetOpacity`).

## Features & flags

- Incomplete tools stay behind flags in `@sn-editor/shared/featureFlags`.
- Default new AI tools to `false` until provider + worker + UI are wired end-to-end.

## Testing

- Unit tests for `editor-core` history, snap math, timeline ops.
- Integration tests for job enqueue → worker → status update (mocked Redis/S3 in CI).

## Style

- ESLint + Prettier.
- Tailwind for UI; CSS variables for brand tokens in `apps/web`.
- Prefer small pure functions over god-classes.
