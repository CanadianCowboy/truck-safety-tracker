# Coming-soon website

A separate bilingual Cloudflare Worker. It has no personal fleet bindings, uploads, checkout, email sender, or mock fleet records. Use the repository's installed npm toolchain; no additional runtime dependency is required.

## Configuration

Ignored `.cloudflare/coming-soon-target.json` at the repository root supplies `accountId`, `databaseId`, `hostname`, and `contactEmail`. Never commit that file or copy these values into source. The D1 database must be dedicated to launch interest, never the tracker database.

From this directory:

```bash
npm run typecheck
npm run build
npm run dev
# Separate local server: http://127.0.0.1:5181
```

Apply `schema.sql` to the separate local/remote database through the project-local `cf d1 raw` CLI before using signup. `cf deploy --dry-run` must show only `SIGNUPS`, `SIGNUP_LIMITER`, and `CONTACT_EMAIL`. Deployment configuration uses a custom domain, not the existing tracker route, and disables workers.dev/preview URLs.

```bash
npm exec -- cf deploy --dry-run
# Only with explicit publication authorization:
npm run deploy
```

The nested manifest repeats the repository's existing build-tool versions because `cf` checks the current manifest for a supported dev server. Packages resolve from the repository installation; no independent install/lockfile has been introduced. `cf` currently emits a nested-project lockfile warning, but builds and dry runs succeed.

## Checks

From the repository root, with the local server running:

```bash
node marketing/tests/check.mjs
# Optional real signup/removal using an address you control; does NOT send mail:
SIGNUP_TEST_EMAIL=<authorized-address> node marketing/tests/check.mjs
# Read-only live checks:
SITE_URL=https://<approved-hostname> node marketing/tests/check.mjs
```

The script drives the real DOM and HTTP API without interception, screenshots, mock providers, or fleet records. It checks both languages, language preference persistence, 320–1280px overflow/touch targets, headers, validation, and absence of tracker API routes. Set `SIGNUP_TEST_EMAIL` only to an authorized address: this creates then removes a real signup. Do not run concurrent write checks for the same address or delete a pre-existing visitor request. Verify database state separately when checking persistence/cleanup.

Also run the root `npm run typecheck`, `npm test`, and `npm run build` to guard the unchanged tracker. No existing fleet browser suite is required for this isolated page; do not log into or modify the personal fleet to verify marketing.

## Interest-list behavior

- Database-only interest capture: email, language, creation/expiry time, consent version, and SHA-256 of a random 256-bit removal token.
- **No email verification, confirmations, reminders, or launch announcements.** No sending provider/binding exists. The UI explicitly says this.
- Sending a launch announcement is NOT implemented or authorized. Establish sender identity/mailing details, applicable consent, sending service, unsubscribe and suppression handling before enabling it. Unverified signups must not be treated as a verified mailing list.
- A new signup receives a removal URL with its token in the fragment; fragments are not sent in HTTP requests. The removal page clears the fragment, then deletes via a same-origin POST after confirmation. Do not put removal links in analytics or logs.
- Duplicate email submissions receive the same generic response but do not replace existing credentials, language, consent, or expiry. The returned link for a duplicate has no matching record; the page tells existing requesters to use the original link or contact support. This avoids revealing membership or allowing strangers to revoke someone else's removal credential.
- Records expire after 365 days; daily cleanup removes expired requests and old daily counters. Cloudflare recovery history may retain deleted records for its applicable period. Any future restore must reapply known deletion requests before serving/reusing the list.
- Platform limit: 5 write requests/minute/IP, plus an atomic database limit of 200 valid signup attempts/day and 5,000 total stored requests. No CAPTCHA or zero-abuse guarantee is claimed.
- The signup endpoint requires same-origin `Origin`, form-encoded input, explicit unchecked-by-default consent, and a body no larger than 4 KiB. Removal uses the same IP limiter. There is no public list/export endpoint.
- No cookies, external fonts, analytics, or third-party scripts. Only language preference uses browser localStorage. Cloudflare necessarily processes request/connection data; do not describe the site as collecting no data.
- Contact/manual removal and access to the list are through the operator and authorized Cloudflare D1 access. Do not paste subscriber lists into public issues, logs, or tracked files. Do not remove a request solely on an unverified stranger's claim to own an email.

## Current scope

Pricing is not published; it remains a model in `SAAS_PLAN.md`. Planned hosted features are identified as coming soon. Paid signup, an interactive demo, customer accounts, branch access, reminder delivery, and full SaaS operation remain later work.
