import { buildPushPayload, type PushSubscription } from '@block65/webcrypto-web-push';
import type { Env } from './types';
import { InputError } from './validation';
import { sha256Hex } from './utils';

export const PUSH_USER = 'fleet'; // Existing authentication represents one shared fleet.
export const PUSH_TIMEZONE = 'America/Winnipeg';
export interface SubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  expiration_time: number | null;
  last_status: number | null;
  last_success_at: string | null;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InputError('Expected a JSON object.');
  return value as Record<string, unknown>;
}

// Only browser push services are valid destinations, not arbitrary HTTPS servers (SSRF).
export function validatePushEndpoint(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048) throw new InputError('Invalid push endpoint.');
  let url: URL;
  try { url = new URL(value); } catch { throw new InputError('Invalid push endpoint.'); }
  const host = url.hostname;
  const allowed = host === 'fcm.googleapis.com' || host === 'updates.push.services.mozilla.com' ||
    host === 'web.push.apple.com' || host.endsWith('.notify.windows.com');
  if (!allowed || url.protocol !== 'https:' || url.port || url.username || url.password || url.hash) {
    throw new InputError('Unrecognized browser push service. Try Chrome, Firefox, or Samsung Internet.');
  }
  return url.href;
}

function decodeKey(value: unknown, size: number): Uint8Array<ArrayBuffer> {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value) || value.length !== Math.ceil(size * 8 / 6)) throw new InputError('Invalid subscription keys.');
  const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
  const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
  if (bytes.length !== size) throw new InputError('Invalid subscription keys.');
  return bytes;
}

export async function validateSubscription(value: unknown): Promise<PushSubscription> {
  const data = record(value);
  const endpoint = validatePushEndpoint(data.endpoint);
  const keys = record(data.keys);
  const publicKey = decodeKey(keys.p256dh, 65);
  decodeKey(keys.auth, 16);
  try {
    await crypto.subtle.importKey('raw', publicKey, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  } catch { throw new InputError('Invalid subscription public key.'); }
  const expirationTime = data.expirationTime ?? null;
  if (expirationTime !== null && (typeof expirationTime !== 'number' || !Number.isSafeInteger(expirationTime) || expirationTime <= Date.now())) throw new InputError('Invalid or expired subscription.');
  return { endpoint, expirationTime: expirationTime as number | null, keys: { p256dh: keys.p256dh as string, auth: keys.auth as string } };
}

export function pushConfigured(env: Env): boolean {
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);
}

export function notificationPayload(basePath: string, test = false) {
  return {
    title: 'Truck Safety Tracker',
    body: test ? 'Test notification. Background alerts are enabled for this device.' : 'Inspection reminders need attention. Unlock Safety Tracker to review.',
    icon: basePath + '/icon-192.png',
    badge: basePath + '/badge.png',
    tag: test ? 'safety-test' : 'safety-daily',
    url: basePath + '/',
  };
}

export interface DeliveryResult { accepted: number; removed: number; failed: number }

export async function sendToSubscription(env: Env, row: SubscriptionRow, basePath: string, test = false): Promise<number> {
  if (!pushConfigured(env)) throw new InputError('Push notifications are not configured on the server.', 503);
  let status = 0;
  try {
    validatePushEndpoint(row.endpoint);
    const payload = await buildPushPayload({
      data: notificationPayload(basePath, test),
      options: { ttl: test ? 300 : 14400, urgency: 'normal', topic: test ? 'safety-test' : 'safety-daily' },
    }, { endpoint: row.endpoint, expirationTime: row.expiration_time, keys: { p256dh: row.p256dh, auth: row.auth } }, {
      subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY,
    });
    // RFC 8030: 201 means accepted by the push service, not a phone display receipt.
    const response = await fetch(row.endpoint, { ...payload, redirect: 'error', signal: AbortSignal.timeout(10000) });
    status = response.status;
    await response.body?.cancel();
  } catch {
    // Never log endpoint URLs, subscription keys, tokens, or payload contents.
    console.warn(JSON.stringify({ event: 'push_transport_error', subscription_id: row.id }));
  }
  if (status === 404 || status === 410) {
    await env.DB.prepare('DELETE FROM push_subscriptions WHERE id = ?1').bind(row.id).run();
  } else {
    await env.DB.prepare(`UPDATE push_subscriptions SET last_status = ?1, last_attempt_at = datetime('now'),
      last_success_at = CASE WHEN ?1 = 201 THEN datetime('now') ELSE last_success_at END WHERE id = ?2`).bind(status, row.id).run();
  }
  console.log(JSON.stringify({ event: 'push_delivery', subscription_id: row.id, status, accepted: status === 201 }));
  return status;
}

export function localReminderTime(timestamp: number): { date: string; hour: string } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: PUSH_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(timestamp));
  const get = (type: string) => parts.find(part => part.type === type)!.value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: get('hour') };
}

