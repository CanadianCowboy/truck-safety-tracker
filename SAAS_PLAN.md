# Hosted SaaS and Coming-Soon Website Plan

Planning snapshot: 2026-10-25. Working branch: `feat/saas-marketing`.

**Status: SaaS planning; coming-soon implementation and publication authorized.** This document itself does not implement a website, demo, accounts, subscriptions, email delivery, retention system, or tenant isolation. After this plan was saved, the owner explicitly requested building AND publishing the coming-soon page on the privately approved subdomain. That supersedes the earlier local-only limit, but does not authorize paid checkout, changes to the personal fleet, unrelated DNS/mail changes, or unapproved paid-service purchases.

Personal hostnames, email addresses, account identifiers, and credentials must remain in ignored deployment configuration or secrets, never tracked source or this plan.

## 1. Agreed product and launch direction

- Sell hosted tracking software to Canadian owner-operators and small fleets; do not present it as an inspection, certification, or managed compliance service.
- Market the hosted subscription only. Keep the whole product open source. Customer-owned automated installation is not a launch requirement.
- Keep the current personal fleet completely separate: no migration, shared production database/bucket, public exposure, or verification writes against it.
- Use **Truck Safety Tracker** as the temporary public title. The eventual brand should feel rugged, professional, and Canadian without implying government affiliation.
- Canada first, prices in CAD, English and French throughout the paid-launch experience.
- Up to 25 paying companies in the first year; a typical company has 10–30 trucks/trailers and 1–3 staff.
- Pre-revenue recurring service budget: **CAD $100/month maximum**. Design below this with contingency; provider usage charges are not automatically hard-capped.
- Customers pay before private workspace use. No free trial or permanent free operational tier is agreed. Provide an empty, temporary public demo instead.
- Normal purchase, provisioning, invitations, billing management, cancellation, and reactivation should require no operator intervention.
- Exceptional disputes, compromised/lost accounts, failed infrastructure, legal requests, and VIP arrangements can still require human work.
- Rollout: save plan → build and verify coming-soon site → publish on the approved subdomain (now authorized) → separately approved and tested self-service paid launch.

### Scope added beyond the current tracker

The hosted service needs individual accounts, companies, branch permissions, roles, billing, email delivery, general unit documents and optional document expiry dates, bilingual UI, and commercial lifecycle management. These are proposed launch requirements, not existing capabilities.

No repair/work-order system, telematics, GPS tracking, driver logs, SMS, mobile app-store release, customer custom domains, or automatic customer-owned Cloudflare installation is included.

## 2. Coming-soon website: first implementation milestone

### Agreed coming-soon scope

- A longer early-access landing page: hero, target audience, benefits, planned workflow, feature overview, FAQs, contact, and launch-notification signup.
- Dark navy with amber accents; professional, practical, mobile-first, accessible, system fonts, no third-party trackers.
- Complete English/French versions with a visible language switch. Remember the selected language without requiring a third-party service.
- Temporary title: Truck Safety Tracker. No final logo/name assumption.
- An intended descriptive `fleet` subdomain has been approved privately. Keep its full hostname in ignored deployment configuration.
- The approved public contact address forwards to the owner's personal inbox. Keep the actual address out of tracked files and do not disclose the forwarding destination.
- Hosting/DNS account ownership has not been established. The location of the personal fleet does not establish which account controls the new subdomain.
- Separate website deployment from the personal fleet, with no fleet DB, file-storage, session-secret, or passcode bindings.
- Real automated launch signup is requested; do not ship a fake form that reports success without storing/confirming a subscription.
- The demo and checkout are subsequent milestones. Coming-soon links must not imply either is already available.

### Content guardrails

- Distinguish existing open-source tracker capabilities from forthcoming hosted-service features.
- Do not invent customers, testimonials, savings, safety outcomes, fleet records, release dates, government endorsements, or compliance guarantees.
- Do not publish provisional prices/limits as a final offer without a separate approval.
- Do not claim Canadian data residency. It is preferred, not required, and no end-to-end residency guarantee has been verified.
- Product walkthrough content must not expose the personal fleet. No real screenshots/recordings without explicit approval and privacy review.
- The first coming-soon page can describe the workflow in text; a live demo is not necessary for this milestone.

