# Native Web Push

## Paths and architecture

This app uses standard Web Push (RFC 8030), `aes128gcm` encryption (RFC 8291), and VAPID (RFC 8292) via `@block65/webcrypto-web-push` **2.x**. It uses Web Crypto, not Node APIs; no `nodejs_compat` flag, notification platform, Firebase SDK, or WebSocket is needed. Chrome/Samsung may supply a Google push-service endpoint as part of the browser protocol; that is not an integration with a Firebase SDK or account.

At the owner's explicit request, paths stay scoped to the existing app on the shared hostname:

- Service worker: **`/truck-safety/sw.js`**, scope `/truck-safety/` (not `/sw.js`).
- APIs: **`/truck-safety/api/push/*`** (not root `/api/push/*`).
- Compatibility/test page: **`/truck-safety/push-test`**, using the existing passcode gate.

Do not create root routes or widen the service-worker scope: other apps share this host. The existing offline shell is retained; fleet APIs and files are never cached. PWA service-worker registration on page load is gated on both ServiceWorker and PushManager support; notification permission/subscription happen only after the user clicks Enable notifications.

The user unlocks, opens Tools → Alerts → Enable notifications, explicitly allows permission, and the browser registers the service worker and subscribes with the public VAPID key. The full PushSubscription JSON is sent to the Worker. The private VAPID key and server send token never enter HTML, public assets, API responses, or browser storage. The public key is intentionally returned by the authenticated config endpoint: browsers must have it to subscribe. All keys are configured as Worker secrets, not hardcoded in frontend source.

D1 migration `migrations/0002_web_push.sql` adds `push_subscriptions`: server-assigned user ID, unique endpoint, p256dh/auth keys, optional expiry, creation date, last accepted date, latest attempt/status, test rate-limit timestamp, and daily dedupe date. This app has one shared passcode-protected **fleet** identity, not individual user accounts. Every signed-in operator has fleet-wide permissions; delete-all intentionally affects all devices. Adding individual accounts later requires replacing this ownership model, not trusting a client-supplied user ID.

Send paths use privacy-safe, server-defined text, no unit details. Payload JSON is small; the library pads the encrypted body to exactly **4096 bytes**, the Web Push supported size (rather than strictly below 4 KiB). TTL is 300 seconds for tests or 4 hours for reminders, urgency normal, with separate test/daily topics. HTTP **201** is accepted; 404/410 deletes the stale subscription and all its metadata. Other statuses/network failures are surfaced and recorded (0 = transport failure), not misreported as delivered. Logs contain opaque subscription hashes and status only, never endpoints, keys or body text. There is no display/read receipt.

Subscribing/unsubscribing/status/config/test/send require the existing session. Same-origin cookie write protection is retained. A separate bearer secret can access **send only**. Input is bounded/validated, P-256 keys are validated, and destinations are restricted to known Google/Mozilla/Microsoft/Apple browser push-service hosts to avoid SSRF; redirects are forbidden and sends time out after 10 seconds. If a browser changes push-service hosts, review and extend the allowlist. Tests are limited to one per device/minute in D1 plus per-IP Workers rate limiting. General write/send rate limits also apply.

## Daily schedule

Cloudflare triggers at **12:00 and 13:00 UTC**. The handler uses `America/Winnipeg` and only acts in the **07:00 local hour**, so daylight saving is automatic. It checks fleet dates at send time; sends only if non-inactive units are overdue or within the warning window. D1 atomically claims each device/local-date before sending, avoiding duplicate daily sends on invocation replay. Delivery is **at most one daily attempt per device**; failed daily sends are not retried automatically, and a missed cron is not caught up. The reminder is best-effort, not a legal/compliance guarantee. The existing optional webhook runs at the same local time only if separately configured; native push works with its URL blank.

## Deploy this existing project

The project uses `cloudflare.config.ts` and the `cf` CLI, not Wrangler. It declares D1 and R2 bindings, VAPID/send secrets, rate limiters, and both UTC schedules. **Do not add a second Wrangler config**, which would create conflicting deployment sources. The equivalent Wrangler binding would be `d1_databases` with `binding: DB`, `database_name: truck-safety-db`, `database_id: <YOUR_D1_DATABASE_ID>`, and `triggers.crons: ["0 12,13 * * *"]`; retain existing routes/bindings if separately migrating tools.

1. Install and generate a stable VAPID identity:
   ```bash
   npm ci
   node scripts/generate-push-secrets.mjs
   ```
   This writes `.cloudflare/push-secrets.json`, mode 0600, ignored by git. It refuses to overwrite an existing identity. The subject defaults to the real HTTPS app URL; set `VAPID_SUBJECT=mailto:you@example.com` if desired. Keep a secure backup. Do not regenerate on routine deploys; changing the VAPID identity requires devices to subscribe again.
2. Configure local secrets **without printing their values** (preserves existing passcode/session secrets):
   ```bash
   node --input-type=module <<'NODE'
   import { readFile, appendFile } from 'node:fs/promises';
   const values = JSON.parse(await readFile('.cloudflare/push-secrets.json', 'utf8'));
   await appendFile('.dev.vars', '\n' + Object.entries(values).map(([k,v]) => `${k}=${v}`).join('\n') + '\n', { mode: 0o600 });
   NODE
   npm exec -- cf d1 migrations apply truck-safety-db --local --persist-to .cloudflare/state
   npm run dev:local
   ```
   Run the append command only once, or update existing entries instead of creating duplicate keys.
