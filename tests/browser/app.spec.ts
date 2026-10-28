import { test, expect, basePath, readFleet } from './support';
import { enrichTruck } from '../../src/utils';

interface CalendarEntry {
  id: string;
  kind: 'shop' | 'inspection' | 'document';
  title: string;
  notes?: string;
  truck_id: string | null;
  unit_number?: string;
  category?: string;
  recurrence?: string;
  series_id?: string;
  series_start_date?: string;
  repeat_until?: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  start_time: string;
  end_time: string;
}

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

test('shop calendar shows real fleet dates, month/week/agenda and an unsaved appointment form', async ({ page, request, playwright, baseURL }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const { trucks } = await readFleet(request);
  const from = '2026-10-01', to = '2026-11-11';
  const response = await request.get(basePath + '/api/calendar?from=' + from + '&to=' + to);
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toBe('no-store');
  const data = await response.json();
  expect(data.timezone).toBe('America/Winnipeg');
  expect(data.can_edit).toBe(true);
  expect(data.events.filter((e: { kind: string }) => e.kind === 'inspection').length).toBe(trucks.filter(t => t.next_due_date >= from && t.next_due_date <= to).length);
  expect((await request.get(basePath + '/api/calendar?from=2026-01-01&to=2026-12-31')).status()).toBe(400);
  const anonymous = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  try {
    expect((await anonymous.get(basePath + '/api/calendar?from=' + from + '&to=' + to)).status()).toBe(401);
    expect((await anonymous.post(basePath + '/api/calendar/events', { data: {} })).status()).toBe(401);
  } finally { await anonymous.dispose(); }
  await page.goto(basePath + '/');
  await expect(page.locator('#app-view')).toBeVisible();
  await page.locator('#header-tools > summary').click();
  await page.locator('#btn-calendar').click();
  await expect(page.locator('#modal-calendar')).toBeVisible();
  await expect(page.locator('#calendar-status')).toContainText('entries in this period');
  for (const width of [320, 390, 820, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const view of ['month', 'week', 'agenda']) {
      await page.locator('[data-calendar-view="' + view + '"]').click();
      await expect(page.locator('#calendar-status')).toContainText('entries in this period');
      await expect(page.locator('[data-calendar-view="' + view + '"]')).toHaveAttribute('aria-pressed', 'true');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), view + ' at ' + width).toBe(true);
      const panel = await page.locator('.calendar-panel').boundingBox();
      expect(panel!.x).toBeGreaterThanOrEqual(0);
      expect(panel!.x + panel!.width).toBeLessThanOrEqual(width);
      if (view === 'month') await expect(page.locator('.calendar-cell')).toHaveCount(42);
      if (view === 'week') await expect(page.locator('.calendar-week-day')).toHaveCount(7);
    }
  }
  await page.locator('[data-calendar-view="month"]').click();
  await page.locator('#calendar-date').fill('2026-12-31');
  await page.locator('#calendar-date').dispatchEvent('change');
  await expect(page.locator('#calendar-period')).toContainText('December 2026');
  await page.locator('#calendar-next').click();
  await expect(page.locator('#calendar-period')).toContainText('January 2027');
  await page.locator('#calendar-prev').click();
  await expect(page.locator('#calendar-period')).toContainText('December 2026');
  await page.locator('#calendar-new').click();
  await expect(page.locator('#modal-calendar-event')).toBeVisible();
  await expect(page.locator('#calendar-event-category')).toHaveValue('general');
  await page.locator('#calendar-event-category').selectOption('maintenance');
  await expect(page.locator('#calendar-event-category')).toHaveValue('maintenance');
  await expect(page.locator('#calendar-event-repeat-until')).toBeDisabled();
  await page.locator('#calendar-event-repeat').selectOption('weekly');
  await expect(page.locator('#calendar-event-repeat-until')).toBeVisible();
  await expect(page.locator('#calendar-event-repeat-until')).toHaveAttribute('required', '');
  await expect(page.locator('#calendar-event-repeat-until')).toHaveAttribute('min', '2026-12-01');
  await expect(page.locator('#calendar-event-repeat-until')).toHaveAttribute('max', '2028-12-01');
  await page.locator('#calendar-event-repeat-until').fill('2027-03-01');
  await page.locator('#calendar-event-repeat').selectOption('monthly');
  await expect(page.locator('#calendar-event-series-note')).toContainText("month's last day");
  await page.locator('#calendar-event-repeat').selectOption('none');
  await expect(page.locator('#calendar-event-repeat-until')).toBeDisabled();
  await expect(page.locator('#calendar-event-start-time')).toBeDisabled();
  await page.locator('#calendar-event-all-day').uncheck();
  await expect(page.locator('#calendar-event-start-time')).toBeEnabled();
  await expect(page.locator('#calendar-event-start-time')).toHaveValue('09:00');
  await expect(page.locator('#calendar-event-unit option')).toHaveCount(trucks.length + 1);
  page.once('dialog', dialog => dialog.accept());
  await page.keyboard.press('Escape');
  await expect(page.locator('#modal-calendar-event')).toBeHidden();
  await expect(page.locator('#modal-calendar')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#modal-calendar')).toBeHidden();
  testInfo.annotations.push({ type: 'coverage', description: 'Read-only verification: persisted appointment CRUD, saved recurrence/category changes, and personal-role checks are not exercised. No events are invented.' });
  expect(errors).toEqual([]);
});

