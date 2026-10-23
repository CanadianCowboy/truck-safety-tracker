import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const base = '/truck-safety';

test('push UI requests permission only on click, sends full subscription, tests and disables', async ({ page }) => {
  await page.route('**/api/auth/verify', route => route.fulfill({ json: { ok: true } }));
  await page.route('**/api/trucks', route => route.fulfill({ json: { trucks: [], settings: { warning_days: 30 } } }));
  let posted: unknown;
  let deleted = false;
  await page.route('**/api/push/*', async route => {
    const path = new URL(route.request().url()).pathname.split('/').at(-1);
    if (path === 'subscribe') posted = route.request().postDataJSON();
    if (path === 'unsubscribe') deleted = true;
    await route.fulfill({ json: path === 'config' ? { configured: true, publicKey: 'BA' + 'A'.repeat(85) } : path === 'status' ? { registered: true, lastStatus: null } : { ok: true, message: path === 'test' ? 'Accepted by the push service.' : 'Subscribed successfully.' } });
  });
  await page.addInitScript(() => {
    let subscription: object | null = null;
    let permissionCalls = 0;
    const data = { endpoint: 'https://fcm.googleapis.com/fcm/send/mock-browser', expirationTime: null, keys: { p256dh: 'test-public', auth: 'test-auth' } };
    Object.defineProperty(window, 'Notification', { configurable: true, value: { permission: 'default', requestPermission: async () => { permissionCalls++; return 'granted'; } } });
    Object.defineProperty(window, 'PushManager', { configurable: true, value: function () {} });
    const manager = {
      getSubscription: async () => subscription,
      subscribe: async (options: { userVisibleOnly: boolean; applicationServerKey: Uint8Array }) => {
        if (!options.userVisibleOnly || options.applicationServerKey.length !== 65) throw new Error('Incorrect subscription options');
        subscription = { endpoint: data.endpoint, options: { applicationServerKey: options.applicationServerKey.buffer }, toJSON: () => data, unsubscribe: async () => { subscription = null; return true; } };
        return subscription;
      },
    };
    const registration = { active: {}, pushManager: manager };
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register: async () => registration, getRegistration: async () => registration, ready: Promise.resolve(registration) } });
    Object.defineProperty(window, 'permissionCalls', { get: () => permissionCalls });
  });
  await page.goto(base + '/push-test');
  await expect(page.locator('#modal-push')).toBeVisible();
  await expect(page.locator('#push-status')).toContainText('Not subscribed');
  expect(await page.evaluate(() => Reflect.get(window, 'permissionCalls'))).toBe(0);
  await page.getByRole('button', { name: 'Enable notifications', exact: true }).click();
  await expect(page.locator('#push-status')).toContainText('Subscribed successfully');
  expect(await page.evaluate(() => Reflect.get(window, 'permissionCalls'))).toBe(1);
  expect(posted).toEqual({ endpoint: 'https://fcm.googleapis.com/fcm/send/mock-browser', expirationTime: null, keys: { p256dh: 'test-public', auth: 'test-auth' } });
  await page.getByRole('button', { name: 'Send test notification', exact: true }).click();
  await expect(page.locator('#push-status')).toContainText('Accepted by the push service');
  await expect(page.locator('#push-status')).toContainText('Edge Android');
  await page.getByRole('button', { name: 'Disable notifications', exact: true }).click();
  await expect(page.locator('#push-status')).toContainText('subscription and delivery metadata were deleted');
  expect(deleted).toBe(true);
});