### Name research, not trademark clearance

- Web searches found multiple existing fleet-industry uses of **FleetDesk**; avoid it.
- CerebrumX publicly uses **FLEETREADY** for fleet software; avoid it.
- An exact-phrase web search returned no results for **Truck Safety Tracker**. This does not establish availability or distinctiveness.
- The Canadian trademark search site returned an error; no completed registry clearance is claimed.
- A final brand needs name/trademark/domain review before commitment. A descriptive temporary hostname is not a cleared trademark.

## 3. Working commercial model

These quantities/prices are approved for modelling, **not yet a published final offer**. Applicable taxes, checkout disclosures, add-on annual billing, and payment-provider terms remain to settle.

| Item | Working allowance / price |
| --- | --- |
| Company subscription | CAD $29/month |
| Annual base subscription | CAD $313.20/year: 10% below 12 monthly payments |
| Included fleet | 100 total units; trucks and trailers count separately |
| Included staff | 10 accounts; exact counting of owner, invitations, disabled accounts pending |
| Included storage | 5 GB; decimal/binary accounting and deletion/trash accounting pending |
| Included branches | 3 |
| Unit add-on | +50 units for CAD $10/month |
| Staff add-on | +5 staff for CAD $3/month |
| Storage add-on | +5 GB for CAD $5/month |
| Self-service ceiling | 300 total units, 30 total staff, 15 GB |
| Beyond a ceiling | Contact the operator for a separately agreed VIP arrangement |

Recommended interpretation: exceeding **any** self-service dimension triggers the VIP conversation. Dedicated VIP infrastructure is a future possibility, not an included promise.

At all three self-service capacity maxima, the model is base + four unit packs + four staff packs + two storage packs = **CAD $91/month** before applicable taxes. Extra-branch pricing/capacity is not included in that calculation and remains undecided.

### Capacity and subscription changes: recommended policy

- Show warnings before capacity is exhausted. Never silently charge overages or delete existing records because a limit is reached.
- Charge for an upgrade only after explicit confirmation of the amount and effective date. Apply capacity after verified payment; use provider-supported proration where verified.
- Schedule downgrades at renewal. Make usage blockers clear and require usage to fit before scheduling an effective downgrade; do not silently renew unwanted capacity.
- Preserve the paid capacity until its paid period ends. Provide a defined resolution if usage later exceeds scheduled limits.
- Define archived/inactive unit counting, pending invitations, staff deactivation, storage reclamation, branch counting, and annual add-on treatment before launch.

## 4. Accounts, companies, and branches

### Agreed requirements

- Individual accounts, not shared commercial fleet passcodes.
- Roles: **owner, admin, editor, viewer**.
- Only the owner manages invitations/removals/role assignments. Admin does not imply team-management authority.
- MFA required for owners and admins; provider-supported authenticator/passkey/recovery options need verification. Do not make paid SMS a requirement.
- One login can belong to several companies, with an explicit company switcher and separate memberships/roles/billing.
- Units can be shared across branches.
- Three branches included in the base offer.
- Shared commercial infrastructure for the standard service, with strict company isolation; dedicated VIP hosting may be explored later.

### Recommended branch rules for approval

- Owner always has company-wide access. Admins, editors, and viewers are explicitly assigned one or more branches; an owner may grant all-branch access.
- Maintain **one unit record**, not copies. A unit-to-branch association grants access to its shared history/documents; explain this consequence when sharing.
- Assign one managing branch per unit for default timezone/reminder settings. Sharing with another branch must not duplicate reminder delivery or ownership.
- Owner controls company export, billing, ownership transfer, deletion requests, and team access. Admins manage fleet/settings within authorized scope; editors edit fleet records; viewers read/download authorized material.
- Unit transfers, sharing changes, branch deletion, destructive fleet actions, and all-branch access grants need an explicit permission matrix before implementation.
- Owner/admin MFA enrollment and recovery must not allow a user to acquire privileged permissions before satisfying policy.