// Cursor pagination bounds memory. Sequential sends also bound concurrent outbound requests.
export async function sendFleetPush(env: Env, basePath: string, dailyDate?: string): Promise<DeliveryResult> {
  const result: DeliveryResult = { accepted: 0, removed: 0, failed: 0 };
  let cursor = '';
  for (;;) {
    const { results } = await env.DB.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?1 AND id > ?2 ORDER BY id LIMIT 20').bind(PUSH_USER, cursor).all<SubscriptionRow>();
    if (!results.length) break;
    for (const row of results) {
      cursor = row.id;
      if (dailyDate) {
        // Atomic claim prevents duplicate daily alerts if a scheduled invocation is replayed.
        const claim = await env.DB.prepare('UPDATE push_subscriptions SET last_daily_date = ?1 WHERE id = ?2 AND (last_daily_date IS NULL OR last_daily_date <> ?1)').bind(dailyDate, row.id).run();
        if (!claim.meta.changes) continue;
      }
      const status = await sendToSubscription(env, row, basePath);
      if (status === 201) result.accepted++;
      else if (status === 404 || status === 410) result.removed++;
      else result.failed++;
    }
  }
  return result;
}

/** Called only after the existing passcode session or send-only server token is verified. */
export async function handlePushApi(request: Request, env: Env, path: string, basePath: string): Promise<Response> {
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  if (path === '/api/push/config' && request.method === 'GET') {
    return json({ configured: pushConfigured(env), publicKey: env.VAPID_PUBLIC_KEY || null, timezone: PUSH_TIMEZONE, reminderTime: '07:00' });
  }
  if (request.method !== 'POST') return json({ error: 'Push route not found.' }, 404);
  const body = record(await request.json());
  if (path === '/api/push/subscribe') {
    if (!pushConfigured(env)) throw new InputError('Push notifications are not configured on the server.', 503);
    const subscription = await validateSubscription(body);
    const id = await sha256Hex(subscription.endpoint);
    // Resubscribing updates keys but preserves creation date, rate limits and delivery state.
    await env.DB.prepare(`INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, expiration_time)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, expiration_time = excluded.expiration_time`)
      .bind(id, PUSH_USER, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, subscription.expirationTime).run();
    return json({ ok: true, message: 'This device is subscribed. Daily reminders run at 7:00 AM Winnipeg time when inspections need attention.' });
  }
  if (path === '/api/push/unsubscribe') {
    if (body.all === true) {
      await env.DB.prepare('DELETE FROM push_subscriptions WHERE user_id = ?1').bind(PUSH_USER).run();
    } else {
      const endpoint = validatePushEndpoint(body.endpoint);
      await env.DB.prepare('DELETE FROM push_subscriptions WHERE user_id = ?1 AND endpoint = ?2').bind(PUSH_USER, endpoint).run();
    }
    return json({ ok: true });
  }
  if (path === '/api/push/status' || path === '/api/push/test') {
    const endpoint = validatePushEndpoint(body.endpoint);
    const row = await env.DB.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?1 AND endpoint = ?2').bind(PUSH_USER, endpoint).first<SubscriptionRow>();
    if (path === '/api/push/status') return json({ registered: !!row, lastStatus: row?.last_status ?? null, lastSuccess: row?.last_success_at ?? null });
    if (!row) throw new InputError('This device is not subscribed. Enable notifications first.', 404);
    const now = Date.now();
    const claim = await env.DB.prepare('UPDATE push_subscriptions SET last_test_at = ?1 WHERE id = ?2 AND (last_test_at IS NULL OR last_test_at <= ?3)').bind(now, row.id, now - 60000).run();
    if (!claim.meta.changes) return json({ error: 'Wait 60 seconds between test notifications.' }, 429);
    const status = await sendToSubscription(env, row, basePath, true);
    const message = status === 201 ? 'Accepted by the push service. Check your device; acceptance is not a display receipt.' : status === 404 || status === 410 ? 'Subscription expired. Enable notifications again.' : 'Push delivery failed. Retry later. On Edge Android, try Chrome, Firefox, or Samsung Internet.';
    return json({ ok: status === 201, status, message, ...(status === 201 ? {} : { error: message }) }, status === 201 ? 200 : 502);
  }
  if (path === '/api/push/send') {
    // Deliberately fixed, nonsensitive copy: no fleet details or arbitrary lock-screen text.
    if (body.event !== 'reminder') throw new InputError('Use {"event":"reminder"}; notification text is privacy-safe and server-defined.');
    if (!pushConfigured(env)) throw new InputError('Push notifications are not configured on the server.', 503);
    const result = await sendFleetPush(env, basePath);
    return json({ ok: result.failed === 0, ...result }, result.failed ? 502 : 200);
  }
  return json({ error: 'Push route not found.' }, 404);
}
