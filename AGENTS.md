# AGENTS.md — Truck Safety Tracker

This file provides comprehensive architectural, security, UI, testing, and operational guidance for AI coding agents and contributors working on **Truck Safety Tracker**.

---

## 1. Project Overview & Core Philosophy

**Truck Safety Tracker** is a mobile-first, passcode-protected fleet inspection and compliance document tracker designed for heavy-duty truck/trailer shops and operators.

- **Single-Worker Full-Stack Architecture:** A single TypeScript entrypoint (`src/index.ts`) serves the HTML/CSS/JS application shell, PWA manifest, Service Worker, printable QR labels, REST API, private certificate streaming, and scheduled daily reminder tasks.
- **Path-Scoped Hosting (`/truck-safety`):** All pages, API routes, cookies, and Service Worker registrations are strictly scoped under `BASE_PATH` (default `/truck-safety`) so the application can safely share a hostname with other services without route or cookie collisions.
- **Privacy & Security by Default:**
  - Zero third-party analytics, trackers, external font CDNs, or hosted notification SDKs.
  - Single shared fleet passcode authenticated via HMAC-SHA256 signed `HttpOnly`, `SameSite=Strict` cookies.
  - Private certificate files (PDF, JPEG, PNG, WebP) are validated by magic bytes and served only to authenticated sessions with `Cache-Control: no-store`.
  - No personal domains, account IDs, database UUIDs, or secret tokens may ever be committed to tracked files.

---

## 2. Technology Stack & Tooling Rules

- **Runtime:** Cloudflare Workers (`workerd`) / Standard Web Fetch & Web Crypto APIs (`crypto.subtle`). Do **not** depend on Node-only runtime APIs inside `src/` (only config files like `cloudflare.config.ts` and `vite.config.ts` or CLI scripts in `scripts/` may import `node:*`).
- **Database:** SQLite via Cloudflare D1 (`env.DB`), schema managed in `migrations/0001_init.sql` and `migrations/0002_web_push.sql`.
- **Object Storage:** Cloudflare R2 (`env.FILES`) for inspection certificates (`<= 10 MB`).
- **Build & Dev Server:** Vite 8 + `@cloudflare/vite-plugin` + TypeScript 7 (`npm run typecheck`, `npm run build`).
- **Cloudflare CLI (`cf`):**
  - When interacting with Cloudflare, use the `cf` CLI (`npm exec -- cf ...`) configured via `cloudflare.config.ts`.
  - **Do not** add a `wrangler.toml`, `wrangler.json`, or `wrangler.jsonc` file alongside `cloudflare.config.ts`, as that creates conflicting deployment sources.
  - Always use `npm exec -- cf ...` or `npm run ...` scripts so the project-local Node/CLI toolchain is used.

---

## 3. Codebase Map

| Path | Responsibility |
| --- | --- |
| `src/index.ts` | Worker `fetch` and `scheduled` handlers. Handles routing under `BASE_PATH`, cookie/bearer auth, CSRF `Origin` checks on state-changing requests, rate limiting, D1 queries, R2 upload/download streaming, and `.ics` export. |
| `src/ui.ts` | Renders the complete single-page app HTML, modern CSS (`@layer reset, tokens, base, layout, components, utilities, motion`), inline client JS, PWA `manifest.json`, SVG icons, and offline-lock-shell Service Worker (`sw.js`). |
| `src/utils.ts` | Pure business logic and crypto helpers: `hashPasscode`, `createSessionToken`, `verifySignedToken`, `calculateDaysRemaining`, `computeSafetyStatus`, `defaultExpiryDate`, `addMonthsToDate`, `enrichTruck`, `generateIcsCalendar`, and `dispatchWebhookNotification`. |
| `src/validation.ts` | Strict server-side input validation (`InputError`), calendar date validation (`validDate`), magic-byte file verification (`validateFile` for PDF/JPEG/PNG/WebP up to 10 MB), and SSRF-safe webhook URL validation (`validateWebhookUrl`). |
| `src/qr.ts` & `src/qr-ui.ts` | Server-side SVG QR code generation (`qrcode-generator`) for 1.5" × 1.5" printable unit labels (encoding **only** the unit's permanent UUID) and client-side camera/paste UUID scanner (`jsQR`). |
| `src/push.ts` & `src/push-ui.ts` | RFC 8030 / RFC 8291 (`aes128gcm`) / RFC 8292 (VAPID) native Web Push implementation using `@block65/webcrypto-web-push`, push host allowlist (SSRF protection), atomic D1 rate-limiting/daily deduplication, and the Alerts UI / `/truck-safety/push-test` diagnostic page. |
| `src/types.ts` | TypeScript interfaces for `Env`, `TruckRow`, `EnrichedTruck`, `InspectionRow`, `AttachmentRow`, and `AppSettings`. |
| `migrations/` | Additive SQL migrations for D1 (`0001_init.sql`, `0002_web_push.sql`). |
| `tests/utils.test.ts` | Vitest unit tests for date calculations, month-end expiry rules, auth token signing/expiry, `.ics` generation, and webhook formatting. |
| `tests/push.test.ts` | Vitest unit tests for Web Push encryption, VAPID signatures, push-service status handling (`201` vs `404`/`410`), and daily cron deduplication. |
| `tests/browser/*.spec.ts` | Playwright end-to-end browser tests (`app.spec.ts`, `ui.spec.ts`, `filters.spec.ts`, `qr.spec.ts`, `push.spec.ts`, `security.spec.ts`). |

---

## 4. Key Domain & Invariant Rules

When modifying features or fixing bugs, preserve these tested invariants:

1. **Expiry Date Calculation (`defaultExpiryDate`):**
   - Auto-calculated expiry dates default to the **last day of the target month** for valid intervals (`3, 6, 12, 24` months). Example: `2026-10-20` + `12` months → `2027-10-31`; `2024-02-29` + `12` months → `2025-02-28`.
   - Manual expiry date overrides and existing database records are kept exact as entered.
   - Units with "No inspection / due date" (`no_date`) store empty strings `""` for `last_inspection_date` and `next_due_date`, yielding `days_remaining: null` and `safety_status: "no_date"`.
2. **Authentication & Session Revocation:**
   - Session tokens are signed with the active passcode hash (`hmacSha256Hex(passcodeHash, ...)`).
   - Rotating the passcode in `PUT /api/settings` updates `settings.passcode_hash` in D1, which immediately invalidates all previously issued session cookies on other devices while returning a fresh `Set-Cookie` to the rotating client.
   - All state-changing cookie-authenticated requests (`POST`, `PUT`, `DELETE`) enforce same-origin verification via the `Origin` header.
3. **File Uploads & R2 Consistency:**
   - Only PDF (`%PDF-`), JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), and WebP (`RIFF....WEBP`) files `<= 10 MB` are accepted. SVG and HTML masquerading as PDFs/images must be rejected with `400`.
   - If a D1 batch insert fails after an R2 `.put()`, the uploaded R2 object must be deleted immediately in the `catch` block so no orphan blobs remain, and inspection dates must not be updated when an upload fails.
