# Installation — SN Editor

## 1. System requirements

| Requirement | Version |
|-------------|---------|
| Node.js | **20.x or newer** (LTS recommended) |
| Package manager | **pnpm 10+** (`npm i -g pnpm`) |
| OS | Windows 10/11, macOS, or Linux |
| RAM | 8 GB+ recommended for video export |
| Browser | Chrome / Edge / Firefox (latest) |

Optional (production / workers):

- MongoDB (Atlas or local)
- Redis (BullMQ workers)
- AWS S3 (asset storage)

For local demo, the web app runs with **in-memory stores** for designs when Mongo/S3 are not configured. **Users, plans, and Stripe settings** persist to MongoDB when `MONGODB_URI` is set, or to `apps/web/data/sn-editor.json` otherwise.

## 2. Install dependencies

From the project root (`SN-Editor-Codester`):

```bash
pnpm install
```

If `pnpm-lock.yaml` fails after a clean rebrand, delete it and run `pnpm install` again.

## 3. Environment

```bash
cp .env.example .env.local
```

Minimum for local development:

```env
AUTH_SECRET=sn-editor-dev-auth-secret-change-in-production
```

Optional production keys (see `.env.example`):

- `MONGODB_URI` — persist users/plans in MongoDB
- `REDIS_URL`
- `AWS_REGION` / `S3_BUCKET`
- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` (or set them in **Admin → Stripe keys**)

## 4. Run development server

```bash
pnpm dev
```

Then open:

- Home: http://localhost:3000
- Image editor: http://localhost:3000/editor
- Video editor: http://localhost:3000/video
- Pricing: http://localhost:3000/pricing
- Admin: http://localhost:3000/admin

Live demo (hosted): https://sn-editor.sajeebit.com/

## 5. Production build

```bash
pnpm build
pnpm --filter @sn-editor/web start
```

## 6. Project structure (overview)

```
SN-Editor-Codester/
├── apps/web/                 # Next.js UI (image + video editors)
├── apps/workers/             # Optional background workers
├── packages/                 # Shared libraries (@sn-editor/*)
├── Documentation/            # This documentation set
├── .env.example
├── package.json
└── README.md
```

## 7. Common install issues

| Problem | Fix |
|---------|-----|
| `pnpm: command not found` | Install pnpm: `npm i -g pnpm` |
| Node version error | Upgrade to Node 20+ |
| Port 3000 in use | Stop other apps or `next dev --port 3001` |
| Workspace package not found | Run `pnpm install` from **root**, not only `apps/web` |
| Lockfile mismatch | Delete `pnpm-lock.yaml` + `node_modules`, then `pnpm install` |

## 8. Demo login

Seeded accounts (created on first boot):

| Role | Email | Password |
|------|-------|----------|
| User (premium) | `user@gmail.com` | `12345678` |
| Admin (premium) | `admin@gmail.com` | `12345678` |

The demo **user** account has **all premium features unlocked** (brand kit, HD/PDF export, video animate, transitions, filters, video export). The **admin** account can change brand name/logo, change password, and manage Stripe keys, plans, and users at `/admin`.

New registrations start on the free plan and can subscribe from `/pricing`.
