import { test, expect, basePath } from './support';

test('real authentication, path scoping and security headers protect fleet data', async ({ page, request, playwright, baseURL }) => {
  const anonymous = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  try {
    for (const path of ['/api/trucks', '/api/settings', '/api/calendar.ics', '/api/push/config']) expect((await anonymous.get(basePath + path)).status(), path).toBe(401);
    for (const path of ['/api/vin/decode', '/api/push/subscribe', '/api/push/unsubscribe', '/api/push/test', '/api/push/send']) expect((await anonymous.post(basePath + path, { data: {} })).status(), path).toBe(401);
    const html = await request.get(basePath + '/');
    expect(html.status()).toBe(200);
    const csp = html.headers()['content-security-policy'];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(html.headers()['referrer-policy']).toBe('no-referrer');
    expect((await request.get('/not-truck-safety')).status()).toBe(404);
    await page.goto(basePath + '/');
    await expect(page.locator('#app-view')).toBeVisible();
    const cookies = await page.context().cookies();
    const session = cookies.find(cookie => cookie.name === 'ts_token');
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe('Strict');
    expect(session?.path).toBe(basePath + '/');
    await page.locator('#header-tools > summary').click();
    await page.locator('#btn-settings').click();
    await expect(page.locator('#modal-settings')).toBeVisible();
    await page.evaluate(() => document.getElementById('btn-lock')!.click());
    await expect(page.locator('#gate-view')).toBeVisible();
    await expect(page.locator('#modal-settings')).toBeHidden();
    await expect(page.locator('#fleet-grid')).toBeEmpty();
    expect((await page.request.get(basePath + '/api/trucks')).status()).toBe(401);
    expect(await page.evaluate(() => localStorage.getItem('truck_safety_token'))).toBeNull();
  } finally { await anonymous.dispose(); }
});
