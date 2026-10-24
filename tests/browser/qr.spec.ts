import { test, expect, basePath, readFleet } from './support';

test('real scanner validates pasted input without opening the camera or creating records', async ({ page, request }) => {
  const before = (await readFleet(request)).trucks;
  await page.goto(basePath + '/');
  await page.locator('#btn-scan-unit').click();
  await page.locator('#scan-uuid').fill('invalid');
  await page.getByRole('button', { name: 'Open unit', exact: true }).click();
  await expect(page.locator('#scan-status')).toContainText('Not a valid unit UUID');
  await expect(page.locator('#qr-camera')).toBeHidden();
  await page.locator('#modal-scan [data-close]').click();
  expect((await readFleet(request)).trucks).toEqual(before);
});

test('actual fleet UUID labels and details remain read-only', async ({ page, request }, testInfo) => {
  const { trucks } = await readFleet(request);
  if (!trucks.length) {
    testInfo.annotations.push({ type: 'coverage-limitation', description: 'No real fleet units exist: QR label decoding and unit history cannot be exercised without seeding data. Scanner validation is verified separately.' });
    await page.goto(basePath + '/');
    await expect(page.locator('#fleet-empty')).toBeVisible();
    return;
  }
  const truck = trucks[0];
  const labelResponse = await request.get(basePath + '/api/trucks/' + encodeURIComponent(truck.id) + '/label');
  expect(labelResponse.status()).toBe(200);
  await page.goto(basePath + '/api/trucks/' + encodeURIComponent(truck.id) + '/label');
  await expect(page.locator('#qr-label')).toBeVisible();
  expect(await page.locator('#qr-label').evaluate(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height }))).toEqual({ width: 144, height: 144 });
  const svg = await page.locator('#qr-label').innerHTML();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.controls')).toBeHidden();
  expect(await page.locator('#qr-label').evaluate(el => el.getBoundingClientRect().width)).toBe(144);
  await page.emulateMedia({ media: 'screen' });
  // The print label deliberately disallows external scripts/images. Decode its actual SVG in the app context.
  await page.goto(basePath + '/');
  await page.addScriptTag({ url: basePath + '/qr-reader.js' });
  const decoded = await page.evaluate(async markup => {
    const source = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
    try {
      const image = new Image(); image.src = source; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 600;
      const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0, 600, 600);
      const pixels = ctx.getImageData(0, 0, 600, 600);
      const decoder = (window as typeof window & { jsQR: (data: Uint8ClampedArray, w: number, h: number) => { data: string } | null }).jsQR;
      return decoder(pixels.data, 600, 600)?.data;
    } finally { URL.revokeObjectURL(source); }
  }, svg);
  expect(decoded).toBe(truck.id);
  await page.goto(basePath + '/?unit=' + encodeURIComponent(truck.id));
  await expect(page.locator('#unit-title')).toHaveText('Unit #' + truck.unit_number);
  await expect(page.locator('#unit-details')).toContainText(truck.id);
  const history = await request.get(basePath + '/api/trucks/' + encodeURIComponent(truck.id) + '/inspections');
  expect(history.status()).toBe(200);
  expect(Array.isArray((await history.json()).inspections)).toBe(true);
});