### Isolation architecture direction, not a completed design

Use the existing Workers/D1/R2 stack where suitable, but introduce company ownership on every commercial record and object reference. Never reuse current single-fleet queries without scoping them.

- Resolve company membership and branch authority server-side on every request; never trust an arbitrary client-supplied company/branch identifier.
- Scope database queries, file streaming, exports/imports, QR resolution, settings, push subscriptions, and scheduled jobs.
- Object-key prefixes alone are not authorization. Keep private downloads authenticated and `no-store`.
- Invitations must be explicit and expire; matching an email domain must not grant membership.
- Secure sessions, CSRF protection, rate limits, revocation, role changes, and company switching must work together.
- Enforce paid entitlements and usage limits server-side, including concurrent operations and imports.
- Separate commercial production, development/test, waitlist, demo, and personal fleet resources. Inspect bindings before any future deployment.
- Confirm how the open-source self-hosted installation works without a managed-auth subscription or commercial billing configuration. Preserve existing supported installation behavior unless separately agreed.

## 5. Automated purchase → usable workspace

Recommended normal path:

1. Visitor selects English or French; reviews the offer, demo, renewal terms, refund policy, and privacy information.
2. Owner creates/verifies an individual account. Capture company name, language, timezone, billing jurisdiction, and required consent; collect no unnecessary fleet information before payment.
3. Owner chooses monthly/annual and any add-ons. Server selects trusted product/price IDs and displays the complete charge and recurring terms.
4. Redirect to provider-hosted checkout. Our app never receives card details.
5. Treat the browser return as a status screen, **not proof of payment**.
6. Verify the raw payment webhook signature/replay protections. Persist and process provider events idempotently, linked to the intended verified owner/company purchase.
7. Confirm settled/eligible paid status server-side. Create or activate exactly one company workspace and its entitlements. Handle duplicate, delayed, retried, and out-of-order events safely.
8. Retry recoverable provisioning work durably. A paid owner sees an honest pending/retry state and cannot be charged again to repair a failed setup. Escalate exhausted retries; reconcile provider and local state periodically.
9. Require owner MFA before privileged workspace operation. Guide company/branch setup, first real unit/document, invitations, and reminder choices.
10. Send the appropriate welcome/receipt messages without duplicate delivery. In-app access must not depend on receiving a welcome email after payment.
11. Owner self-serves invoices, payment updates, add-ons, cancellation, export, and reactivation through authenticated controls.

Maintain explicit lifecycle states such as pending payment, provisioning, active, past due/grace, read-only archive, retention review, and deleted. Cancellation-at-period-end is a scheduled billing change, not immediate suspension. Refunded/disputed/fraud states need separate defined handling.

Never grant active fleet access for abandoned checkout or an unverified success URL. Billing repair, verification/MFA setup, and payment-status screens are not free operational fleet access.

## 6. Billing, refunds, cancellation, and inactive data

### Agreed policies

- Monthly and annual billing; annual base discount 10%.
- Renewal failure: **14-day grace**, then read-only.
- Cancellation stops renewal; normal access continues until the paid period ends.
- **14-day first-purchase money-back guarantee**, for monthly and annual base purchases, subject to applicable law/provider rules. Exact add-on treatment remains open.
- After paid/grace access ends: **owner-only** retained-data access for export, billing repair, and reactivation. Staff cannot keep using the archive.
- At least **90 days** of post-subscription export/reactivation access, with a reviewed longer-retention/hold policy rather than an arbitrary deletion rule.

### Recommended operational details

