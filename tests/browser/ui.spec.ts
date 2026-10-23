import { test, expect } from '@playwright/test';

const base = '/truck-safety';
const uuid = '5a7f5a5a-1234-4fab-8abc-123456789abc';
const trucks = [
  { id: uuid, unit_number: '10', vehicle_type: 'Tractor', next_due_date: '2030-01-01', last_inspection_date: '2029-01-01', interval_months: 12, days_remaining: -8, safety_status: 'overdue', status: 'Active', notes: 'Check brake paperwork', license_plate: 'SHOP-10', attachment_count: 2 },
  { id: '6a7f5a5a-1234-4fab-8abc-123456789abc', unit_number: '20', vehicle_type: 'Trailer', next_due_date: '2030-01-21', last_inspection_date: '', interval_months: 6, days_remaining: 12, safety_status: 'due_soon', status: 'In Shop', notes: 'A longer note to check the responsive layout', attachment_count: 0 },
  { id: '7a7f5a5a-1234-4fab-8abc-123456789abc', unit_number: '30', vehicle_type: 'Pickup / Service Truck', next_due_date: '2030-05-01', last_inspection_date: '', interval_months: 12, days_remaining: 112, safety_status: 'good', status: 'Active', attachment_count: 0 },
];

test.beforeEach(async ({ page }) => {
  await page.route('**/truck-safety/api/auth/verify', route => route.fulfill({ json: { ok: true } }));
  await page.route('**/truck-safety/api/trucks', route => route.fulfill({ json: { trucks, settings: { warning_days: 30 } } }));
  await page.route('**/truck-safety/api/trucks/' + uuid, route => route.fulfill({ json: { truck: trucks[0] } }));
  await page.route('**/truck-safety/api/trucks/' + uuid + '/inspections', route => route.fulfill({ json: { inspections: [], unlinked_attachments: [] } }));
});

test('theme and list preferences persist; list uses the same filters and actions', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/');
  await expect(page.locator('#app-view')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.truck-card').first()).toContainText('OVERDUE by 8 days');
  await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(241, 245, 249)');
  await page.getByRole('button', { name: 'Compact list', exact: true }).click();
  await expect(page.locator('#fleet-grid')).toBeHidden();
  await expect(page.locator('#fleet-table-wrap')).toBeVisible();
  await expect(page.locator('#fleet-table-body tr')).toHaveCount(3);
  await page.getByLabel('Due date', { exact: true }).selectOption('overdue');
  await expect(page.locator('#fleet-table-body tr')).toHaveCount(1);
  await expect(page.locator('#fleet-table-body')).toContainText('Unit #10');
  await page.locator('#fleet-table-body [data-details]').click();
  await expect(page.locator('#unit-title')).toHaveText('Unit #10');
  await expect(page.locator('#unit-details')).toContainText('Check brake paperwork');
  await page.locator('#modal-unit [data-close]').click();
  await page.locator('#fleet-table-body [data-edit]').click();
  await expect(page.locator('#truck-id')).toHaveValue(uuid);
  expect(await page.locator('#truck-unit').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(248, 250, 252)');
  await page.locator('#modal-truck').getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.locator('#fleet-table-body [data-inspect]').click();
  await expect(page.locator('#inspect-truck-id')).toHaveValue(uuid);
  await page.locator('#modal-inspect').getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.locator('#fleet-table-body [data-history]').click();
  await expect(page.locator('#history-modal-title')).toContainText('Unit #10');
  await page.locator('#modal-history [data-close]').click();
  await page.getByLabel('Due date', { exact: true }).selectOption('today');
  await expect(page.locator('#fleet-table-wrap')).toBeHidden();
  await expect(page.locator('#fleet-empty')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(page.locator('#fleet-table-body tr')).toHaveCount(3);
  await page.getByLabel('Sort by').selectOption('latest');
  await expect(page.locator('#fleet-table-body tr').first()).toContainText('Unit #30');
  await page.locator('[data-kpi="due_soon"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#filter-status')).toHaveValue('due_soon');
  await expect(page.locator('#fleet-table-body tr')).toHaveCount(1);
  await page.locator('#header-tools > summary').click();
  await expect(page.locator('#btn-settings')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#btn-settings')).toBeHidden();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('desktop-light-list.png'), fullPage: true });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('#fleet-table-wrap')).toBeVisible();
  await expect(page.locator('#view-list')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
  await page.getByRole('button', { name: 'Cards', exact: true }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#fleet-grid')).toBeVisible();
  await expect(page.locator('#fleet-table-wrap')).toBeHidden();
  expect(errors).toEqual([]);
});

test('light and dark themes have readable status colors and large touch targets at all sizes', async ({ page }, testInfo) => {
  await page.goto(base + '/');
  await expect(page.locator('.truck-card')).toHaveCount(3);
  // WCAG contrast, calculated from the actual opaque status and input colors in light mode.
  await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
  const contrast = await page.locator('.safety-badge').evaluateAll(elements => {
    function luminance(color: string) {
      const components = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(c => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
      return components[0] * 0.2126 + components[1] * 0.7152 + components[2] * 0.0722;
    }
    return elements.map(el => { const css = getComputedStyle(el); const a = luminance(css.color), b = luminance(css.backgroundColor); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); });
  });
  for (const ratio of contrast) expect(ratio).toBeGreaterThanOrEqual(4.5);
  await page.getByRole('button', { name: 'Compact list', exact: true }).click();
  for (const width of [320, 390, 820, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark']) {
      if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator('#app-view [data-theme-toggle]').click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${theme} layout at ${width}px`).toBe(true);
      if (width < 960) {
        await expect(page.locator('#fleet-grid')).toBeVisible();
        await expect(page.locator('#fleet-table-wrap')).toBeHidden();
        await expect(page.locator('#view-list')).toBeHidden();
      } else {
        await expect(page.locator('#fleet-grid')).toBeHidden();
        await expect(page.locator('#fleet-table-wrap')).toBeVisible();
      }
      for (const selector of ['#btn-add-truck', '#btn-scan-unit', '#btn-lock', '#filter-status', '#search-input']) {
        const box = await page.locator(selector).boundingBox();
        expect(box!.height, `${selector} touch height`).toBeGreaterThanOrEqual(44);
        expect(box!.width, `${selector} touch width`).toBeGreaterThanOrEqual(44);
      }
      await page.locator('#header-tools > summary').click();
      await expect(page.locator('#btn-settings')).toBeVisible();
      const tools = await page.locator('.tools-panel').boundingBox();
      expect(tools!.x).toBeGreaterThanOrEqual(0);
      expect(tools!.x + tools!.width).toBeLessThanOrEqual(width);
      await page.keyboard.press('Escape');
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('phone-dark-cards.png'), fullPage: true });
});

test('saved theme is applied on the passcode gate without showing fleet data', async ({ page }) => {
  await page.route('**/truck-safety/api/auth/verify', route => route.fulfill({ status: 401, json: { error: 'Unauthorized' } }));
  await page.addInitScript(() => localStorage.setItem('truck_safety_theme', 'light'));
  await page.goto(base + '/');
  await expect(page.locator('#gate-view')).toBeVisible();
  await expect(page.locator('#app-view')).toBeHidden();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
