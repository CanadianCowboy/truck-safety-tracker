import { test, expect } from '@playwright/test';
import qrcode from 'qrcode-generator';

const base = '/truck-safety';
const passcode = process.env.APP_PASSCODE || 'passcode';
const missing = '01234567-89ab-4cde-8fab-0123456789ab';

function svgFor(id: string) {
  const qr = qrcode(0, 'Q');
  qr.addData(id);
  qr.make();
  return qr.createSvgTag({ cellSize: 6, margin: 24 });
}

test('optional UUID labels print at 1.5 inches and open units only after unlocking', async ({ page, browser, baseURL }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));
  expect((await page.request.post(base + '/api/auth/login', { data: { passcode } })).ok()).toBe(true);
  const created = await page.request.post(base + '/api/trucks', { data: { unit_number: 'QR-VERIFY-' + Date.now(), next_due_date: '2035-01-01', status: 'Inactive', notes: 'QR unit detail note', vehicle_type: 'Trailer' } });
  expect(created.status()).toBe(201);
  const { truck } = await created.json();
  const id: string = truck.id;
  const scanner = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  let popup;
  try {
    await page.goto(base + '/');
    await page.locator('.truck-card').filter({ hasText: truck.unit_number }).getByRole('button', { name: 'Details' }).click();
    await expect(page.locator('#modal-unit')).toBeVisible();
    await expect(page.locator('#unit-title')).toHaveText('Unit #' + truck.unit_number);
    await expect(page.locator('#unit-details')).toContainText('QR unit detail note');
    await expect(page.locator('#unit-details')).toContainText('This unit is inactive.');
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'Print QR label' }).click();
    popup = await popupPromise;
    await popup.waitForLoadState();
    await expect(popup.locator('#qr-label')).toBeVisible();
    expect(await popup.locator('#qr-label').evaluate(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height }))).toEqual({ width: 144, height: 144 });
    await page.addScriptTag({ url: base + '/qr-reader.js' });
    const svgMarkup = await popup.locator('#qr-label').innerHTML();
    const decoded = await page.evaluate(async svg => {
      const src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      const img = new Image();
      img.src = src;
      await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 600;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, 600, 600);
      const pixels = ctx.getImageData(0, 0, 600, 600);
      const decoder = (window as typeof window & { jsQR: (data: Uint8ClampedArray, w: number, h: number) => { data: string } | null }).jsQR;
      const result = decoder(pixels.data, 600, 600);
      URL.revokeObjectURL(src);
      return result?.data;
    }, svgMarkup);
    expect(decoded).toBe(id);
    await popup.evaluate(() => { window.print = () => { document.body.dataset.printRequested = 'yes'; }; });
    await popup.getByRole('button', { name: 'Print label' }).click();
    await expect(popup.locator('body')).toHaveAttribute('data-print-requested', 'yes');
    await popup.emulateMedia({ media: 'print' });
    await expect(popup.locator('.controls')).toBeHidden();
    await expect(popup.locator('#qr-label')).toBeVisible();
    expect(await popup.locator('body').innerText()).toBe('');
    expect(await popup.locator('#qr-label').evaluate(el => el.getBoundingClientRect().width)).toBe(144);
    const pdf = await popup.pdf({ path: testInfo.outputPath('qr-label.pdf'), format: 'Letter', printBackground: true });
    expect(pdf.length).toBeGreaterThan(500);

    // Camera frames are simulated; the real shipped QR decoder processes those frames.
    await scanner.addInitScript(({ svg }) => {
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => {
        const img = new Image();
        const src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
        img.src = src; await img.decode();
        const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 480;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 480, 480); ctx.drawImage(img, 0, 0, 480, 480);
        URL.revokeObjectURL(src);
        const stream = canvas.captureStream(10);
        (window as typeof window & { testCameraStream: MediaStream }).testCameraStream = stream;
        return stream;
      } });
    }, { svg: svgFor(id) });
    const phone = await scanner.newPage();
    phone.on('pageerror', err => errors.push(err.message));
    const unitReads: string[] = [];
    phone.on('request', request => { if (request.url().endsWith('/api/trucks/' + id)) unitReads.push(request.url()); });
    await phone.goto(base + '/');
    await phone.locator('#gate-scan-unit').click();
    await phone.getByRole('button', { name: 'Start camera' }).click();
    await expect(phone.locator('#modal-scan')).toBeHidden();
    await expect(phone.locator('#pending-unit-message')).toBeVisible();
    await expect(phone.locator('#gate-view')).toBeVisible();
    await expect(phone.locator('#modal-unit')).toBeHidden();
    expect(unitReads).toEqual([]);
    expect(await phone.evaluate(() => (window as typeof window & { testCameraStream: MediaStream }).testCameraStream.getTracks().every(t => t.readyState === 'ended'))).toBe(true);
    expect((await phone.request.get(base + '/api/trucks/' + id)).status()).toBe(401);
    expect((await phone.request.get(base + '/api/trucks/' + id + '/label')).status()).toBe(401);
    // Selection survives reload and login; no auth token is included in the URL or QR.
    expect(new URL(phone.url()).searchParams.get('unit')).toBe(id);
    expect(new URL(phone.url()).searchParams.has('token')).toBe(false);
    await phone.reload();
    await expect(phone.locator('#pending-unit-message')).toBeVisible();
    await phone.locator('#gate-passcode').fill(passcode);
    await phone.locator('#gate-submit').click();
    await expect(phone.locator('#unit-title')).toHaveText('Unit #' + truck.unit_number);
    await expect(phone.locator('#unit-details')).toContainText(id);
    await phone.locator('#unit-actions').getByRole('button', { name: 'Log Safety', exact: true }).click();
    await expect(phone.locator('#modal-inspect')).toBeVisible();
    await expect(phone.locator('#inspect-truck-id')).toHaveValue(id);
    await phone.locator('#modal-inspect').getByRole('button', { name: 'Cancel', exact: true }).click();
    await phone.locator('#btn-scan-unit').click();
    await phone.locator('#scan-uuid').fill('not-a-uuid');
    await phone.getByRole('button', { name: 'Open unit', exact: true }).click();
    await expect(phone.locator('#scan-status')).toContainText('Not a valid unit UUID');
    await phone.locator('#scan-uuid').fill(missing);
    await phone.getByRole('button', { name: 'Open unit', exact: true }).click();
    await expect(phone.locator('#unit-details')).toContainText('Unit not found or deleted');
    await expect(phone.locator('#unit-print-label')).toBeHidden();
    await phone.locator('#modal-unit [data-close]').click();

    // Same UUID remains valid after a unit number change.
    expect((await page.request.put(base + '/api/trucks/' + id, { data: { unit_number: 'QR-RENAMED', notes: 'updated notes' } })).ok()).toBe(true);
    await phone.locator('#btn-scan-unit').click();
    await phone.locator('#scan-uuid').fill(id.toUpperCase());
    await phone.getByRole('button', { name: 'Open unit', exact: true }).click();
    await expect(phone.locator('#unit-title')).toHaveText('Unit #QR-RENAMED');
    await expect(phone.locator('#unit-details')).toContainText('updated notes');
    expect(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    await phone.evaluate(() => document.getElementById('btn-lock')!.click());
    await expect(phone.locator('#modal-unit')).toBeHidden();
    await expect(phone.locator('#unit-details')).toBeEmpty();
  } finally {
    expect((await page.request.delete(base + '/api/trucks/' + id)).ok()).toBe(true);
    await popup?.close();
    await scanner.close();
  }
});

test('camera permission errors do not prevent pasting a UUID', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => { throw new DOMException('Denied', 'NotAllowedError'); } });
  });
  await page.goto(base + '/');
  await page.locator('#gate-scan-unit').click();
  await page.getByRole('button', { name: 'Start camera' }).click();
  await expect(page.locator('#scan-status')).toContainText('permission denied');
  await page.locator('#scan-uuid').fill(missing);
  await page.getByRole('button', { name: 'Open unit', exact: true }).click();
  await expect(page.locator('#gate-view')).toBeVisible();
  await expect(page.locator('#pending-unit-message')).toBeVisible();
  await expect(page.locator('#modal-unit')).toBeHidden();
});