- Coordinate provider retries with the grace policy; define the grace start once per failed renewal so repeated events cannot extend it indefinitely.
- Show the owner the deadline and consequences. Define what staff see during grace versus after suspension.
- Stop operational reminder sends once paid/grace access expires; keep necessary billing/security communications separate.
- Verify a recovered payment before restoring capacity/access. Preserve the same company/records on normal reactivation, rather than creating a new workspace.
- Provide a visible self-service refund request within the eligible period; issue money to the original payment method through the provider. Do not report completion until confirmed.
- Define one-guarantee-per-company abuse handling, refund/access timing, renewals, add-ons, chargebacks, duplicate charges, and service failures. Statutory rights prevail over voluntary guarantee wording.
- A refund does not automatically authorize immediate destruction of records.

### Retention is not an indefinite free archive promise

The owner's clarified goal is to respect legal record-retention obligations, not simply retain everything until storage fills.

Recommended policy: customers retain responsibility for their operating records; the service supplies an agreed export window, a documented retention schedule, and an applicable-hold process. Do not claim this automatically satisfies every customer's obligations.

- Applicable periods depend on record type, jurisdiction, purpose, and relevant law/contracts; subscription cancellation is not necessarily the retention clock's start.
- Keep billing/account/security/consent records distinct from fleet documents. Their purposes and retention periods differ.
- Do not destroy records subject to a verified applicable obligation or hold. Define who can request a hold, its scope, review, access, and end conditions with professional advice.
- Do not retain personal information indefinitely without a defined purpose. Customer deletion requests require assessment against applicable obligations, not a blanket promise to erase everything immediately.
- Define notice periods, export availability, live-storage deletion, backup expiry, and shutdown handling before implementing deletion.
- Do not implement oldest-inactive or budget-triggered deletion until approved rules exclude protected records and provide appropriate notices/export opportunities.
- Cloud storage typically incurs additional usage fees rather than becoming physically full. Budget alerts are not a lawful retention/deletion policy.

No universal Canadian retention period, compliance certification, or completed legal review is asserted here.

## 7. Documents, reminders, onboarding, and portability

### Agreed document/reminder features

- Unit documents: inspection certificates, registration, insurance, permits, maintenance documents, and general documents.
- Optional document expiry dates, included in reminder logic. Maintenance file storage is not a work-order/scheduling product.
- Preserve PDF/JPEG/PNG/WebP validation and the existing 10 MB upload limit; no new executable/SVG/HTML formats.
- Existing push/webhook channels plus email. Customer selects daily or weekly email digests and recipients.
- Per-recipient language and defined company/managing-branch timezone rules. Defaults must be explicit.
- Group actionable records to avoid one message per unit. Deduplicate recipients for shared units/branches and enforce preferences.
- Do not guarantee notification arrival or imply reminders replace inspections/operator responsibility.
- Delivery retries, bounce/suppression handling, unsubscribe/preferences, and permanent failures need visible operational handling; never silently swallow them.
- Keep certificate content and unnecessary sensitive details out of notification payloads and public logs.

### Recommended paid-launch onboarding

- Guided setup: company, branches, language/timezone, first real unit/document, staff invitations, notification preferences.
- Support compatible current-app backups, with preview, company/branch mapping, validation, entitlement checks, and explicit confirmation. No automated migration of the owner's personal fleet.
- Defer a generic CSV mapper until a demonstrated launch need; this is a recommendation, not an agreed implemented feature.
- Never seed example fleet records or fabricate VIN results. Real NHTSA availability/errors must remain honest.

### Current backup assessment

Inspected `src/backup.ts` and `src/backup-worker.ts`:

- Versioned JSON exports include unit records, inspections, and attachment metadata; optional certificate bytes are base64-encoded.
- File-inclusive exports support at most **20 MiB** of original certificate content and **30 MiB** total JSON. The interface describes these as 20/30 MB.
- Metadata-only exports are explicitly not complete document backups.
- Existing backup limits include 5,000 units and 50,000 inspections/attachments; these are technical limits, not commercial entitlements.
- The current schema does not represent future companies, memberships, branches, or new general-document workflows.
- Therefore the existing file-inclusive export cannot fulfill a promised 5–15 GB company export without redesign.

