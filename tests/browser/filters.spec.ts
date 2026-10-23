import { test, expect } from '@playwright/test';

for (const mobile of [false, true]) {
  test(`due date filters, ranges and sorting ${mobile ? 'on mobile' : 'on desktop'}`, async ({ page }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    // Keep this deterministic and safe on both local and deployed apps: no fleet writes.
    const offsets = [-1, 0, 7, 8, 14, 15, 30, 31, 60, 61, 90, 91];
    const trucks = offsets.map((days, i) => ({
      id: 'filter-' + i,
      unit_number: String(i + 1),
      vehicle_type: i % 2 ? 'Trailer' : 'Tractor',
      next_due_date: new Date(Date.UTC(2030, 0, 10 + days)).toISOString().slice(0, 10),
      days_remaining: days,
      safety_status: days < 0 ? 'overdue' : days <= 14 ? 'due_soon' : 'good',
      interval_months: 12,
      status: 'Active',
    }));
    await page.route('**/truck-safety/api/auth/verify', route => route.fulfill({ json: { ok: true } }));
    await page.route('**/truck-safety/api/trucks', route => route.fulfill({ json: { trucks: [...trucks].reverse(), settings: { warning_days: 14 } } }));
    await page.goto('/truck-safety/');
    const cards = page.locator('#fleet-grid .unit-title > span:first-child');
    const filter = page.getByLabel('Due date', { exact: true });
    const labels = (indices: number[]) => indices.map(i => 'Unit #' + (i + 1));
    await expect(cards).toHaveText(labels(offsets.map((_, i) => i)));
    await expect(filter.locator('option[value="due_soon"]')).toContainText('14 days');

    const cases: [string, number[]][] = [
      ['overdue', [0]], ['today', [1]], ['due_soon', [1, 2, 3, 4]],
      ['within_7', [1, 2]], ['within_14', [1, 2, 3, 4]],
      ['within_30', [1, 2, 3, 4, 5, 6]],
      ['within_60', [1, 2, 3, 4, 5, 6, 7, 8]],
      ['within_90', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]],
      ['good', [5, 6, 7, 8, 9, 10, 11]],
    ];
    for (const [value, indices] of cases) {
      await filter.selectOption(value);
      await expect(cards).toHaveText(labels(indices));
      await expect(page.locator('#filter-results')).toContainText(`Showing ${indices.length} of 12 units`);
    }
    await filter.selectOption('all');
    await page.getByLabel('Sort by').selectOption('latest');
    await expect(cards).toHaveText(labels(offsets.map((_, i) => i).reverse()));
    await page.getByLabel('Sort by').selectOption('unit');
    await expect(cards).toHaveText(labels(offsets.map((_, i) => i)));

    await filter.selectOption('within_30');
    await page.getByLabel('Vehicle type', { exact: true }).selectOption('Trailer');
    await expect(cards).toHaveText(labels([1, 3, 5]));
    await page.locator('#search-input').fill('6');
    await expect(cards).toHaveText(['Unit #6']);
    await page.locator('#search-input').fill('not-present');
    await expect(cards).toHaveCount(0);
    await expect(page.locator('#fleet-empty-title')).toHaveText('No units match these filters');
    await expect(page.locator('#btn-empty-add')).toBeHidden();
    await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
    await expect(cards).toHaveCount(12);
    await expect(page.getByLabel('Sort by')).toHaveValue('earliest');
    await expect(page.getByLabel('Vehicle type', { exact: true })).toHaveValue('all');

    await filter.selectOption('range');
    await page.getByLabel('Due on or after').fill(trucks[2].next_due_date);
    await page.getByLabel('Due on or before').fill(trucks[4].next_due_date);
    await expect(cards).toHaveText(labels([2, 3, 4]));
    await page.getByLabel('Due on or after').fill(trucks[5].next_due_date);
    await expect(cards).toHaveCount(0);
    await expect(page.locator('#filter-results')).toHaveText('End date must be on or after the start date.');
    await page.getByLabel('Due on or before').fill('');
    await expect(cards).toHaveText(labels([5, 6, 7, 8, 9, 10, 11]));
    await page.getByLabel('Due on or after').fill('');
    await page.getByLabel('Due on or before').fill(trucks[0].next_due_date);
    await expect(cards).toHaveText(labels([0]));
    await page.locator('[data-kpi="due_soon"]').click();
    await expect(filter).toHaveValue('due_soon');
    await expect(page.getByLabel('Due on or after')).toBeHidden();
    await expect(cards).toHaveText(labels([1, 2, 3, 4]));
    await page.locator('#btn-refresh').click();
    await expect(cards).toHaveText(labels([1, 2, 3, 4]));
    await expect(page.locator('[data-kpi="due_soon"]')).toHaveClass(/active-filter/);
    if (mobile) expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
