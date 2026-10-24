import { test, expect, basePath } from './support';

test('real push diagnostic panel reports actual browser capabilities and server configuration', async ({ page, request }) => {
  const response = await request.get(basePath + '/api/push/config');
  expect(response.status()).toBe(200);
  const config = await response.json();
  expect(typeof config.configured).toBe('boolean');
  expect(config.timezone).toBe('America/Winnipeg');
  expect(config.reminderTime).toBe('07:00');
  if (config.configured) expect(config.publicKey).toMatch(/^[A-Za-z0-9_-]{87}$/);
  await page.goto(basePath + '/push-test');
  await expect(page.locator('#modal-push')).toBeVisible();
  const actualPermission = await page.evaluate(() => 'Notification' in window ? Notification.permission : null);
  const subscriptionBefore = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return 'pushManager' in registration ? (await registration.pushManager.getSubscription())?.endpoint || null : null;
  });
  await expect(page.locator('#push-status')).not.toBeEmpty();
  if (actualPermission === 'denied') await expect(page.locator('#push-status')).toContainText('Permission denied');
  if (!config.configured) await expect(page.locator('#push-status')).toContainText('not configured');
  // Opening diagnostics must not request permission, subscribe, or send a test notification.
  expect(await page.evaluate(() => 'Notification' in window ? Notification.permission : null)).toBe(actualPermission);
  expect(await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return 'pushManager' in registration ? (await registration.pushManager.getSubscription())?.endpoint || null : null;
  })).toBe(subscriptionBefore);
  const sw = await request.get(basePath + '/sw.js');
  expect(sw.status()).toBe(200);
  expect(await sw.text()).toContain("addEventListener('push'");
  expect(await sw.text()).toContain("addEventListener('notificationclick'");
  const badge = await request.get(basePath + '/badge.png');
  expect(badge.status()).toBe(200);
  expect(badge.headers()['content-type']).toContain('image/png');
});