Recommendation: retain compatibility where practical, add company-scoped export of all records and original documents at advertised capacity, and use a bounded/streamed or asynchronous design instead of buffering gigabytes in Worker memory. Define a versioned manifest, completeness/integrity checks, secure expiring delivery, and any restore limitations. No final ZIP format or restore guarantee is selected yet.

Customer portability exports and operator disaster-recovery backups are separate. Define and verify database AND object recovery, acceptable data-loss/recovery windows, retention, and tenant-safe restore procedures before paid launch. Do not advertise successful backup protection solely because export code exists.

## 8. Empty interactive demo

Agreed intention: a visitor-owned, temporary browser-local demo, without seeded fictional fleet records or access to the real fleet backend.

Recommended design:

- Use session-scoped browser storage for temporary records, not fleet data in cookies. Cookies are small and are sent to servers; they are not a suitable demo database.
- Only a small language/preference value might need persistent local storage. Explain persistence accurately: browser session restoration can preserve session data, so do not guarantee deletion merely on tab close.
- Start empty. Visitors may enter their own non-sensitive temporary unit/document metadata and reset it explicitly.
- No server file uploads, emails, push subscriptions, webhooks, real invitations, billing actions, or fabricated API/VIN responses.
- Resolve live VIN support separately; never imply a local simulated decode is real.
- Clear labels: demonstration only, not a saved customer workspace; avoid sensitive data.
- No automatic copying into paid accounts; paid workspaces start empty unless an explicit import is later designed.
- Real records must never appear via service-worker cache, cookies, APIs, shared storage, or an accidentally reused database binding.
- Confirm the exact demo-edit surface before implementation. A client-local demo adapter is not permission to introduce mocked backend tests.

## 9. Launch notification list and public contact

### Latest coming-soon decision (supersedes email setup below)

The owner requested the simplest database-only signup, declined further sender setup, and prohibited test emails. Implement a separate D1 interest list with email, language, request/expiry times, consent version, and a hashed private removal token. Do not configure an email provider or send confirmations/announcements. Clearly disclose unverified addresses, no confirmation email, and announcement sending disabled until sender/consent requirements are settled. Keep each record for at most 12 months, remove expired records daily, and support token-based deletion/contact requests. Do not fabricate company identity or mailing details. Earlier double-opt-in recommendations below are future requirements before enabling email, not this publication milestone.

- Public contact uses the approved forwarding email via ignored configuration. Forwarding proves neither outbound sending nor an existing web-form API.
- The initial database-only signup needs an isolated contact store, separate from fleet records/accounts. Enabling future email requires authenticated sending and reviewed consent/sender setup.
- Recommended consent scope: address confirmation plus **one launch announcement**; no promotional newsletter enrollment by implication.
- Capture only needed email/language, consent text/version and time, confirmation status, and minimal abuse-prevention information with a retention policy.
- Use expiring single-use confirmation tokens, idempotent signup behavior, enumeration-resistant responses, rate limits/bot protection, and unsubscribe/deletion handling.
- Do not put email addresses or tokens in logs, analytics, public URLs beyond necessary scoped confirmation links, or tracked configuration.
- The signup explanation needs real sender identity/contact information and an appropriate privacy notice before publication. Business identity is currently undecided; do not invent one.
- Separate marketing opt-out from essential paid-account security/billing communications. Explain operational reminder preferences separately.
- Before publication, verify domain authentication, real confirmation delivery, unsubscribe, bounce/suppression handling, and owner ability to send the launch announcement safely.
- Do not send real invitations, reminders, or announcements as verification without explicit permission to use the designated recipients.

## 10. Provider research and preliminary recommendations

No provider accounts, credentials, packages, integrations, or purchases were created for this planning milestone. Prices are public observations from 2026-10-25 and may change. USD figures are not CAD quotes.

### Payments: comparison remains open

