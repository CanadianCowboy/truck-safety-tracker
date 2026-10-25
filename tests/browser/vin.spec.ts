import { test, expect, basePath, readFleet } from './support';
import type { VinDecodeResult } from '../../src/vin';

// This publicly documented VIN is decoded by NHTSA; it is never saved to the fleet.
const publicVin = '1M8GDM9AXKP042788';

for (const mobile of [false, true]) {
  test(`real NHTSA preview supports selection, comparison and advisory duplicates ${mobile ? 'on mobile' : 'on desktop'}`, async ({ page, request }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const { trucks } = await readFleet(request);
    const before = [...trucks].sort((a, b) => a.id.localeCompare(b.id));
    await page.setViewportSize(mobile ? { width: 320, height: 740 } : { width: 1360, height: 900 });
    await page.goto(basePath + '/');
    await page.locator(mobile ? '#mobile-nav-tools' : '#header-tools > summary').click();
    await page.locator('#btn-vin-decoder').click();
    await expect(page.locator('#vin-input')).toHaveValue('');
    await expect(page.locator('#vin-connectivity')).toHaveAttribute('data-state', 'not-checked');
    await expect(page.locator('#vin-connectivity-title')).toHaveText('NHTSA connection not checked');
    await page.locator('#vin-input').fill(publicVin.toLowerCase());
    await page.locator('#vin-year').fill('1989');
    const lookup = page.waitForResponse(response => response.url().endsWith('/api/vin/decode') && response.request().method() === 'POST');
    await page.locator('#btn-vin-lookup').click();
    await expect(page.locator('#vin-connectivity')).toHaveAttribute('data-state', 'checking');
    await expect(page.locator('#vin-connectivity-title')).toHaveText('Checking NHTSA connection…');
    await expect(page.locator('#btn-vin-lookup')).toBeDisabled();
    const response = await lookup;
    if (response.status() === 502 || response.status() === 504) {
      const { error } = await response.json();
      await expect(page.locator('#vin-connectivity')).toHaveAttribute('data-state', 'unavailable');
      await expect(page.locator('#vin-connectivity-title')).toHaveText('NHTSA temporarily unavailable');
      await expect(page.locator('#vin-connectivity-detail')).toContainText(error);
      await expect(page.locator('#vin-connectivity-detail')).toContainText('enter details manually');
      await expect(page.locator('#btn-vin-lookup')).toHaveText('Retry VIN lookup');
      await expect(page.locator('#btn-vin-lookup')).toBeEnabled();
      await expect(page.locator('#vin-input')).toHaveValue(publicVin);
      await expect(page.locator('#vin-year')).toHaveValue('1989');
      await expect(page.locator('#vin-preview')).toBeHidden();
      await expect(page.locator('#btn-vin-apply')).toBeDisabled();
    }
    // Even if outage UX is correct, a failed real-service check remains a failure.
    expect(response.status(), 'The actual Worker and NHTSA must succeed; no fallback data').toBe(200);
    expect(response.headers()['cache-control']).toBe('no-store');
    const { decoded }: { decoded: VinDecodeResult } = await response.json();
    expect(Object.keys(decoded.raw_data).length).toBeGreaterThan(30);
    expect(decoded.raw_data.EngineHP).toBe('400');
    expect(decoded.raw_data.PlantCity).toBe('PEMBINA');
    expect(decoded.vin).toBe(publicVin);
    expect(decoded.year).toBe(1989);
    expect(decoded.make).toBe('MOTOR COACH INDUSTRIES');
    await expect(page.locator('#vin-preview')).toBeVisible();
    const availableRawFields = Object.keys(decoded.raw_data).length;
    await expect(page.locator('#vin-all-data-summary')).toContainText(availableRawFields + ' fields');
    await expect(page.locator('#vin-all-data .meta-item')).toHaveCount(0);
    await expect(page.locator('#vin-all-data-section')).toBeHidden();
    await page.locator('#vin-all-data-section > summary').click();
    await expect(page.locator('#vin-all-data .meta-item')).toHaveCount(availableRawFields);
    await expect(page.locator('#vin-all-data .meta-item').filter({ hasText: 'EngineHP' })).toContainText('400');
    await expect(page.locator('#vin-all-data .meta-item').filter({ hasText: 'PlantCity' })).toContainText('PEMBINA');
    await expect(page.locator('#vin-all-data .meta-item').filter({ hasText: 'ABS' })).toContainText('Not provided by NHTSA');
    await expect(page.locator('#vin-connectivity')).toHaveAttribute('data-state', 'connected');
    await expect(page.locator('#vin-connectivity-title')).toHaveText('NHTSA connected — last lookup');
    await expect(page.locator('#btn-vin-lookup')).toBeEnabled();
    await expect(page.locator('#vin-input')).toHaveValue(publicVin);
    await expect(page.locator('#vin-comparison-note')).toBeHidden();
    const available = [decoded.vin, decoded.year, decoded.make, decoded.model, decoded.vehicle_type, decoded.equipment_type, decoded.gvwr].filter(value => value != null && value !== '');
    await expect(page.locator('#vin-details [data-vin-field]:checked')).toHaveCount(available.length);
    await expect(page.locator('#vin-warnings')).toHaveText(decoded.warnings.join(' '));
    const matches = trucks.filter(truck => truck.vin.trim().toUpperCase() === publicVin);
    if (matches.length) {
      for (const match of matches) await expect(page.locator('#vin-duplicate-warning')).toContainText('Unit #' + match.unit_number);
    } else await expect(page.locator('#vin-duplicate-warning')).toBeHidden();
    await expect(page.locator('#btn-vin-select-all')).toBeDisabled();
    await expect(page.locator('#vin-details [data-vin-field]')).toHaveCount(available.length);
    await page.locator('#btn-vin-clear-selection').click();
    await expect(page.locator('#btn-vin-apply')).toBeDisabled();
    await expect(page.locator('#vin-details [data-vin-field]:checked')).toHaveCount(0);
    await expect(page.locator('#btn-vin-apply')).toBeDisabled();
    await page.locator('#btn-vin-select-all').click();
    await expect(page.locator('#vin-details [data-vin-field]:checked')).toHaveCount(available.length);
    for (const id of ['btn-vin-lookup', 'btn-vin-apply', 'btn-vin-select-all', 'btn-vin-clear-selection']) {
      const box = await page.locator('#' + id).boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await page.locator('#btn-vin-clear-selection').click();
    const make = page.getByRole('checkbox', { name: 'Apply Make', exact: true });
    await make.focus();
    await page.keyboard.press('Space');
    await expect(make).toBeChecked();
    await page.locator('#btn-vin-apply').click();
    await expect(page.locator('#truck-make')).toHaveValue(decoded.make);
    await expect(page.locator('#truck-vin')).toHaveValue('');
    await expect(page.locator('#truck-year')).toHaveValue('');
    await expect(page.locator('#truck-model')).toHaveValue('');
    await expect(page.locator('#truck-vin-data')).toHaveValue(JSON.stringify(decoded.raw_data));
    await expect(page.locator('#truck-no-date')).toBeChecked();
    await expect(page.locator('#truck-last-date')).toHaveValue('');
    await expect(page.locator('#truck-due-date')).toHaveValue('');
    // The only current value is an unsaved value returned by the actual provider, not invented data.
    await page.locator('#btn-truck-decode-vin').click();
    await page.locator('#vin-input').fill(publicVin);
    await page.locator('#vin-year').fill('1989');
    const comparison = page.waitForResponse('**/api/vin/decode');
    await page.locator('#btn-vin-lookup').click();
    expect((await comparison).status()).toBe(200);
    await expect(page.locator('#vin-details [data-vin-field]')).toHaveCount(available.length);
    const makeRow = page.locator('[data-vin-detail="truck-make"]');
    await expect(makeRow.locator('[data-vin-current]')).toHaveText(decoded.make);
    await expect(makeRow.locator('[data-vin-decoded]')).toHaveText(decoded.make);
    await expect(page.locator('[data-vin-detail="truck-vin"] [data-vin-current]')).toHaveText('Not set');
    const current = await makeRow.locator('[data-vin-current]').boundingBox();
    const incoming = await makeRow.locator('[data-vin-decoded]').boundingBox();
    expect(current!.x + current!.width).toBeLessThanOrEqual(incoming!.x);
    expect(Math.abs(current!.y - incoming!.y)).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('#truck-vin-data')).toHaveValue(JSON.stringify(decoded.raw_data));
    await page.locator('#vin-year').fill('');
    await expect(page.locator('#vin-preview')).toBeHidden();
    await expect(page.locator('#vin-duplicate-warning')).toBeHidden();
    await expect(page.locator('#vin-details')).toBeEmpty();
    // Editing invalidates the preview, not the factual result of the last connection check.
    await expect(page.locator('#vin-connectivity')).toHaveAttribute('data-state', 'connected');
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-vin')).toBeHidden();
    const matchingUnit = trucks.find(truck => truck.vin.trim().toUpperCase() === publicVin);
    if (matchingUnit) await page.locator('[data-select-unit="' + matchingUnit.id + '"]').evaluate(button => (button as HTMLButtonElement).click());
    if (matchingUnit) {
      await expect(page.locator('#unit-details')).toContainText('NHTSA: EngineHP');
      await expect(page.locator('#unit-details')).toContainText(decoded.raw_data.EngineHP);
      await expect(page.locator('#unit-details')).toContainText('NHTSA: PlantCity');
    }
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#modal-truck').getByRole('button', { name: 'Cancel', exact: true }).click();
    expect([...(await readFleet(request)).trucks].sort((a, b) => a.id.localeCompare(b.id))).toEqual(before);
    expect(errors).toEqual([]);
  });
}

