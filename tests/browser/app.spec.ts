import { test, expect, basePath, readFleet } from './support';
import { enrichTruck } from '../../src/utils';

test('real application serves scoped PWA assets, actual fleet records and calendar', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const { trucks, settings } = await readFleet(request);
  await page.goto(basePath + '/');
  await expect(page.locator('#app-view')).toBeVisible();
  const manifestResponse = await request.get(basePath + '/manifest.json');
  expect(manifestResponse.status()).toBe(200);
  const manifest = await manifestResponse.json();
  expect(manifest.start_url).toBe(basePath + '/');
  expect(manifest.scope).toBe(basePath + '/');
  for (const size of [192, 512]) {
    const icon = await request.get(basePath + '/icon-' + size + '.png');
    expect(icon.status()).toBe(200);
    expect(icon.headers()['content-type']).toContain('image/png');
  }
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(new URL(scope).pathname).toBe(basePath + '/');
  await expect(page.locator('#kpi-total-count')).toHaveText(String(trucks.length));
  for (const truck of trucks) {
    const enriched = enrichTruck(truck, settings.warning_days, truck.attachment_count, truck.latest_attachment || null);
    expect(truck.days_remaining).toBe(enriched.days_remaining);
    expect(truck.safety_status).toBe(enriched.safety_status);
    if (truck.vin_data) {
      const vinData = JSON.parse(truck.vin_data);
      expect(vinData).not.toBeNull();
      expect(Array.isArray(vinData)).toBe(false);
    }
  }
  if (!trucks.length) await expect(page.locator('#fleet-empty-title')).toHaveText('No trucks or trailers found');
  const calendarResponse = await request.get(basePath + '/api/calendar.ics');
  expect(calendarResponse.status()).toBe(200);
  expect(calendarResponse.headers()['content-type']).toContain('text/calendar');
  expect(calendarResponse.headers()['content-disposition']).toContain('truck-safety-schedule.ics');
  const calendar = await calendarResponse.text();
  expect(calendar).toContain('BEGIN:VCALENDAR');
  expect(calendar).toContain('END:VCALENDAR');
  expect((calendar.match(/BEGIN:VEVENT/g) || []).length).toBe(trucks.filter(truck => truck.next_due_date).length);
  if (trucks.some(truck => truck.next_due_date)) expect(calendar).toContain('BEGIN:VALARM');
  expect(errors).toEqual([]);
});
