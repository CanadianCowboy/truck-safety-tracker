import { test, expect, type APIRequestContext } from '@playwright/test';

const base = '/truck-safety';

test('passcode rotation revokes old sessions and protected inputs reject unsafe values', async ({ browser, baseURL }) => {
  test.setTimeout(150000);
  // The real app intentionally permits only 10 logins per minute. A growing suite
  // must wait for a new window, not weaken the limiter or accept a 429 as success.
  async function login(request: APIRequestContext, passcode: string) {
    let response = await request.post(base + '/api/auth/login', { data: { passcode } });
    if (response.status() === 429) {
      const retrySeconds = Number(response.headers()['retry-after'] || 60);
      await new Promise(resolve => setTimeout(resolve, (retrySeconds + 1) * 1000));
      response = await request.post(base + '/api/auth/login', { data: { passcode } });
    }
    return response;
  }
  const first = await browser.newContext({ baseURL });
  const second = await browser.newContext({ baseURL });
  const changed = 'temporary-test-' + Date.now();
  let rotated = false;
  let id: string | undefined;
  try {
    for (const context of [first, second]) {
      expect((await login(context.request, 'passcode')).ok()).toBe(true);
    }
    const cookies = await first.cookies();
    expect(cookies.find(c => c.name === 'ts_token')?.httpOnly).toBe(true);
    expect((await first.request.post(base + '/api/trucks', { data: { unit_number: 'cross-site', next_due_date: '2030-01-01' }, headers: { Origin: 'https://example.com' } })).status()).toBe(403);
    const create = await first.request.post(base + '/api/trucks', { data: { unit_number: 'SECURITY-' + Date.now(), next_due_date: '2030-01-01' } });
    expect(create.status()).toBe(201);
    id = (await create.json()).truck.id;
    expect((await first.request.put(base + '/api/trucks/' + id, { data: { unit_number: '' } })).status()).toBe(400);
    expect((await first.request.put(base + '/api/settings', { data: { webhook_url: 'http://127.0.0.1' } })).status()).toBe(400);
    const badFile = await first.request.post(base + '/api/trucks/' + id + '/attachments', { multipart: { file: { name: 'fake.pdf', mimeType: 'application/pdf', buffer: Buffer.from('<html>not a PDF</html>') } } });
    expect(badFile.status()).toBe(400);
    const tooBig = await first.request.post(base + '/api/trucks/' + id + '/attachments', { multipart: { file: { name: 'large.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) } } });
    expect(tooBig.status()).toBe(413);
    const invalidInspection = await first.request.post(base + '/api/trucks/' + id + '/inspections', { data: { inspection_date: '2030-01-01', expiration_date: '2029-12-31' } });
    expect(invalidInspection.status()).toBe(400);
    const row = (await (await first.request.get(base + '/api/trucks/' + id)).json()).truck;
    expect(row.next_due_date).toBe('2030-01-01');
    const rotate = await first.request.put(base + '/api/settings', { data: { new_passcode: changed } });
    expect(rotate.ok()).toBe(true);
    rotated = true;
    expect((await second.request.get(base + '/api/trucks')).status()).toBe(401);
    expect((await login(second.request, 'passcode')).status()).toBe(401);
    expect((await login(second.request, changed)).ok()).toBe(true);
    const page = await first.newPage();
    await page.goto(base + '/');
    await expect(page.locator('#app-view')).toBeVisible();
    await page.locator('#header-tools > summary').click();
    await page.locator('#btn-settings').click();
    await expect(page.locator('#modal-settings')).toBeVisible();
    await page.evaluate(() => document.getElementById('btn-lock')!.click());
    await expect(page.locator('#gate-view')).toBeVisible();
    await expect(page.locator('#modal-settings')).toBeHidden();
    expect((await first.request.get(base + '/api/trucks')).status()).toBe(401);
    expect((await login(first.request, changed)).ok()).toBe(true);
  } finally {
    if (rotated) {
      // Restore the local dev passcode even if an assertion fails.
      await login(first.request, changed);
      expect((await first.request.put(base + '/api/settings', { data: { new_passcode: 'passcode' } })).ok()).toBe(true);
    }
    if (id) expect((await first.request.delete(base + '/api/trucks/' + id)).ok()).toBe(true);
    await first.close();
    await second.close();
  }
});