| Direction | Published observations | Implications / checks outstanding |
| --- | --- | --- |
| Stripe direct Payments + Billing | Canadian domestic online cards: 2.9% + CAD $0.30; pay-as-you-go Billing: 0.7% of billing volume. Tax calculation through supported no-code flows lists 0.5% where registered. | Ordinary direct processing leaves the business as seller; tax registration/filing obligations are not removed. Check billing portal, localized checkout, proration, refunds, disputes, payouts, and actual applicable tax treatment. Original processing fees generally are not returned on refunds. |
| Paddle merchant of record | Published standard rate: 5% + 50 cents per checkout transaction, no standard monthly platform fee advertised. CAD payment/balance support is documented. | Confirm Canadian seller eligibility/approval, fixed-fee currency, exact payout/FX/bank fees, refund rules and automation. Help documentation describes monthly payouts with a minimum threshold; verify account-specific CAD terms. Transaction sales-tax handling does not remove business/income-tax duties. |

Stripe also advertises a separate Managed Payments merchant-of-record product. It is not the same as ordinary direct Stripe processing; eligibility and pricing need separate evaluation if considered. No provider is selected.

### Authentication: preliminary recommendation for approval

**WorkOS AuthKit hosted login** is a strong documentation-level candidate for the lowest-operation-work launch:

- Basic user management advertises the first million monthly active users free, including several needed auth capabilities.
- Hosted UI and transactional email documentation explicitly lists Canadian English/French locales; Workers/edge support is documented.
- Custom-domain add-on is listed at $99/month; do NOT include it in the starting budget. Provider-hosted login must be explicitly accepted.
- Verify exact SDK/runtime fit, enforced MFA, organization/role behavior, sessions/revocation, recovery, privacy/data locations, production limits, and self-hosted portability in an isolated proof before commitment.
- WorkOS does not replace app-level company/branch isolation or entitlements.

**Better Auth** is an open-source alternative with documented D1 support. It gives more UI/data control but leaves more auth security, upgrades, email/recovery, and operation work to us. Verify the current package against the project's Web API/runtime restrictions before choosing it; do not copy Node/Next.js installation examples into this Worker.

No auth library/service is installed or final selection made.

### Email: shortlist, not a decision

- Cloudflare Email Service: Workers Paid currently includes 3,000 outbound messages/month, then US $0.35/1,000. Public sending requires a sending domain; daily limits depend on the account. Sending is beta: assess availability, limits, delivery events, and operational risk before using it for important messages.
- Resend: public pricing search lists 3,000/month free with 100/day, and Pro from US $20/month for 50,000/month. Verify current account terms, domain authentication, event handling, and production access.
- At 25 companies × 3 daily recipients, digests alone could consume 75/day, leaving little room under a 100/day free limit for signups, invitations, and other mail. Do not promise a viable free sending tier without burst analysis.
- Auth-provider emails and application emails may use separate systems; verify which provider sends each type and avoid double-counting or assuming auth mail comes from the public contact address.
- Open/click tracking is not required; keep it disabled. No data-residency guarantee is established for any provider.

## 11. Preliminary financial model

### Base revenue before taxes, fees, refunds, and operating costs

| Monthly companies | Base monthly receipts at CAD $29 |
| --- | --- |
| 1 | CAD $29 |
| 10 | CAD $290 |
| 25 | CAD $725 |

Annual buyers pay upfront CAD $313.20, equivalent to CAD $26.10/month of subscription term before deductions. Cash received is not all immediately earned/free-to-spend revenue; account for service obligations and possible refunds.

### Illustrative direct-payment fees

For a CAD $29 domestic-card subscription, using the published 2.9% Payments + 0.7% Billing + CAD $0.30 model:

- Fee ≈ CAD $1.34; remainder ≈ CAD $27.66 before other costs.
- If a 0.5% Tax fee applies to that assumed base, add approximately CAD $0.15.
- Actual fees may be computed on a tax-inclusive transaction/billing amount and include tax on provider services, international-card/FX charges, disputes, or other products. These examples are not exact payout predictions.
- Paddle comparison must use its verified fixed-fee currency, tax basis, payout fees, and refund treatment; do not substitute an assumed CAD $0.50.

