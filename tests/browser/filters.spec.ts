import { test, expect, basePath, readFleet } from './support';

for (const mobile of [false, true]) {
  test(`filters operate on the actual fleet ${mobile ? 'on mobile' : 'on desktop'}`, async ({ page, request }) => {
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 });
    const { trucks, settings } = await readFleet(request);
    await page.goto(basePath + '/');
    await expect(page.locator('#app-view')).toBeVisible();
    await expect(page.locator('#fleet-grid .truck-card')).toHaveCount(trucks.length);
    if (mobile) await page.locator('#btn-mobile-filter-sheet').click();
    const filter = page.locator('#filter-status');
    await expect(filter.locator('option[value="due_soon"]')).toContainText(String(settings.warning_days));
    for (const [value, count] of [
      ['overdue', trucks.filter(truck => truck.safety_status === 'overdue').length],
      ['due_soon', trucks.filter(truck => truck.safety_status === 'due_soon').length],
      ['no_date', trucks.filter(truck => truck.safety_status === 'no_date').length],
      ['good', trucks.filter(truck => truck.safety_status === 'good').length],
      ['today', trucks.filter(truck => truck.days_remaining === 0).length],
      ['within_30', trucks.filter(truck => truck.days_remaining !== null && truck.days_remaining >= 0 && truck.days_remaining <= 30).length],
    ] as const) {
      await filter.selectOption(value);
      await expect(page.locator('#fleet-grid .truck-card')).toHaveCount(count);
    }
    await filter.selectOption('all');
    await page.locator('#filter-vehicle-type').selectOption('Trailer');
    await expect(page.locator('#fleet-grid .truck-card')).toHaveCount(trucks.filter(truck => truck.vehicle_type === 'Trailer').length);
    await page.locator('#filter-vehicle-type').selectOption('all');
    for (const sort of ['unit', 'latest', 'earliest']) {
      await page.locator('#sort-due').selectOption(sort);
      await expect(page.locator('#fleet-grid .truck-card')).toHaveCount(trucks.length);
    }
    await filter.selectOption('range');
    // Invalid range is input validation, not a fabricated fleet record.
    await page.locator('#filter-from').fill('2026-10-24');
    await page.locator('#filter-to').fill('2026-10-23');
    await expect(page.locator('#filter-results')).toHaveText('End date must be on or after the start date.');
    await expect(page.locator('#fleet-grid .truck-card')).toHaveCount(0);
    await page.locator(mobile ? '#btn-filter-sheet-reset' : '#btn-clear-filters').click();
    await expect(filter).toHaveValue('all');
    await expect(page.locator('#fleet-grid .truck-card')).toHaveCount(trucks.length);
    if (mobile) await page.locator('#btn-filter-sheet-apply').click();
    if (trucks.length) {
      await page.locator('#search-input').fill(trucks[0].unit_number);
      const matches = trucks.filter(truck => [truck.unit_number, truck.vehicle_type, truck.equipment_type, truck.gvwr, truck.license_plate, truck.vin, truck.year, truck.make, truck.model, truck.shop_name, truck.sticker_number, truck.notes].join(' ').toLowerCase().includes(trucks[0].unit_number.toLowerCase()));
      await expect(page.locator('#fleet-grid .truck-card')).toHaveCount(matches.length);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