test('local calendar filters real entries, previews a private printable agenda, and never writes appointments', async ({ page, request }, testInfo) => {
  const errors: string[] = [], writes: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().includes('/api/calendar') && !['GET', 'HEAD'].includes(request.method())) writes.push(request.method()); });
  const { trucks } = await readFleet(request);
  const datedUnit = trucks.find(truck => truck.next_due_date);
  const chosenDate = datedUnit?.next_due_date || '2026-10-26';
  await page.goto(basePath + '/');
  await expect(page.locator('#app-view')).toBeVisible();
  await page.locator('#header-tools > summary').click();
  await page.locator('#btn-calendar').click();
  await expect(page.locator('#calendar-status')).toContainText('entries in this period');
  const loaded = page.waitForResponse(response => response.url().includes('/api/calendar?') && response.status() === 200);
  await page.locator('#calendar-date').fill(chosenDate);
  await page.locator('#calendar-date').dispatchEvent('change');
  const data = await (await loaded).json() as { events: CalendarEntry[] };
  await expect(page.locator('#calendar-status')).toContainText('entries in this period');
  await expect(page.locator('#calendar-unit-filter option')).toHaveCount(trucks.length + 2);
  await expect(page.locator('#calendar-filter-summary')).toHaveText(data.events.length + ' of ' + data.events.length + ' entries match filters in the loaded period.');

  const query = data.events[0]?.title || 'No existing calendar entry';
  await page.locator('#calendar-search').fill(query);
  const matching = data.events.filter(event => [event.title, event.notes, event.unit_number, event.unit_number ? '#' + event.unit_number : ''].filter(Boolean).join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  await expect(page.locator('#calendar-filter-summary')).toHaveText(matching.length + ' of ' + data.events.length + ' entries match filters in the loaded period.');
  await page.locator('#calendar-clear-filters').click();
  await page.locator('#calendar-category-filter').selectOption('repair');
  const categoryCount = data.events.filter(event => event.kind !== 'shop' || event.category === 'repair').length;
  await expect(page.locator('#calendar-filter-summary')).toHaveText(categoryCount + ' of ' + data.events.length + ' entries match filters in the loaded period.');
  await page.locator('#calendar-unit-filter').selectOption('unlinked');
  await expect(page.locator('#calendar-filter-summary')).toHaveText(data.events.filter(event => !event.truck_id && (event.kind !== 'shop' || event.category === 'repair')).length + ' of ' + data.events.length + ' entries match filters in the loaded period.');
  await page.locator('#calendar-clear-filters').click();
  if (datedUnit) {
    await page.locator('#calendar-unit-filter').selectOption(datedUnit.id);
    await expect(page.locator('#calendar-filter-summary')).toHaveText(data.events.filter(event => event.truck_id === datedUnit.id).length + ' of ' + data.events.length + ' entries match filters in the loaded period.');
  } else testInfo.annotations.push({ type: 'coverage', description: 'No real unit has an inspection due date; linked-unit entry display is not exercised.' });

  for (const view of ['month', 'week', 'agenda']) {
    const response = page.waitForResponse(response => response.url().includes('/api/calendar?') && response.status() === 200);
    await page.locator('[data-calendar-view="' + view + '"]').click();
    const current = await (await response).json() as { events: CalendarEntry[] };
    await expect(page.locator('#calendar-print-preview')).toBeEnabled();
    await page.locator('#calendar-print-preview').click();
    await expect(page.locator('#modal-calendar-print')).toBeVisible();
    await expect(page.locator('#calendar-print-content')).toContainText('America/Winnipeg');
    await expect(page.locator('#calendar-print-filters')).toContainText(datedUnit ? '#' + datedUnit.unit_number : 'All units');
    const visible = current.events.filter(event => (!datedUnit || event.truck_id === datedUnit.id) && (view === 'week' || event.start_date.slice(0, 7) === chosenDate.slice(0, 7) || event.end_date.slice(0, 7) === chosenDate.slice(0, 7) || event.start_date < chosenDate && event.end_date > chosenDate));
    for (const event of visible) await expect(page.locator('#calendar-print-content')).toContainText(event.title);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('#app-view')).toBeHidden();
    await expect(page.locator('#modal-calendar')).toBeHidden();
    await expect(page.locator('#calendar-print-content')).toBeVisible();
    await expect(page.locator('.calendar-print-toolbar')).toBeHidden();
    await page.emulateMedia({ media: 'screen' });
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-calendar-print')).toBeHidden();
    await expect(page.locator('body')).not.toHaveClass(/calendar-printing/);
  }
  await page.locator('#calendar-search').fill('<no existing entry &>');
  await page.locator('#calendar-print-preview').click();
  await expect(page.locator('#calendar-print-filters')).toContainText('<no existing entry &>');
  expect(await page.locator('#calendar-print-filters').evaluate(el => el.children.length)).toBe(0);
  await page.locator('[data-close="modal-calendar-print"]').click();
  await expect(page.locator('#calendar-print-content')).toBeEmpty();
  await page.locator('#calendar-clear-filters').click();
  const recurring = data.events.find(event => event.kind === 'shop' && event.recurrence !== 'none');
  if (!recurring) testInfo.annotations.push({ type: 'coverage', description: 'No real saved recurring appointment in the inspected range; series persistence/edit/delete and category colours remain unverified by read-only integration checks.' });
  await page.locator('#calendar-print-preview').click();
  await page.evaluate(() => document.getElementById('btn-lock')!.click());
  await expect(page.locator('#gate-view')).toBeVisible();
  await expect(page.locator('#modal-calendar-print')).toBeHidden();
  await expect(page.locator('#calendar-print-content')).toBeEmpty();
  await expect(page.locator('body')).not.toHaveClass(/calendar-printing/);
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});