test('the installed service worker handles a Chromium-injected push (notification API captured)', async ({ page, context, baseURL }) => {
  // Headless/incognito Chromium refuses native notification permission in this host.
  // Capture only the OS-facing API; CDP still dispatches the real installed SW push event.
  const workerReady = context.waitForEvent('serviceworker');
  const cdp = await context.newCDPSession(page);
  const registrations = new Map<string, string>();
  cdp.on('ServiceWorker.workerRegistrationUpdated', event => {
    for (const registration of event.registrations) registrations.set(registration.scopeURL, registration.registrationId);
  });
  await cdp.send('ServiceWorker.enable');
  await page.goto(base + '/');
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  await expect.poll(() => registrations.get(scope)).toBeTruthy();
  const worker = await workerReady;
  await worker.evaluate(() => {
    Object.defineProperty(Reflect.get(globalThis, 'registration'), 'showNotification', { configurable: true, value: async (title: string, options: { body: string; data: { url: string } }) => {
      Reflect.set(globalThis, 'capturedPushNotification', { title, body: options.body, url: options.data.url });
    } });
  });
  const data = { title: 'Protocol test', body: 'Service worker push handler checked.', url: base + '/', tag: 'automated-runtime-test' };
  await cdp.send('ServiceWorker.deliverPushMessage', { origin: new URL(baseURL!).origin, registrationId: registrations.get(scope)!, data: JSON.stringify(data) });
  await expect.poll(() => worker.evaluate(() => Reflect.get(globalThis, 'capturedPushNotification'))).toEqual({ title: data.title, body: data.body, url: new URL(base + '/', baseURL).href });
});

test('push panel explains denied, unsupported and server errors', async ({ page }) => {
  await page.route('**/api/auth/verify', route => route.fulfill({ json: { ok: true } }));
  await page.route('**/api/trucks', route => route.fulfill({ json: { trucks: [] } }));
  await page.route('**/api/push/config', route => route.fulfill({ json: { configured: true } }));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'Notification', { configurable: true, value: { permission: 'denied' } });
  });
  await page.goto(base + '/push-test');
  await expect(page.locator('#push-status')).toContainText('Permission denied');
  await page.evaluate(() => { Reflect.deleteProperty(window, 'PushManager'); });
  await page.locator('#modal-push [data-close]').click();
  await page.locator('#header-tools > summary').click();
  await page.locator('#btn-browser-notify').click();
  await expect(page.locator('#push-status')).toContainText('Unsupported browser');
  await expect(page.locator('#push-enable')).toBeDisabled();
  await page.reload();
  await page.route('**/api/push/config', route => route.fulfill({ status: 503, json: { error: 'Server unavailable' } }));
  await page.locator('#modal-push [data-close]').click();
  await page.locator('#header-tools > summary').click();
  await page.locator('#btn-browser-notify').click();
  await expect(page.locator('#push-status')).toContainText('Server unavailable');
});