test('real VIN route rejects invalid input and unauthorized or cross-site requests', async ({ page, request, playwright, baseURL }) => {
  const anonymous = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  try {
    expect((await anonymous.post(basePath + '/api/vin/decode', { data: { vin: publicVin } })).status()).toBe(401);
    expect((await request.post(basePath + '/api/vin/decode', { headers: { Origin: 'https://vpic.nhtsa.dot.gov' }, data: { vin: publicVin } })).status()).toBe(403);
    expect((await request.post(basePath + '/api/vin/decode', { data: { vin: '' } })).status()).toBe(400);
    expect((await request.post(basePath + '/api/vin/decode', { data: { vin: publicVin, year: 1980 } })).status()).toBe(400);
    await page.goto(basePath + '/');
    await page.locator('#header-tools > summary').click();
    await page.locator('#btn-vin-decoder').click();
    const providerRequests: string[] = [];
    page.on('request', request => { if (request.url().endsWith('/api/vin/decode')) providerRequests.push(request.url()); });
    await expect(page.locator('#vin-connectivity')).toHaveAttribute('role', 'status');
    await expect(page.locator('#vin-connectivity')).toHaveAttribute('aria-atomic', 'true');
    await page.locator('#vin-input').fill('invalid');
    await page.locator('#btn-vin-lookup').click();
    await expect(page.locator('#vin-status')).toContainText('17-character');
    await expect(page.locator('#vin-preview')).toBeHidden();
    await expect(page.locator('#vin-connectivity')).toHaveAttribute('data-state', 'not-checked');
    expect(providerRequests).toEqual([]);
  } finally { await anonymous.dispose(); }
});
