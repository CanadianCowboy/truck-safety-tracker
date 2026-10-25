# Real-data verification

No suite seeds fleet records, fabricates VIN results, intercepts API responses, replaces browser/device APIs, or substitutes database/provider behavior.

## Run

Start the actual app/backend and apply its normal migrations first. Do not seed it for testing.

```bash
npm run typecheck
npm test
APP_URL=http://127.0.0.1:5180 APP_PASSCODE=<actual-passcode> npm run test:e2e
npm run build
```

`npm test` includes deterministic pure date/validation/HMAC logic and one real NHTSA request. Browser VIN tests also contact NHTSA through the actual Worker. They use the publicly documented VIN `1M8GDM9AXKP042788`, never save it, and apply real decoded values only to an unsaved form. Provider failures fail the check; no cached/fabricated fallback is supplied.

VIN browser checks verify the initial **not checked** state, **checking** during an actual request, **connected (last lookup)** only after a real successful response, and the full NHTSA result persisted only to an explicitly saved unit. The expandable decoder lists every one of the 154 returned fields, including empty values. Unit details show the saved decode; editing the VIN clears stale decode data unless the new matching decode is saved. Invalid client input must not issue a lookup or claim a provider outage. Provider-unavailable/retry and browser-deadline branches are not verified unless a real failure occurs; they are never exercised with intercepted or fabricated responses.

Browser tests require an explicit `APP_PASSCODE`. Credentials are never written to tracked files. A shared worker session minimizes login attempts; on a real 429, the suite respects Retry-After and retries once. Browser tests do not change fleet records, settings, credentials, files or subscriptions. The security check ends only its own browser session.

The suite reads actual fleet records for filters, enrichment, calendars, duplicate warnings and unit details. With no units, it validates the actual empty state. QR implementation tests remain available but the feature is hidden from the shipped UI. No temporary units are created. Do not run against a changing fleet if exact snapshot comparisons would be unreliable.

## Coverage boundaries after removing mocked tests

These are **not** proven by the current read-only suite:

- Successful create/update/delete flows, persisted inspection defaults, certificate uploads/downloads/deletion and R2 cleanup after database failure.
- Cross-device session revocation after passcode rotation (HMAC revocation/expiry logic itself remains covered with real cryptography).
- Warning display for actual duplicate VINs when no duplicate exists in the real fleet; partial provider responses, timeouts, oversized bodies, redirects and provider status failures unless NHTSA actually returns them.
- All date-filter boundary combinations, per-status contrast and historical inspection/certificate lists when the real fleet lacks relevant records.
- Push encryption interoperability, native receipt/display, expired subscriptions, provider status handling, atomic rate limits/daily deduplication and service-worker notification clicks.
- Camera permission denial, frame decoding and stream shutdown on actual camera hardware.
- A failed refresh while cached records are visible, validation of HTML-like stored text, and overwrite confirmation when no real differing values are available.

Those require actual relevant fleet data, a real enrolled push device/camera, or separately authorized controlled integration work. Do not recreate fake records, fake endpoints, fake permissions, simulated notifications or synthetic provider responses to cover them. Do not weaken an assertion or skip a failing service check to make the suite green.