test('live-capable Worker push routes require auth, validate, deduplicate, and delete subscriptions; dates default to month end', async ({ page, baseURL }) => {
  for (const path of ['subscribe', 'unsubscribe', 'test', 'send']) {
    expect((await page.request.post(base + '/api/push/' + path, { data: {} })).status()).toBe(401);
  }
  expect((await page.request.get(base + '/api/push/config')).status()).toBe(401);
  await page.goto(base + '/');
  await page.locator('#gate-passcode').fill(process.env.APP_PASSCODE || 'passcode');
  await page.locator('#gate-submit').click();
  await expect(page.locator('#app-view')).toBeVisible();
  const config = await (await page.request.get(base + '/api/push/config')).json();
  expect(config.configured).toBe(true);
  expect(config.publicKey).toMatch(/^[A-Za-z0-9_-]{87}$/);
  expect(config.timezone).toBe('America/Winnipeg');
  const subscription = await page.evaluate(async () => {
    const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return { endpoint: 'https://fcm.googleapis.com/fcm/send/verify-' + crypto.randomUUID(), expirationTime: null, keys: { p256dh: encode(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))), auth: encode(crypto.getRandomValues(new Uint8Array(16))) } };
  });
  let truckId: string | undefined;
  try {
    for (let i = 0; i < 2; i++) expect((await page.request.post(base + '/api/push/subscribe', { data: subscription })).status()).toBe(200);
    const status = await page.request.post(base + '/api/push/status', { data: { endpoint: subscription.endpoint } });
    expect((await status.json()).registered).toBe(true);
    expect((await page.request.post(base + '/api/push/subscribe', { data: { ...subscription, endpoint: 'https://127.0.0.1/private' } })).status()).toBe(400);
    expect((await page.request.post(base + '/api/push/subscribe', { data: { ...subscription, keys: { p256dh: 'bad', auth: 'bad' } } })).status()).toBe(400);
    expect((await page.request.post(base + '/api/push/subscribe', { data: null })).status()).toBe(400);
    expect((await page.request.post(base + '/api/push/subscribe', { data: '{invalid-json', headers: { 'Content-Type': 'application/json' } })).status()).toBe(400);
    expect((await page.request.post(base + '/api/push/subscribe', { headers: { Origin: 'https://evil.example' }, data: subscription })).status()).toBe(403);
    expect((await page.request.post(base + '/api/push/send', { data: { title: 'Sensitive details' } })).status()).toBe(400);
    const response = await page.request.post(base + '/api/trucks', { data: { unit_number: 'MONTH-END-' + Date.now(), last_inspection_date: '2026-10-20', interval_months: 12 } });
    expect(response.status()).toBe(201);
    const truck = (await response.json()).truck;
    truckId = truck.id;
    expect(truck.next_due_date).toBe('2027-10-31');
    expect(truck.last_inspection_date).toBe('2026-10-20');
    await page.reload();
    await page.locator('#btn-add-truck').click();
    await page.locator('#truck-last-date').fill('2026-10-20');
    await page.locator('#truck-last-date').dispatchEvent('change');
    await expect(page.locator('#truck-due-date')).toHaveValue('2027-10-31');
    await page.locator('#truck-interval').selectOption('6');
    await expect(page.locator('#truck-due-date')).toHaveValue('2027-04-30');
    await page.locator('#modal-truck').getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.locator('.truck-card').filter({ hasText: truck.unit_number }).locator('[data-inspect]').click();
    await page.locator('#inspect-date').fill('2027-08-15');
    await page.locator('#inspect-date').dispatchEvent('change');
    await expect(page.locator('#inspect-exp-date')).toHaveValue('2028-08-31');
    await page.locator('#modal-inspect').getByRole('button', { name: 'Cancel', exact: true }).click();
    expect((await page.request.post(base + '/api/trucks/' + truckId + '/inspections', { data: { inspection_date: '2027-08-15' } })).status()).toBe(201);
    const updated = await (await page.request.get(base + '/api/trucks/' + truckId)).json();
    expect(updated.truck.next_due_date).toBe('2028-08-31');
    await page.request.post(base + '/api/trucks/' + truckId + '/inspections', { data: { inspection_date: '2028-08-15', expiration_date: '2029-08-20' } });
    expect((await (await page.request.get(base + '/api/trucks/' + truckId)).json()).truck.next_due_date).toBe('2029-08-20');
    const badge = await page.request.get(base + '/badge.png');
    expect(badge.headers()['content-type']).toContain('image/png');
    const sw = await (await page.request.get(base + '/sw.js')).text();
    expect(sw).toContain("addEventListener('push'");
    expect(sw).toContain("addEventListener('notificationclick'");
    if (baseURL?.includes('127.0.0.1') || baseURL?.includes('localhost')) {
      const secrets = JSON.parse(await readFile('.cloudflare/push-secrets.json', 'utf8'));
      expect((await page.request.get(base + '/api/trucks', { headers: { Cookie: '', Authorization: 'Bearer ' + secrets.PUSH_SEND_TOKEN } })).status()).toBe(401);
      expect((await page.request.post(base + '/api/push/send', { headers: { Cookie: '', Authorization: 'Bearer ' + secrets.PUSH_SEND_TOKEN }, data: { event: 'not-valid' } })).status()).toBe(400);
      expect(sw).not.toContain(secrets.VAPID_PRIVATE_KEY);
      const html = await (await page.request.get(base + '/')).text();
      expect(html).not.toContain(secrets.VAPID_PRIVATE_KEY);
      expect(html).not.toContain(secrets.PUSH_SEND_TOKEN);
    }
  } finally {
    expect((await page.request.post(base + '/api/push/unsubscribe', { data: { endpoint: subscription.endpoint } })).ok()).toBe(true);
    expect((await (await page.request.post(base + '/api/push/status', { data: { endpoint: subscription.endpoint } })).json()).registered).toBe(false);
    if (truckId) expect((await page.request.delete(base + '/api/trucks/' + truckId)).ok()).toBe(true);
  }
});
