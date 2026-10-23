import { describe, expect, it, vi } from 'vitest';
import { buildPushPayload } from '@block65/webcrypto-web-push';
import { localReminderTime, notificationPayload, validatePushEndpoint, validateSubscription, sendToSubscription, sendFleetPush, handlePushApi, type SubscriptionRow } from '../src/push';
import { renderServiceWorker } from '../src/ui';
import type { Env } from '../src/types';

const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const decode = (text: string) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - text.length % 4) % 4)), c => c.charCodeAt(0));
async function fixture() {
  const receiver = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const publicBytes = new Uint8Array(await crypto.subtle.exportKey('raw', receiver.publicKey) as ArrayBuffer);
  const auth = crypto.getRandomValues(new Uint8Array(16));
  const signing = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
  const jwk = await crypto.subtle.exportKey('jwk', signing.privateKey) as JsonWebKey;
  const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/test-only', expirationTime: null, keys: { p256dh: encode(publicBytes), auth: encode(auth) } };
  const vapid = { subject: 'https://example.com', publicKey: encode(new Uint8Array(await crypto.subtle.exportKey('raw', signing.publicKey) as ArrayBuffer)), privateKey: jwk.d! };
  return { receiver, publicBytes, auth, signing, subscription, vapid };
}

describe('native Web Push', () => {
  it('uses 7 AM Winnipeg across winter, summer, and DST boundaries', () => {
    for (const date of ['2026-01-20', '2026-11-01', '2026-12-20']) {
      expect(localReminderTime(Date.parse(date + 'T13:00:00Z'))).toEqual({ date, hour: '07' });
      expect(localReminderTime(Date.parse(date + 'T12:00:00Z')).hour).not.toBe('07');
    }
    for (const date of ['2026-03-08', '2026-07-20', '2026-10-20']) {
      expect(localReminderTime(Date.parse(date + 'T12:00:00Z'))).toEqual({ date, hour: '07' });
      expect(localReminderTime(Date.parse(date + 'T13:00:00Z')).hour).not.toBe('07');
    }
  });

  it('validates browser destinations and real P-256 subscription keys', async () => {
    const { subscription } = await fixture();
    expect(await validateSubscription(subscription)).toEqual(subscription);
    for (const endpoint of ['http://fcm.googleapis.com/a', 'https://127.0.0.1/a', 'https://example.com/a', 'https://evilnotify.windows.com/a', 'https://fcm.googleapis.com.evil.com/a', 'https://fcm.googleapis.com:8080/a', 'https://user:pw@fcm.googleapis.com/a']) expect(() => validatePushEndpoint(endpoint)).toThrow();
    for (const endpoint of ['https://updates.push.services.mozilla.com/wpush/v2/a', 'https://wns2.notify.windows.com/a', 'https://web.push.apple.com/a']) expect(validatePushEndpoint(endpoint)).toBe(endpoint);
    await expect(validateSubscription({ ...subscription, keys: { ...subscription.keys, p256dh: encode(new Uint8Array(65)) } })).rejects.toThrow();
    await expect(validateSubscription({ ...subscription, expirationTime: 1 })).rejects.toThrow();
    await expect(validateSubscription(null)).rejects.toThrow();
  });

  it('creates a verifiable VAPID JWT and independently decryptable aes128gcm payload of 4096 bytes', async () => {
    const { receiver, publicBytes, auth, signing, subscription, vapid } = await fixture();
    const data = notificationPayload('/truck-safety', true);
    const payload = await buildPushPayload({ data, options: { ttl: 300, urgency: 'normal', topic: 'safety-test' } }, subscription, vapid);
    expect(payload.headers['content-encoding']).toBe('aes128gcm');
    expect(payload.headers.ttl).toBe('300');
    expect(payload.headers.topic).toBe('safety-test');
    const authorization = payload.headers.authorization;
    const jwt = /t=([^, ]+)/.exec(authorization)![1];
    const [head, claims, signature] = jwt.split('.');
    expect(JSON.parse(new TextDecoder().decode(decode(claims))).aud).toBe('https://fcm.googleapis.com');
    expect(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, signing.publicKey, decode(signature), new TextEncoder().encode(head + '.' + claims))).toBe(true);
    const encrypted = payload.body;
    expect(encrypted.length).toBe(4096);
    expect(new DataView(encrypted.buffer, encrypted.byteOffset).getUint32(16)).toBe(4096);
    const serverKey = encrypted.slice(21, 21 + encrypted[20]);
    const key = await crypto.subtle.importKey('raw', serverKey, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const algorithm = { name: 'ECDH', public: key };
    const shared = await crypto.subtle.deriveBits(algorithm, receiver.privateKey, 256);
    async function hkdf(input: BufferSource, salt: BufferSource, info: Uint8Array, bits: number) {
      const material = await crypto.subtle.importKey('raw', input, 'HKDF', false, ['deriveBits']);
      return crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, material, bits);
    }
    const info = new Uint8Array([...new TextEncoder().encode('WebPush: info\0'), ...publicBytes, ...serverKey]);
    const ikm = await hkdf(shared, auth, info, 256);
    const salt = encrypted.slice(0, 16);
    const cek = await hkdf(ikm, salt, new TextEncoder().encode('Content-Encoding: aes128gcm\0'), 128);
    const nonce = await hkdf(ikm, salt, new TextEncoder().encode('Content-Encoding: nonce\0'), 96);
    const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
    const clear = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, aes, encrypted.slice(21 + encrypted[20])));
    let end = clear.length - 1;
    while (clear[end] === 0) end--;
    expect(clear[end]).toBe(2);
    expect(JSON.parse(new TextDecoder().decode(clear.slice(0, end)))).toEqual(data);
  });

  it('records only 201 as accepted, deletes 404/410, and prevents redirects', async () => {
    const { subscription, vapid } = await fixture();
    const run = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
    const bind = vi.fn().mockReturnValue({ run });
    const prepare = vi.fn().mockReturnValue({ bind });
    const env = { DB: { prepare }, VAPID_SUBJECT: vapid.subject, VAPID_PUBLIC_KEY: vapid.publicKey, VAPID_PRIVATE_KEY: vapid.privateKey } as unknown as Env;
    const row: SubscriptionRow = { id: 'opaque-id', user_id: 'fleet', endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, expiration_time: null, last_status: null, last_success_at: null };
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    try {
      for (const status of [201, 202, 404, 410, 503]) {
        prepare.mockClear();
        fetcher.mockResolvedValue(new Response(null, { status }));
        expect(await sendToSubscription(env, row, '/truck-safety', true)).toBe(status);
        expect(prepare.mock.calls[0][0]).toContain([404, 410].includes(status) ? 'DELETE FROM' : 'UPDATE push_subscriptions');
        expect(fetcher.mock.calls.at(-1)![1].redirect).toBe('error');
      }
      fetcher.mockRejectedValue(new Error('network'));
      expect(await sendToSubscription(env, row, '/truck-safety')).toBe(0);
    } finally { vi.unstubAllGlobals(); }
  });

  it('claims tests and daily sends atomically, deduplicates each local day, and deletes all notification data', async () => {
    const { subscription, vapid } = await fixture();
    const row: SubscriptionRow = { id: 'id-1', user_id: 'fleet', endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, expiration_time: null, last_status: null, last_success_at: null };
    let daily: string | null = null;
    let lastTest = 0;
    let exists = true;
    const db = { prepare: (sql: string) => ({ bind: (...params: unknown[]) => ({
      first: async () => exists ? row : null,
      all: async () => ({ results: exists && params[1] === '' ? [row] : [] }),
      run: async () => {
        if (sql.includes('last_daily_date')) { const changes = daily !== params[0]; daily = params[0] as string; return { meta: { changes: Number(changes) } }; }
        if (sql.includes('last_test_at')) { const changes = lastTest <= (params[2] as number); if (changes) lastTest = params[0] as number; return { meta: { changes: Number(changes) } }; }
        if (sql.startsWith('DELETE')) exists = false;
        return { meta: { changes: 1 } };
      },
    }) }) };
    const env = { DB: db, VAPID_PUBLIC_KEY: vapid.publicKey, VAPID_PRIVATE_KEY: vapid.privateKey, VAPID_SUBJECT: vapid.subject } as unknown as Env;
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal('fetch', fetcher);
    const request = (body: unknown) => new Request('https://example.com/truck-safety/api/push/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    try {
      expect((await handlePushApi(request({ endpoint: row.endpoint }), env, '/api/push/test', '/truck-safety')).status).toBe(200);
      expect((await handlePushApi(request({ endpoint: row.endpoint }), env, '/api/push/test', '/truck-safety')).status).toBe(429);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(await sendFleetPush(env, '/truck-safety', '2026-10-20')).toEqual({ accepted: 1, removed: 0, failed: 0 });
      expect(await sendFleetPush(env, '/truck-safety', '2026-10-20')).toEqual({ accepted: 0, removed: 0, failed: 0 });
      expect(await sendFleetPush(env, '/truck-safety', '2026-10-21')).toEqual({ accepted: 1, removed: 0, failed: 0 });
      expect(fetcher).toHaveBeenCalledTimes(3);
      expect((await handlePushApi(request({ all: true }), env, '/api/push/unsubscribe', '/truck-safety')).status).toBe(200);
      expect(exists).toBe(false);
    } finally { vi.unstubAllGlobals(); }
  });

  it('always displays valid, malformed and empty push payloads and safely opens/focuses app URLs', async () => {
    const handlers = new Map<string, (event: unknown) => void>();
    const showNotification = vi.fn().mockResolvedValue(undefined);
    const openWindow = vi.fn().mockResolvedValue(undefined);
    const focus = vi.fn().mockResolvedValue(undefined);
    const navigate = vi.fn().mockResolvedValue(undefined);
    const matchAll = vi.fn().mockResolvedValue([]);
    const self = { location: { origin: 'https://example.com' }, registration: { showNotification }, addEventListener: (type: string, handler: (event: unknown) => void) => handlers.set(type, handler), clients: { matchAll, openWindow } };
    new Function('self', renderServiceWorker('/truck-safety'))(self);
    for (const input of [null, 'bad json', '{}', 'null', '[]', JSON.stringify({ title: 'Hi', body: 'Safe', icon: 'https://evil.com/a', url: 'https://evil.com/steal' })]) {
      let pending: Promise<void> | undefined;
      handlers.get('push')!({ data: input === null ? null : { json: () => JSON.parse(input) }, waitUntil: (promise: Promise<void>) => { pending = promise; } });
      expect(pending).toBeDefined();
      await pending;
      const [title, options] = showNotification.mock.calls.at(-1)!;
      expect(title).toBe(input?.includes('Hi') ? 'Hi' : 'Truck Safety Tracker');
      expect(options.body).toBeTruthy();
      expect(options.icon).toContain('https://example.com/truck-safety/');
      expect(options.data.url).toBe('https://example.com/truck-safety/');
    }
    const close = vi.fn();
    async function click(url: string) {
      let pending: Promise<void> | undefined;
      handlers.get('notificationclick')!({ notification: { close, data: { url } }, waitUntil: (promise: Promise<void>) => { pending = promise; } });
      await pending;
    }
    await click('https://evil.com/');
    expect(openWindow).toHaveBeenCalledWith('https://example.com/truck-safety/');
    matchAll.mockResolvedValue([{ url: 'https://example.com/truck-safety/', navigate, focus }]);
    await click('/truck-safety/?unit=selected');
    expect(navigate).toHaveBeenCalledWith('https://example.com/truck-safety/?unit=selected');
    expect(focus).toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(2);
  });
});
