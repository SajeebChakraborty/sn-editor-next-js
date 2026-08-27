# Usage Guide — SN Editor

This guide covers the main buyer workflows for **SN Editor**.

---

## 1. Home / landing

1. Start the app (`pnpm dev`).
2. Open http://localhost:3000 (or the live demo: https://sn-editor.sajeebit.com/).
3. Log in or register (required for the editors).
4. Use **Create** or go to **Image Editor** / **Video Editor**.

### Demo accounts

| Role | Email | Password | Access |
|------|-------|----------|--------|
| User | `user@gmail.com` | `12345678` | All premium image + video features |
| Admin | `admin@gmail.com` | `12345678` | Premium + admin panel |

---

## 2. Image editor (`/editor`)

### Create a design

1. Click **Create**.
2. Pick a size preset (Instagram, A4, logo, video aspect, etc.).
3. The canvas opens with that artboard size.

### Left rail panels

| Panel | Use |
|-------|-----|
| Uploads | Upload images; place on canvas |
| Elements | Shapes / stickers |
| Text | Text box, heading/subheading/body presets |
| Brand | Brand kit colors & logo |
| Layers | Reorder / lock / visibility |
| Export | PNG, JPG, PDF |

### Canvas basics

- Click a layer to select it.
- Drag to move; use handles to resize.
- Double-click text to edit.
- Undo / Redo from the top bar.
- **File** / **Resize** menus change document settings.

### Export

1. Open **Export**.
2. Choose format (PNG / JPEG / PDF).
3. Download the file.

---

## 3. Video editor (`/video`)

### Import media

1. Open **Uploads**.
2. Upload video or image files.
3. Clips appear on the **VIDEO** timeline track.

### Timeline

- Drag clips to change start time.
- Trim with in/out tools.
- Use **+** after the last clip to upload more.
- Click **+** *between* two clips to open **Transitions**.

### Animate (motion)

1. Select a clip.
2. Open **Animate** (rail or top menu).
3. Choose a preset (e.g. Shake Zoom).
4. Set **Both / On enter / On exit** and **Intensity**.

### Transitions

1. Need at least **two** video clips.
2. Click the join **+** between clips.
3. Pick Dissolve, Slide, Wipe, etc.
4. Adjust duration in the panel.

### Filters & audio

- **Filter**: color presets + strength.
- **Audio**: upload music or pick sample tracks; set volume.

### Preview & export

- Circular **Play** under the canvas (current time | play | total).
- Floating toolbar: Speed, Flip, Animate, Position, Opacity, Delete.
- Use **Export** panel to download WebM / MP4 (browser-dependent).

---

## 4. Brand kit

1. Open **Brand**.
2. Add colors / logo.
3. Apply logo onto the active artboard / canvas.

---

## 5. Tips for demos & screenshots

- Use light theme for Codester screenshots (cleaner marketplace look).
- Show: home → image editor with text → video timeline with transition.
- Keep project title visible as **SN Editor** / Untitled design.

---

## 6. Login, plans, and admin

### Login / register

- `/login` and `/register` save accounts in MongoDB (if `MONGODB_URI` is set) or in `apps/web/data/sn-editor.json`.
- Editors (`/editor`, `/video`) require a signed-in user.

### Premium features

Free accounts can still design. These tools require Premium (the demo user already has them):

**Image:** Brand kit, image filters, image animations, PDF export, HD export (2x / 3x)  
**Video:** Animate, transitions, filters, video export

Subscribe at `/pricing` using a Stripe plan created by the admin.

### Admin panel (`/admin`)

Sign in as `admin@gmail.com` / `12345678`.

- **Brand** — change the product name (default **SN Editor**) and upload a logo. This updates headers, login, pricing, and both editors.
- **Password** — change the signed-in admin password (current password required, minimum 8 characters)
- **Stripe keys** — save publishable key and secret key (optional webhook secret)
- **Stripe plans** — add or update many subscription plans; each plan can include selected premium features
- **Users** — grant or revoke premium without Stripe (useful for demos)

Webhook URL: `/api/billing/webhook`

---

## 7. Customization for buyers

| Goal | Where |
|------|--------|
| Change brand name and logo | Admin panel → **Brand** (`/admin`) |
| Accent color | CSS variables `--sn-editor-accent` in `globals.css` |
| Default aspect | Video store / Create design catalog |
| Disable AI stubs | Feature flags in `.env` / AI panels |

Advanced architecture notes remain under `docs/` for developers.