test('calendar keyboard focus, discard protection, validation and overlap checks remain read-only', async ({ page, request, playwright, baseURL }, testInfo) => {
  const errors: string[] = [], writes: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().includes('/api/calendar') && !request.url().includes('/api/calendar/conflicts') && !['GET', 'HEAD'].includes(request.method())) writes.push(request.method()); });
  const { trucks } = await readFleet(request);
  const anonymous = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  try { expect((await anonymous.post(basePath + '/api/calendar/conflicts', { data: {} })).status()).toBe(401); } finally { await anonymous.dispose(); }
  expect((await request.post(basePath + '/api/calendar/conflicts', { data: {} })).status()).toBe(400);
  // Invalid payloads keep this regression check read-only even against older routing code.
  expect((await request.post(basePath + '/api/calendar', { data: {} })).status()).toBe(404);
  expect((await request.put(basePath + '/api/calendar/conflicts', { data: {} })).status()).toBe(404);
  const unlinked = await request.post(basePath + '/api/calendar/conflicts', { data: { title: 'Unsaved draft', start_date: '2026-10-26', end_date: '2026-10-26', all_day: true } });
  expect(unlinked.status()).toBe(200);
  expect(unlinked.headers()['cache-control']).toBe('no-store');
  expect(await unlinked.json()).toEqual({ conflicts: [], truncated: false, timezone: 'America/Winnipeg' });
  expect((await request.post(basePath + '/api/calendar/conflicts', { headers: { Origin: 'https://example.invalid' }, data: {} })).status()).toBe(403);
  await page.goto(basePath + '/');
  await expect(page.locator('#app-view')).toBeVisible();
  await page.locator('#header-tools > summary').click();
  await page.locator('#btn-calendar').click();
  await expect(page.locator('#calendar-status')).toContainText('entries in this period');
  await expect(page.locator('#app-view')).toHaveAttribute('inert', '');
  await page.locator('#calendar-date').fill('2026-12-31');
  await page.locator('#calendar-date').dispatchEvent('change');
  await expect(page.locator('#calendar-status')).toContainText('entries in this period');
  await page.locator('#calendar-content [data-calendar-day="2026-12-31"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#calendar-date')).toHaveValue('2027-01-01');
  await expect(page.locator('#calendar-content [data-calendar-day="2027-01-01"]')).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.locator('#calendar-date')).toHaveValue('2026-12-28');
  await expect(page.locator('#calendar-content [data-calendar-day="2026-12-28"]')).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.locator('#calendar-date')).toHaveValue('2027-01-03');
  await expect(page.locator('#calendar-content [data-calendar-day="2027-01-03"]')).toBeFocused();
  await page.keyboard.press('PageDown');
  await expect(page.locator('#calendar-date')).toHaveValue('2027-02-03');
  await expect(page.locator('#calendar-content [data-calendar-day="2027-02-03"]')).toBeFocused();
  await page.keyboard.press('PageUp');
  await expect(page.locator('#calendar-date')).toHaveValue('2027-01-03');
  await page.locator('[data-calendar-view="week"]').click();
  await expect(page.locator('#calendar-status')).toContainText('entries in this period');
  await page.setViewportSize({ width: 390, height: 900 });
  const timetable = page.locator('.calendar-week-scroll');
  await timetable.evaluate(el => { el.scrollLeft = 200; el.scrollTop = 500; });
  await page.locator('#calendar-search').fill('unsaved filter');
  expect(await timetable.evaluate(el => el.scrollLeft)).toBe(200);
  expect(await timetable.evaluate(el => el.scrollTop)).toBe(500);
  await page.locator('#calendar-clear-filters').click();
  await page.locator('[data-calendar-view="month"]').click();
  await expect(page.locator('#calendar-status')).toContainText('entries in this period');
  await page.locator('#calendar-new').click();
  await expect(page.locator('#modal-calendar')).toHaveAttribute('inert', '');
  await page.locator('#calendar-event-save').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#modal-calendar-event .close-btn')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#calendar-event-save')).toBeFocused();
  await page.locator('#calendar-event-notes').fill('Unsaved notes');
  page.once('dialog', dialog => dialog.dismiss());
  await page.keyboard.press('Escape');
  await expect(page.locator('#modal-calendar-event')).toBeVisible();
  await expect(page.locator('#calendar-event-notes')).toHaveValue('Unsaved notes');
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('#modal-calendar-event .close-btn').click();
  await expect(page.locator('#modal-calendar-event')).toBeVisible();
  await page.locator('#calendar-event-end').fill('2027-01-02');
  expect(await page.locator('#calendar-event-end').evaluate((el: HTMLInputElement) => el.validationMessage)).toContain('on or after');
  await page.locator('#calendar-check-overlaps').click();
  await expect(page.locator('#calendar-overlap-status')).toContainText('Choose a linked unit');
  await page.locator('#calendar-event-end').fill('2027-01-03');
  if (trucks.length) {
    await page.locator('#calendar-event-unit').selectOption(trucks[0].id);
    const response = page.waitForResponse(response => response.url().includes('/api/calendar/conflicts') && response.status() === 200);
    await page.locator('#calendar-check-overlaps').click();
    const result = await (await response).json();
    await expect(page.locator('#calendar-overlap-status')).toContainText(result.conflicts.length ? 'overlapping saved appointment' : 'No overlapping saved appointments');
    await expect(page.locator('#calendar-overlap-list li')).toHaveCount(result.conflicts.length);
    await page.locator('#calendar-event-all-day').uncheck();
    await expect(page.locator('#calendar-overlap-status')).toContainText('Not checked for these values');
    await expect(page.locator('#calendar-overlap-list')).toBeEmpty();
  } else testInfo.annotations.push({ type: 'coverage', description: 'No actual units available for linked-unit overlap requests through the form.' });
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#modal-calendar-event [data-close="modal-calendar-event"]').last().click();
  await expect(page.locator('#modal-calendar-event')).toBeHidden();
  await expect(page.locator('#calendar-new')).toBeFocused();
  await expect(page.locator('#modal-calendar')).not.toHaveAttribute('inert', '');

  // Inspect the existing calendar only. If a real appointment exists, compare its slot and self-exclusion.
  const actual = await request.get(basePath + '/api/calendar?from=2026-10-01&to=2026-12-31');
  expect(actual.status()).toBe(200);
  const data = await actual.json() as { events: CalendarEntry[] };
  const saved = data.events.find(event => event.kind === 'shop' && event.truck_id);
  if (saved) {
    const draft = { title: saved.title, start_date: saved.start_date, end_date: saved.end_date, start_time: saved.start_time, end_time: saved.end_time, all_day: saved.all_day, truck_id: saved.truck_id };
    const check = await request.post(basePath + '/api/calendar/conflicts', { data: draft });
    expect(check.status()).toBe(200);
    const result = await check.json();
    const bounds = (entry: CalendarEntry | typeof draft) => [entry.start_date + 'T' + (entry.all_day ? '00:00' : entry.start_time), entry.all_day ? new Date(Date.parse(entry.end_date + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10) + 'T00:00' : entry.end_date + 'T' + entry.end_time];
    const [start, end] = bounds(draft);
    const expected = data.events.filter(event => { const [otherStart, otherEnd] = bounds(event); return event.kind === 'shop' && event.truck_id === draft.truck_id && start < otherEnd && otherStart < end; });
    if (!result.truncated) expect(result.conflicts.length).toBe(expected.length);
    const excluded = await request.post(basePath + '/api/calendar/conflicts?exclude=' + encodeURIComponent(saved.series_id || saved.id), { data: draft });
    expect(excluded.status()).toBe(200);
    expect((await excluded.json()).conflicts.every((conflict: { id: string }) => conflict.id !== (saved.series_id || saved.id))).toBe(true);
  } else testInfo.annotations.push({ type: 'coverage', description: 'No actual linked shop appointment in inspected range. Positive conflict UI/persisted-series integration remains unverified; no records were invented.' });
  await page.locator('#calendar-date').fill('2100-12-31');
  await page.locator('#calendar-date').dispatchEvent('change');
  await expect(page.locator('#calendar-status')).toContainText('entries in this period');
  const outsideDays = page.locator('[data-calendar-day^="2101"]');
  expect(await outsideDays.count()).toBeGreaterThan(0);
  for (const day of await outsideDays.all()) await expect(day).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.locator('#modal-calendar')).toBeHidden();
  await expect(page.locator('#app-view')).not.toHaveAttribute('inert', '');
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});