4. **QR Labels & Scanner:**
   - QR codes contain **only** the unit's lowercase UUID (`xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`). Never embed URLs, passcodes, or unit numbers in the QR payload.
   - Print stylesheet renders the label at exactly `1.5in × 1.5in` with a 4-module white quiet zone.
   - Camera access (`navigator.mediaDevices.getUserMedia`) must stop immediately when the scanner modal closes, the app locks, or the page becomes hidden.
5. **UI, Accessibility & Responsive Design (`src/ui.ts`):**
   - Maintain both `dark` (default) and `light` themes via `html[data-theme="dark" | "light"]`, persisted in `localStorage` under `truck_safety_theme`.
   - Light mode body background (`rgb(241, 245, 249)`) and input background (`rgb(248, 250, 252)`) and safety status badge contrast ratios (`>= 4.5:1` WCAG AA) are asserted by `tests/browser/ui.spec.ts`.
   - Interactive primary controls (`#btn-add-truck`, `#btn-scan-unit`, `#btn-lock`, `#filter-status`, `#search-input`) must maintain at least `44px × 44px` touch target dimensions across all viewport widths (`320px` to `1280px`) with zero horizontal page overflow (`document.documentElement.scrollWidth <= innerWidth`).
   - Desktop view switcher (`Cards` vs `Compact list`) is visible at `>= 960px` and automatically falls back to cards below `960px` without overwriting the saved desktop preference (`truck_safety_view`).

---

## 5. Development & Verification Workflow

### Commands

```bash
# 1. Typecheck Worker + Browser code (runs cf workers types && tsc)
npm run typecheck

# 2. Run fast unit tests (Vitest)
npm test

# 3. Start local standalone dev server (local D1 + R2 in .cloudflare/state)
npm run dev:local

# 4. Start local UI server proxying API calls to a remote backend
npm run dev

# 5. Run Playwright E2E suite (requires dev server running on 127.0.0.1:5173)
npm run test:e2e

# 6. Production build check
npm run build
```

### Testing Guidelines for Agents

- Always run `npm run typecheck` and `npm test` after any TypeScript or UI change.
- When editing `src/ui.ts`, `src/qr-ui.ts`, or `src/push-ui.ts`:
  - `src/ui.ts` embeds client-side JavaScript inside a template literal. Escape backticks (`\``) and template interpolations (`\${...}`) carefully so browser scripts remain valid, and verify with `tsc -p tsconfig.browser.json` (included in `npm run typecheck`).
  - Run `npm run test:e2e -- tests/browser/ui.spec.ts tests/browser/filters.spec.ts` to verify contrast, touch target sizes, theme persistence, and filter behavior.
- **Important Safety Rule for Live vs. Local Databases:**
  - `tests/browser/ui.spec.ts` and `tests/browser/filters.spec.ts` mock API routes and are safe against any server.
  - `tests/browser/security.spec.ts` rotates the passcode and tests rate limits—**only** run it against a local `dev:local` instance, never against a live production backend.

---

## 6. Keeping the Repository Clean & Open-Source Safe

- Never hardcode Cloudflare `accountId`, D1 `database_id`, personal domain names, or secret tokens in tracked files.
- Local deployment targets belong in `.cloudflare/deploy-target.json` (gitignored) or environment variables (`CLOUDFLARE_ACCOUNT_ID`, `CF_D1_DATABASE_ID`, `CF_ROUTE_PATTERN`, `CF_ROUTE_ZONE`, `REMOTE_BACKEND_URL`).
- Local secrets belong in `.dev.vars` or `.cloudflare/*.json` (both gitignored). Use `.env.example` to document required secret keys.
