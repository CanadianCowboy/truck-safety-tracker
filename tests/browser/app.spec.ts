import { test, expect } from '@playwright/test';

const base = '/truck-safety';
const passcode = process.env.APP_PASSCODE || 'passcode';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2H9sAAAAASUVORK5CYII=', 'base64');

test('fleet workflow works on desktop and a second mobile device', async ({ page, browser, baseURL }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  const unauthorized = await page.request.get(base + '/api/trucks');
  expect(unauthorized.status()).toBe(401);
  await page.goto(base);
  await expect(page.locator('#gate-view')).toBeVisible();
  const manifest = await (await page.request.get(base + '/manifest.json')).json();
  expect(manifest.start_url).toBe(base + '/');
  expect(manifest.scope).toBe(base + '/');
  for (const size of [192, 512]) {
    const icon = await page.request.get(base + '/icon-' + size + '.png');
    expect(icon.ok()).toBe(true);
    expect(icon.headers()['content-type']).toContain('image/png');
  }
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(new URL(scope).pathname).toBe(base + '/');
  await page.locator('#gate-passcode').fill('not-the-passcode');
  await page.locator('#gate-submit').click();
  await expect(page.locator('#gate-error')).toHaveText('Invalid passcode');
  await page.locator('#gate-passcode').fill(passcode);
  await page.locator('#gate-submit').click();
  await expect(page.locator('#app-view')).toBeVisible();
  const unit = 'VERIFY-' + Date.now();
  let id: string | undefined;
  let mobile;
  try {
    await page.locator('#btn-add-truck').click();
    await page.locator('#truck-unit').fill(unit);
    await page.locator('#truck-type').selectOption('Other');
    await page.locator('#truck-model').fill('S650');
    await page.locator('#truck-equipment-type').fill('Skid Steer');
    await page.locator('#truck-gvwr').fill('36,287 kg');
    await page.locator('#truck-no-date').check();
    await expect(page.locator('#truck-last-date')).toBeDisabled();
    await expect(page.locator('#truck-due-date')).toBeDisabled();
    await expect(page.locator('#truck-due-date')).toHaveValue('');
    const saved = page.waitForResponse(r => r.url().endsWith('/api/trucks') && r.request().method() === 'POST');
    await page.locator('#truck-save-btn').click();
    const response = await saved;
    expect(response.status()).toBe(201);
    id = (await (await page.request.get(base + '/api/trucks')).json()).trucks.find((t: { unit_number: string }) => t.unit_number === unit).id;
    const card = page.locator('.truck-card').filter({ hasText: unit });
    await expect(card).toContainText('NO DATE SET');
    await expect(card).toContainText('Skid Steer');
    await card.locator('[data-edit]').click();
    await expect(page.locator('#truck-no-date')).toBeChecked();
    await expect(page.locator('#truck-equipment-type')).toHaveValue('Skid Steer');
    await page.locator('#truck-no-date').uncheck();
    await page.locator('#truck-type').selectOption('Trailer');
    await page.locator('#truck-last-date').fill('2024-02-29');
    await page.locator('#truck-last-date').dispatchEvent('change');
    await expect(page.locator('#truck-due-date')).toHaveValue('2025-02-28');
    await page.locator('#truck-plate').fill('TEST-PLATE');
    const edited = page.waitForResponse(r => r.url().endsWith('/api/trucks/' + id) && r.request().method() === 'PUT');
    await page.locator('#truck-save-btn').click();
    expect((await edited).status()).toBe(200);
    await expect(page.locator('#modal-truck')).toBeHidden();
    await expect(card).toContainText('OVERDUE');
    await expect(card).toContainText('TEST-PLATE');

    await card.locator('[data-inspect]').click();
    await page.locator('#inspect-date').fill('2026-10-19');
    await page.locator('#inspect-exp-date').fill('2030-10-19');
    await page.locator('#inspect-sticker').fill('VERIFY-CERT');
    await page.locator('#inspect-file').setInputFiles({ name: 'inspection.png', mimeType: 'image/png', buffer: png });
    const logged = page.waitForResponse(r => r.url().endsWith('/inspections') && r.request().method() === 'POST');
    await page.locator('#inspect-save-btn').click();
    const logResponse = await logged;
    expect(logResponse.status()).toBe(201);
    const history = await (await page.request.get(base + '/api/trucks/' + id + '/inspections')).json();
    const attachment = history.inspections.find((i: { sticker_number: string }) => i.sticker_number === 'VERIFY-CERT').attachments[0];
    await expect(card).toContainText('days left');
    await expect(card).toContainText('Files (1)');
    await card.locator('[data-view-file]').click();
    const img = page.locator('#viewer-container img');
    await expect(img).toBeVisible();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    const downloaded = page.waitForEvent('download');
    await page.locator('#viewer-download').click();
    expect((await downloaded).suggestedFilename()).toBe('inspection.png');
    await page.locator('#modal-viewer [data-close]').click();
    const imageResponse = await page.request.get(base + '/api/attachments/' + attachment.id);
    expect(imageResponse.status()).toBe(200);
    expect(await imageResponse.body()).toEqual(png);
    expect(imageResponse.headers()['cache-control']).toBe('no-store');

    await card.locator('[data-history]').click();
    await expect(page.locator('#history-list')).toContainText('VERIFY-CERT');
    await expect(page.locator('#history-list')).toContainText('inspection.png');
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
    await page.locator('#quick-upload-input').setInputFiles({ name: 'sheet.pdf', mimeType: 'application/pdf', buffer: pdf });
    const uploaded = page.waitForResponse(r => r.url().endsWith('/attachments') && r.request().method() === 'POST');
    await page.locator('#btn-quick-upload').click();
    expect((await uploaded).status()).toBe(201);
    await expect(page.locator('#history-list')).toContainText('sheet.pdf');
    await page.locator('.file-chip').filter({ hasText: 'sheet.pdf' }).getByRole('button', { name: 'View', exact: true }).click();
    await expect(page.locator('#viewer-container iframe')).toBeVisible();
    const pdfResponse = await page.request.get(await page.locator('#viewer-container iframe').getAttribute('src') || '');
    expect(pdfResponse.headers()['content-type']).toBe('application/pdf');
    expect(await pdfResponse.body()).toEqual(pdf);
    await page.locator('#modal-viewer [data-close]').click();
    await page.locator('#modal-history [data-close]').click();
    await page.locator('#header-tools > summary').click();
    const calendar = page.waitForEvent('download');
    await page.locator('#btn-export-ics').click();
    expect((await calendar).suggestedFilename()).toBe('truck-safety-schedule.ics');
    const ics = await page.request.get(base + '/api/calendar.ics');
    expect(await ics.text()).toContain('Unit #' + unit);

    mobile = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const phone = await mobile.newPage();
    await phone.goto(base + '/');
    await phone.locator('#gate-passcode').fill(passcode);
    await phone.locator('#gate-submit').click();
    await expect(phone.locator('.truck-card').filter({ hasText: unit })).toContainText('36,287 kg');
    expect(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await phone.locator('#btn-lock').click();
    await expect(phone.locator('#gate-view')).toBeVisible();
    expect((await phone.request.get(base + '/api/attachments/' + attachment.id)).status()).toBe(401);
    expect((await phone.request.get(base + '/api/trucks')).status()).toBe(401);

    await page.reload();
    await expect(page.locator('#app-view')).toBeVisible();
    await expect(page.locator('.truck-card').filter({ hasText: unit })).toBeVisible();
    expect((await page.request.post(base + '/api/trucks', { data: { unit_number: 'BAD', next_due_date: '2026-02-30' } })).status()).toBe(400);
    const rejected = await page.request.post(base + '/api/trucks/' + id + '/attachments', { multipart: { file: { name: 'bad.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') } } });
    expect(rejected.status()).toBe(400);
    expect(errors).toEqual([]);
  } finally {
    if (id) {
      const cleanup = await page.request.delete(base + '/api/trucks/' + id);
      expect(cleanup.ok()).toBe(true);
      expect((await page.request.get(base + '/api/trucks/' + id)).status()).toBe(404);
    }
    await mobile?.close();
  }
});