3. Run checks, then apply the additive production schema:
   ```bash
   npm run typecheck
   npm test
   npm run test:e2e
   npm run build
   npm exec -- cf d1 migrations apply <YOUR_D1_DATABASE_ID> --dry-run
   npm exec -- cf d1 migrations apply <YOUR_D1_DATABASE_ID>
   ```
4. Set the Worker secrets and deploy Worker + site + service worker **together**:
   ```bash
   npm exec -- cf deploy --prebuilt --secrets-file .cloudflare/push-secrets.json
   ```
   This uploads `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, and `PUSH_SEND_TOKEN`. Existing `INITIAL_PASSCODE` and `SESSION_SECRET` must be preserved. There is no separate site deployment: HTML, API and service worker come from the same Worker. Static icons come from `public/truck-safety/`. HTTPS is already configured on the existing domain.
5. Open the compatibility page on a **real Android device**, unlock, Enable notifications and Send test notification. Check the native Android notification tray. Close the tab/Chrome normally; use the external send example below from another device/system to verify reception while Chrome is closed. Confirm click opens/focuses this app and still requires unlocking if no valid session. Repeat in Chrome, Firefox, Samsung Internet and Edge where available. Wait for the next 7 AM Winnipeg reminder with a due unit to verify scheduled end-to-end delivery. A headless test cannot prove physical Android background behavior.

## Endpoints

All paths below start with `/truck-safety/api/push`:

| Method/path | JSON body | Purpose |
|---|---|---|
| GET `/config` | none | authenticated public key, configuration state, schedule |
| POST `/subscribe` | full `PushSubscription.toJSON()` | upsert by unique endpoint |
| POST `/unsubscribe` | `{ "endpoint": "https://..." }` | delete one device and its metadata |
| POST `/unsubscribe` | `{ "all": true }` | delete all fleet devices and metadata |
| POST `/status` | `{ "endpoint": "https://..." }` | this subscription's latest service acceptance status |
| POST `/test` | `{ "endpoint": "https://..." }` | send privacy-safe test to this device |
| POST `/send` | `{ "event": "reminder" }` | send privacy-safe reminder to all fleet subscriptions |

Disable notifications unsubscribes in the browser and deletes server data. If the server deletion fails, only the endpoint is kept locally for retry; keys are not persisted by app JS. Delete-all removes D1 subscription metadata for every device. Other devices retain their browser permission/subscription object but no longer receive sends; Enable notifications registers them again. Log entries are subject to Cloudflare observability retention, contain no push credentials, and cannot be deleted per subscription through this UI. Logging may be disabled at the Worker configuration level for stricter retention policies.

### Another Worker or external system

Copy `PUSH_SEND_TOKEN` securely from the private secret file into the **sending system's secret store**, never its frontend. Example from another Worker:

```js
const response = await fetch('https://your-domain.example.com/truck-safety/api/push/send', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${env.SAFETY_PUSH_SEND_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ event: 'reminder' }),
});
if (!response.ok) throw new Error(`Push request failed: ${response.status}`);
const { accepted, removed, failed } = await response.json();
```

Equivalent shell request (read the token securely into the environment first; don't paste it into history):

```bash
curl --fail-with-body 'https://your-domain.example.com/truck-safety/api/push/send' \
  -H "Authorization: Bearer $SAFETY_PUSH_SEND_TOKEN" \
  -H 'Content-Type: application/json' --data '{"event":"reminder"}'
```

Send responses report accepted/removed/failed counts. A 502 can include partial successes; retrying may produce duplicate external reminders. Daily cron dedupe applies only to the daily job, not arbitrary external events. Rotate the send token independently of VAPID keys if compromised.

## Automated verification versus device testing

Unit tests independently verify the VAPID JWT signature and decrypt the generated RFC 8291 body, check its 4096-byte size, provider statuses, cleanup, rate-limit claims, daily dedupe and DST dates. Browser tests cover permission UI states, scoped registration, full subscription JSON, auth/validation, D1 storage/deletion, and exact/manual date behavior. The installed service worker is also exercised by a real Chromium CDP-injected push, **capturing only its OS-facing `showNotification` call**: this host's headless/incognito Chromium denies native notification permission even when permission is configured by automation. This is not proof of native display, real push-service acceptance, browser-closed Android delivery, or a scheduled 7 AM device receipt. Those remain real-device checks.

## Compatibility and limits

- Chrome, Firefox, Samsung Internet and Edge Android are targets, not a guarantee for every device/version/vendor setting. Unsupported or insecure contexts show an explanation without prompting.
- Edge Android may return a subscription but fail to display alerts. A rejected service response is surfaced; **even 201 cannot detect a later device-side failure**. The UI recommends Chrome, Firefox or Samsung Internet if alerts do not arrive.
- Permission is requested once by the browser, not on page load; a denial must be changed in browser/Android settings. Automatic resubscription after expired/rotated browser keys requires reopening and enabling; stale server rows are deleted on 404/410.
- Tabs need not stay open. Force-stopping Chrome, force-stopping the browser app, battery/data saver restrictions, Android notification settings, connectivity, and vendor background-process policies can block/delay delivery.
- No notification platform, no WebSocket keepalive, no receipt tracking. Keep the calendar/manual dashboard for critical inspection deadlines.
