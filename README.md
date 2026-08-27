# SN Editor

**SN Editor** is a modern web-based **image + video design editor** built with Next.js, React, Konva, and TypeScript. Create social posts, ads, logos, and short-form videos from one product.

> This folder is the **Codester distribution package**. Brand name: **SN Editor**. Live demo: **https://sn-editor.sajeebit.com/**

## Live demo

**https://sn-editor.sajeebit.com/**

| Role | Email | Password |
|------|-------|----------|
| User (premium) | `user@gmail.com` | `12345678` |
| Admin | `admin@gmail.com` | `12345678` |

## Quick start

**Requirements:** Node.js 20+, [pnpm](https://pnpm.io) 10+

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

- Image editor: `/editor` (login required)
- Video editor: `/video` (login required)
- Pricing: `/pricing`
- Admin: `/admin` (`admin@gmail.com` / `12345678`) — brand name/logo, password, Stripe, users

Demo user (all premium features): `user@gmail.com` / `12345678`

Full setup: see [`Documentation/Installation.md`](Documentation/Installation.md).

## What’s included

| Area | Features |
|------|----------|
| Image editor | Layers, text, shapes, brand kit, uploads, filters, export (PNG/JPG/PDF) |
| Video editor | Timeline, transitions, animate, filters, audio, export |
| Admin | Brand name/logo, admin password, Stripe plans/keys, users |
| Architecture | pnpm + Turborepo monorepo (`apps/web` + shared packages) |

## Documentation (required for Codester)

| File | Purpose |
|------|---------|
| [Documentation/Installation.md](Documentation/Installation.md) | Install & environment |
| [Documentation/Usage.md](Documentation/Usage.md) | How to use every major feature |
| [Documentation/Support.md](Documentation/Support.md) | Support & author |
| [Documentation/Changelog.md](Documentation/Changelog.md) | Version history |
| [Documentation/REVIEWER.txt](Documentation/REVIEWER.txt) | Demo logins for Codester reviewers |
| [CODESTER_UPLOAD_CHECKLIST.md](CODESTER_UPLOAD_CHECKLIST.md) | What to upload on Codester |
| [CODESTER_LISTING.txt](CODESTER_LISTING.txt) | Ready-to-paste item description |

## License

See `Documentation/License.txt`. Buyers receive rights according to the Codester regular license you select at upload time.

## Note

Internal package names use the npm scope `@sn-editor/*`. The product brand displayed in the UI is **SN Editor**.