### Infrastructure assumptions

- Workers Paid minimum: US $5/month, with published compute/request allowances.
- D1 Paid includes the first 5 GB of storage and specified read/write allowances; indexes/query patterns matter.
- R2 Standard: US $0.015/GB-month, first 10 GB-month included, with separate operation allowances/charges; direct R2 egress currently has no charge.
- 25 companies using all base 5 GB allowances: 125 GB primary files → about US $1.725/month storage after a wholly available 10 GB allowance.
- 25 companies using all 15 GB self-service storage ceilings: 375 GB → about US $5.475/month on the same assumptions.
- Those calculations exclude backup copies, retained inactive accounts, other account usage, operations, exports, logs, and taxes/FX. Included quotas are account-level, not a new free allowance per company.
- Up to 25 × 3 × 30 = 2,250 digest messages/month for three daily recipients each. Accounts using all ten staff as recipients would produce up to 7,500/month; maximum staff add-ons could raise this further. Add invitations, signups, billing, and waitlist traffic.

Planning allocation, NOT vendor quotes: target CAD $25–60/month for normal early-stage operation, reserve the remaining ceiling for backup/email/FX/usage contingency, and obtain a complete provider bill estimate before activation. Include domain renewal and a real support/contact-mail arrangement. Legal/business setup, paid translation review, development, advertising, and operator time need separately agreed budgets; do not hide them inside an infrastructure estimate.

At CAD $100 of recurring service cost, four monthly base customers exceed that cost under the simple direct-card fee example, but this is **not profitability**: it excludes labor, tax administration, refunds, disputes, and other expenses.

Implement budget/usage alerts and meaningful application limits. Provider alerts alone do not enforce the CAD $100 ceiling. Define behavior when a nonessential quota is exhausted without silently losing paid customer data or blocking necessary exports.

## 12. Delivery phases and acceptance gates

### Phase A — plan and outstanding choices

This document records the planning milestone. Implementation/publication of the coming-soon site is now requested; unresolved paid-SaaS choices do not authorize implementing that entire product. Review recommendations, finish provider/price/branch/retention decisions, and establish seller identity and legal review requirements before accepting purchases. Do not treat a planning statement as an available feature.

### Phase B — local coming-soon site

Build only the approved public page and agreed signup components in isolation. Verify bilingual DOM/content, mobile controls, keyboard access, form behavior/security, and absence of fleet data/dependencies before the authorized publication. Do not take screenshots unless asked.

### Phase C — authorized coming-soon publication

Confirm domain/account control, configure the chosen subdomain only, complete the database-only privacy disclosure and signup checks, then publish. No sending-domain changes, confirmation mail, announcements, or paid checkout. Preserve the personal fleet and unrelated DNS. Sending-provider setup and real email checks are deferred and require authorization.

### Phase D — commercial foundations and isolated demo

Implement and verify company/branch model, authentication/MFA, authorization, bilingual app, general documents/expiry reminders, onboarding, quotas, portable export, and a visitor-local empty demo. Maintain open-source/self-hosted behavior as agreed.

### Phase E — billing and automatic lifecycle

Integrate the selected provider, provisioning/reconciliation, entitlements, add-ons, grace, refunds, cancellation, archive access, and reactivation in an isolated provider test environment. Explicitly agree provider test transactions and permitted test data first; no mocked/fabricated fleet verification by default.

### Phase F — paid-launch gate

Before accepting real money:

- Final seller/tax setup, provider approval, prices, renewal/refund disclosures, bilingual terms/privacy/support content, and data-processing arrangements reviewed.
- Real language coverage across website, app, auth, checkout, email, and recovery; human review of critical French copy.
- Purchase → confirmed payment → exactly one usable workspace exercised end to end. Verify duplicate/out-of-order/delayed events, abandoned checkout, provisioning failure/retry, and reconciliation.
- Company/branch cross-access denied across records, QR resolution, files, exports, jobs, and notifications; permission changes/revocation and MFA recovery exercised.
- Capacity enforcement, upgrade proration, downgrade blockers, renewal failure/grace, cancellation, guarantee refunds, and reactivation exercised without touching real customer records.
- Secure export works at advertised capacity; database/object recovery tested in isolation. Retention/deletion/holds reviewed and verified under an approved policy.
- Email sender authentication, preferences, deduplication, authorized real delivery checks, bounces, suppression, and failure visibility verified. Do not claim push/camera delivery paths covered by read-only tests.
- Typecheck, relevant pure/integration tests, build, and real DOM/HTTP/browser behavior checks pass for the implemented scope. Any test data/mocks require the explicit authorization mandated by AGENTS.md.
- Budget/abuse controls, operator alerts, escalation, support boundaries, and rollback/data-recovery runbooks established.
- Owner explicitly authorizes production deployment and enabling real purchases.

## 13. Remaining decisions / launch blockers

1. Final brand clearance; temporary hostname does not settle brand ownership.
2. Seller/business identity, business location, tax status, legal/privacy obligations, and French/legal review budget.
3. Direct processor versus merchant of record, exact Canadian terms/payouts, and final provider approval.
4. Auth provider and acceptance of provider-hosted login; prove runtime, enforced MFA/recovery, language, revocation, and self-hosted portability.
5. Email provider, sending-domain setup, confirmed production quotas, and delivery-event behavior; incoming forwarding alone is insufficient.
6. Final prices/add-on annual treatment, counting rules, above-limit behavior, and branch add-on/ceiling policy.
7. Approval of recommended branch permission/sharing/managing-branch rules and destructive-action matrix.
8. Exact post-subscription retention schedule, record obligations/holds, notices, deletion/backup expiry, archive costs, and shutdown policy.
9. Full-capacity export/import format, backup/recovery targets, and authorized integration-test data/recipients/transactions.
10. Refund timing/add-on/renewal details, dispute handling, and any provider manual-approval constraints.
11. Onboarding/import scope approval, demo storage/action boundaries, and launch-list consent/retention wording.
12. Hosting account/subdomain control and real signup/email prerequisites. Coming-soon publication is authorized; full paid-service launch is not. No personal deployment details should be added to tracked files.

## 14. Research sources

Sources are evidence for planning, not setup/signup links or a claim of completed integration. Recheck terms before implementation/purchase.

- Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Cloudflare Email pricing: https://developers.cloudflare.com/email-service/platform/pricing/
- Cloudflare Email limits: https://developers.cloudflare.com/email-service/platform/limits/
- Stripe Canadian pricing: https://stripe.com/ca/pricing
- Stripe refunds: https://docs.stripe.com/refunds
- Paddle pricing: https://www.paddle.com/pricing
- Paddle country support: https://developer.paddle.com/concepts/sell/supported-countries-locales/
- Paddle currency support: https://developer.paddle.com/concepts/sell/supported-currencies
- Paddle payouts: https://www.paddle.com/help/manage/get-paid/when-and-how-do-i-get-paid
- WorkOS pricing: https://workos.com/pricing
- WorkOS hosted UI/locales: https://workos.com/docs/authkit/hosted-ui
- WorkOS Workers/edge support: https://workos.com/blog/launch-week-spring-2024-day-4-cloudflare-workers-edge-support
- Better Auth database/D1 documentation: https://better-auth.com/docs/concepts/database
- Resend pricing: https://resend.com/pricing
- Existing FLEETREADY use: https://cerebrumx.ai/cerebrumx-adlp-elevating-the-future-of-automotive-data-technology/
- Canadian trademark search (unavailable during this research): https://ised-isde.canada.ca/cipo/trademark-search/srch
- Privacy Commissioner retention guidance: https://www.priv.gc.ca/en/privacy-topics/privacy-for-businesses/appropriate-handling-of-personal-information/gd_rd_201406/
- Ontario commercial vehicle inspection regulation (not a Canada-wide rule): https://www.ontario.ca/laws/regulation/070199
