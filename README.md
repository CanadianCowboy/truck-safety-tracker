# Truck Safety Tracker

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js >= 22.18](https://img.shields.io/badge/node-%3E%3D22.18.0-339933.svg)](./package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178C6.svg)](./tsconfig.json)

A sleek, mobile-first, passcode-protected fleet safety inspection and certificate tracker. Built for heavy-duty shops and fleet operators to track commercial vehicle inspection due dates, archive PDF/photo certificates privately, print 1.5" × 1.5" permanent UUID QR labels, export `.ics` schedules, and deliver automated daily reminders.

> **Disclaimer:** Truck Safety Tracker is an operational date and document organizer, **not** a legal certification that a vehicle is roadworthy or compliant with DOT / CVIP / provincial / federal regulations. Always verify inspection dates and status against physical certificates and local transport laws.

---

## Highlights

- **Streamlined Fleet Dashboard:**
  - Status badges with WCAG-compliant contrast: **Overdue** (red), **Due Today / Within Warning Window** (amber), **Up to Date** (green), and **No Date Set** (neutral).
  - Default expiry calculation automatically snaps to the **last day of the target month** (e.g., `2026-10-20` + `12 months` → `2027-10-31`) while preserving manual overrides and exact inspection dates.
  - Responsive **Cards** and desktop **Compact List** views (`>= 960px`) with instant search, vehicle-type filtering, due-date range filters, and keyboard-accessible KPI cards.
  - **Linear Carbon & Specular Glass UI:** Modern CSS architecture (`@layer`, `oklch()`, `color-mix()`, container queries, `:has()`, `@starting-style`, and View Transitions API) with persistent Dark and Light themes and `>= 44px` shop-friendly touch targets.
- **Inspection History & Private Certificate Vault:**
  - Log inspections with date, expiration, sticker/certificate number, shop name, and notes.
  - Upload **PDF, JPEG, PNG, and WebP** certificates (up to **10 MB** per file) validated by magic-byte file signatures.
  - All files are served exclusively behind authenticated session cookies (`Cache-Control: no-store`, strict CSP).
- **Permanent UUID QR Labels & In-Browser Scanner:**
  - Generate and print **1.5" × 1.5"** QR labels (including a 4-module quiet zone) containing only the unit's immutable UUID—no URLs, passcodes, or sensitive data embedded on the sticker.
  - Scan labels in-app using the device camera (decoded locally in the browser via `jsQR`) or paste a UUID directly.
- **Reminders & Calendar Export:**
  - **Native Web Push (RFC 8030 / 8291 / 8292):** Zero-dependency Web Crypto push notifications (`@block65/webcrypto-web-push`) with no Firebase SDK or third-party push platform required.
  - **Outgoing Webhooks:** Optional daily digest and test alerts for **ntfy**, **Discord**, **Slack**, or generic HTTPS endpoints.
  - **iCalendar (`.ics`) Export:** RFC 5545 calendar feed with 14-day and 7-day `VALARM` reminders.
- **Zero-Account Passcode Security:**
  - Single shared fleet passcode hashed with HMAC-SHA256 in the database.
  - `HttpOnly`, `SameSite=Strict` signed session cookies (30-day TTL). Rotating the passcode immediately revokes all existing sessions across other devices.

---

## Requirements

| Requirement | Version / Notes |
| --- | --- |
| **Node.js** | **>= 22.18.0** (required for native TypeScript config loading) |
| **npm** | **>= 10.x** |
| **Cloudflare Account** *(optional)* | Only needed if deploying to Cloudflare Workers + D1 + R2. Not required for local-only or self-hosted deployments. |
| **Modern Browser** | Chrome, Edge, Firefox, Safari, or Samsung Internet (HTTPS required on non-localhost origins for Service Worker, Web Push, and Camera QR scanning). |

---

## Quick Start (Local Development & Local-Only Use)

You do **not** need a Cloudflare account or cloud resources to run Truck Safety Tracker. The project includes a complete local SQLite (D1) and local object storage (R2) runtime powered by `workerd` / Miniflare that persists data to disk.

### 1. Clone and install dependencies

```bash
git clone https://github.com/CanadianCowboy/truck-safety-tracker.git
cd truck-safety-tracker
npm ci
```

### 2. Configure local secrets (`.dev.vars`)

Copy the example environment file and generate a strong `SESSION_SECRET`:

```bash
cp .env.example .dev.vars
```

Edit `.dev.vars`:

```ini
INITIAL_PASSCODE=passcode
SESSION_SECRET=replace-with-a-random-32-byte-base64url-secret
```

*(Optional)* If you want to test **Native Web Push** locally, generate VAPID keys and append them to `.dev.vars`:

```bash
node scripts/generate-push-secrets.mjs
node --input-type=module <<'NODE'
import { readFile, appendFile } from 'node:fs/promises';
const values = JSON.parse(await readFile('.cloudflare/push-secrets.json', 'utf8'));
await appendFile('.dev.vars', '\n' + Object.entries(values).map(([k, v]) => `${k}=${v}`).join('\n') + '\n', { mode: 0o600 });
NODE
```

### 3. Apply local database migrations

```bash
npm exec -- cf d1 migrations apply truck-safety-db --local --persist-to .cloudflare/state
```

### 4. Start the local server

```bash
npm run dev:local
```

Open **`http://localhost:5173/truck-safety/`** (or the port printed in your terminal) and sign in with your `INITIAL_PASSCODE` (`passcode` by default). Immediately open **Tools → Settings** to set a strong passcode.

---

## Deployment Options

Not everyone wants to host on Cloudflare or expose their fleet tracker to the public internet. Choose the deployment mode that fits your shop:

### Option A: Local-Only / Shop LAN Self-Hosting (No Cloud Account Required)

You can run Truck Safety Tracker entirely on a local shop PC, Mac Mini, Raspberry Pi / Linux mini-PC, or home/office NAS with all SQLite rows and uploaded PDF/image certificates stored on a local directory.

1. Follow steps **1–3** in the Quick Start above.
2. Run the local runtime with persistent storage on disk:
   ```bash
   npm exec -- cf dev --persist-to /var/lib/truck-safety-tracker/state
   ```
   *(Or keep `./.cloudflare/state` inside the project directory for a portable single-folder install.)*
3. **Accessing from phones/tablets on shop Wi-Fi (LAN):**
   - Put a local reverse proxy in front of the server—such as **Caddy** (`tls internal`), **Nginx**, or **Tailscale (`tailscale serve`)**—so mobile browsers connect over `https://`.
   - **Why HTTPS matters on LAN:** Browsers allow Service Workers, Camera QR scanning (`getUserMedia`), and Web Push on `http://localhost`, but require `https://` when accessed via a LAN IP or local hostname from a phone or tablet.
   - Example **Caddyfile** for a local shop server:
     ```caddyfile
     safety.shop.internal {
       tls internal
       reverse_proxy 127.0.0.1:8787
     }
     ```
4. **Local Backups:** Stop or snapshot the service and back up the `--persist-to` directory (`.cloudflare/state`), which contains both the SQLite database and uploaded certificate blobs.

---

### Option B: Cloudflare Workers + D1 + R2 (Serverless Cloud Deployment)

This is the native production architecture: a single Cloudflare Worker serves the UI, REST API, PWA manifest, and Service Worker while storing relational data in **Cloudflare D1** and certificates in a private **Cloudflare R2** bucket.

#### 1. Authenticate the Cloudflare CLI

```bash
npm exec -- cf auth login
npm exec -- cf auth whoami
```

#### 2. Create your D1 database and R2 bucket

```bash
npm exec -- cf d1 create truck-safety-db
npm exec -- cf r2 buckets create truck-safety-files
```

#### 3. Configure your deployment target

You can pass your target parameters via environment variables or create a gitignored `.cloudflare/deploy-target.json` file:

```json
{
  "accountId": "YOUR_CLOUDFLARE_ACCOUNT_ID",
  "d1DatabaseId": "YOUR_D1_DATABASE_UUID",
  "routePattern": "safety.example.com/truck-safety*",
  "routeZone": "example.com"
}
```

*(If `routePattern` and `routeZone` are omitted, `cloudflare.config.ts` defaults to deploying on your `*.workers.dev` subdomain.)*

#### 4. Apply production D1 migrations

```bash
npm exec -- cf d1 migrations apply YOUR_D1_DATABASE_UUID --dry-run
npm exec -- cf d1 migrations apply YOUR_D1_DATABASE_UUID
```

#### 5. Set production secrets and deploy

Create a private secrets JSON file (e.g. `.cloudflare/prod-secrets.json`, mode `0600`, gitignored) containing `INITIAL_PASSCODE`, `SESSION_SECRET`, and optional Web Push keys (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PUSH_SEND_TOKEN`), then build and deploy:

```bash
npm run build
npm exec -- cf deploy --prebuilt --secrets-file .cloudflare/prod-secrets.json
```

Subsequent code deploys (once secrets are stored on the Worker) only require:

```bash
npm run deploy
```

---

### Option C: Alternative Self-Hosted / Container / Node.js / VPS Deployment

Because the codebase uses standard Web Fetch `Request`/`Response` APIs, standard Web Crypto (`crypto.subtle`), standard SQLite SQL (`migrations/0001_init.sql` and `migrations/0002_web_push.sql`), and a simple key-value blob interface (`put`, `get`, `delete`), you can run or adapt it outside Cloudflare in two ways:

#### 1. Docker / Linux Systemd with `workerd` (Zero Code Changes)
Run the included `workerd` runtime inside a Docker container or `systemd` unit on any Linux VPS (Hetzner, DigitalOcean, AWS Lightsail, Proxmox, Synology NAS):
- Mount a persistent Docker volume at `/app/.cloudflare/state`.
- Mount or pass `.dev.vars` with `INITIAL_PASSCODE` and `SESSION_SECRET`.
- Run `npm exec -- cf d1 migrations apply truck-safety-db --local --persist-to /app/.cloudflare/state` on container startup, followed by `npm exec -- cf dev --persist-to /app/.cloudflare/state`.
- Expose behind Traefik, Caddy, Nginx, or Cloudflare Tunnel.

#### 2. Native Node.js / Bun / Deno Adapter (Portable SQLite + Filesystem/S3)
If you want to embed `src/index.ts` into a plain Node.js (`@hono/node-server` or `node:http`), Bun, or Deno server without `workerd`:
- `src/index.ts` exports a standard `{ fetch(request, env, ctx), scheduled(controller, env, ctx) }` handler.
- Provide a thin `env` adapter implementing:
  - `env.DB`: A wrapper around `node:sqlite` or `better-sqlite3` supporting `.prepare(sql).bind(...).all() / .first() / .run()` and `.batch([...])`.
  - `env.FILES`: A wrapper around `node:fs/promises` (local disk directory) or `@aws-sdk/client-s3` (MinIO / Backblaze B2 / AWS S3) supporting `.put(key, stream, meta)`, `.get(key)`, and `.delete(key)`.
  - `env.LOGIN_LIMITER`, `env.WRITE_LIMITER`, `env.PUSH_LIMITER`: An in-memory token bucket returning `{ outcome: { limit( { key } ): Promise<{ success: boolean }> } }`.
  - Standard `node-cron` or OS `crontab` calling `worker.scheduled({ scheduledTime: Date.now(), cron: "0 12,13 * * *" }, env, ctx)` for daily reminders.

---

### Hybrid Local UI Preview + Remote Backend

If you already have a deployed backend and want to test UI changes locally against live data without deploying:

```bash
REMOTE_BACKEND_URL=https://your-domain.example.com npm run dev
```

Vite serves the local UI at `http://127.0.0.1:5173/truck-safety/` and proxies `/truck-safety/api/*` requests to `REMOTE_BACKEND_URL`, rewriting cookie flags so `HttpOnly` sessions work seamlessly on localhost.

---

## Optional Unit QR Labels

Open any unit's **Details / QR** modal and click **Print QR label**:
- Prints a **1.5 × 1.5 inch** QR-only label (including a 4-module white quiet zone).
- Print at **100% / Actual size** with browser headers and footers disabled.
- The QR code encodes **only the unit's permanent UUID** (never a URL, passcode, session token, or unit number), so renaming a unit or changing domains never invalidates physical stickers on your trucks/trailers.
- Use **Scan** in the header to scan with a phone camera (decoded locally in-browser) or paste a UUID.

---

## Native Web Push & Outgoing Webhooks

- **Native Web Push:** Open **Tools → Alerts → Enable notifications** on any supported browser. Daily checks run at **7:00 AM America/Winnipeg** (DST-aware) and send a privacy-safe alert if any active unit is overdue or within the warning window. Full protocol and setup details are in [`PUSH_NOTIFICATIONS.md`](./PUSH_NOTIFICATIONS.md).
- **Webhooks:** Open **Tools → Settings** to configure an optional **ntfy**, **Discord**, **Slack**, or generic HTTPS webhook URL and test delivery with **Send Test**.

---

## Verification & Testing

```bash
# Generate Worker types and typecheck both Worker and Browser TypeScript
npm run typecheck

# Run unit tests (date math, month-end defaults, auth tokens, RFC 8291 Web Push, webhooks)
npm test

# Install Chromium for Playwright E2E tests (first time only)
npx playwright install chromium

# Run Playwright browser tests (start a local server in another terminal first)
npm run test:e2e
```

---

## Project Structure

```text
├── cloudflare.config.ts        # Typed Cloudflare Worker, D1, R2, rate-limit & cron config
├── vite.config.ts              # Vite + @cloudflare/vite-plugin config & optional remote API proxy
├── migrations/
│   ├── 0001_init.sql           # Core D1 schema: trucks, inspections, attachments, settings
│   └── 0002_web_push.sql       # Native Web Push subscriptions & delivery state schema
├── public/truck-safety/        # Static PWA icons
├── scripts/
│   └── generate-push-secrets.mjs # Generates P-256 VAPID keys & PUSH_SEND_TOKEN
├── src/
│   ├── index.ts                # Worker fetch & scheduled handlers, REST API, auth & R2 streaming
│   ├── ui.ts                   # Single-page application HTML/CSS/JS, PWA manifest & Service Worker
│   ├── qr.ts / qr-ui.ts        # SVG QR label renderer & in-browser camera/paste scanner UI
│   ├── push.ts / push-ui.ts    # RFC 8030/8291/8292 Web Push implementation & Alerts modal UI
│   ├── utils.ts                # Auth HMAC tokens, date math, .ics generator & webhook dispatcher
│   ├── validation.ts           # Strict input, date, magic-byte file & SSRF webhook validation
│   └── types.ts                # Shared TypeScript interfaces
└── tests/
    ├── utils.test.ts           # Core logic unit tests
    ├── push.test.ts            # Web Push encryption, VAPID, rate-limit & dedupe unit tests
    └── browser/                # Playwright E2E tests (app, UI, filters, QR, push, security)
```

---

## License

Released under the [MIT License](./LICENSE).
