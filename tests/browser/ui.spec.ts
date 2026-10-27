import { test, expect, basePath, readFleet } from './support';

test('real UI persists theme and view preferences and remains responsive', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const { trucks } = await readFleet(request);
  await page.goto(basePath + '/');
  await expect(page.locator('#app-view')).toBeVisible();
  await expect(page.locator('#btn-scan-unit')).toBeHidden();
  await expect(page.locator('#mobile-nav-scan')).toHaveCount(0);
  await expect(page.locator('#gate-scan-unit')).toBeHidden();
  await expect(page.locator('[data-nav-action="scan"]')).toBeHidden();
  await expect(page.locator('details').filter({ hasText: 'QR Label & Unit Actions' })).toBeHidden();
  await page.locator('.header-actions > [data-theme-toggle]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(241, 245, 249)');
  if (trucks.length) {
    const ratios = await page.locator('.safety-badge').evaluateAll(badges => {
      const luminance = (value: string) => {
        const [r, g, b] = value.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(channel => {
          const linear = channel / 255;
          return linear <= 0.04045 ? linear / 12.92 : ((linear + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      return badges.map(badge => {
        const style = getComputedStyle(badge);
        const a = luminance(style.color), b = luminance(style.backgroundColor);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      });
    });
    for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(4.5);
  }
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Cards', exact: true }).click();
  await page.reload();
  await expect(page.locator('#view-cards')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Compact list', exact: true }).click();
  for (const width of [320, 390, 820, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark']) {
      if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator('.header-actions > [data-theme-toggle]').click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${theme} at ${width}px`).toBe(true);
      for (const id of ['btn-add-truck', 'btn-lock', 'filter-status', 'search-input']) {
        const box = await page.locator('#' + id).boundingBox();
        expect(box!.width, id).toBeGreaterThanOrEqual(44);
        expect(box!.height, id).toBeGreaterThanOrEqual(44);
      }
      await page.locator('#header-tools > summary').click();
      const tools = await page.locator('.tools-panel').boundingBox();
      expect(tools!.x).toBeGreaterThanOrEqual(0);
      expect(tools!.x + tools!.width).toBeLessThanOrEqual(width);
      await page.keyboard.press('Escape');
      if (trucks.length) {
        await expect(page.locator(width < 960 ? '#fleet-grid' : '#fleet-table-wrap')).toBeVisible();
        await expect(page.locator(width < 960 ? '#fleet-table-wrap' : '#fleet-grid')).toBeHidden();
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const layout of ['rows', 'dense', 'full']) {
    await page.locator('#mobile-layout-' + layout).click();
    await expect(page.locator('#fleet-container')).toHaveAttribute('data-mobile-layout', layout);
    await page.reload();
    await expect(page.locator('#fleet-container')).toHaveAttribute('data-mobile-layout', layout);
  }
  expect(errors).toEqual([]);
});

test('real staff directory and password tools work without changing accounts', async ({ page, request, playwright, baseURL }) => {
  const anonymous = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  try {
    expect((await anonymous.get(basePath + '/api/shop-accounts')).status()).toBe(401);
  } finally { await anonymous.dispose(); }
  const response = await request.get(basePath + '/api/shop-accounts');
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toBe('no-store');
  const data = await response.json();
  expect(data.individualLoginEnabled).toBe(true);
  for (const account of data.accounts) {
    expect(account).not.toHaveProperty('password_hash');
    expect(account).not.toHaveProperty('password_salt');
    expect(account).not.toHaveProperty('password_iterations');
  }
  await page.goto(basePath + '/');
  await expect(page.locator('#app-view')).toBeVisible();
  await page.locator('#header-tools > summary').click();
  await page.locator('#btn-tools-shop-accounts').click();
  await expect(page.locator('#modal-shop-accounts')).toBeVisible();
  await expect(page.locator('#staff-count-all')).toHaveText(String(data.accounts.length));
  await expect(page.locator('#shop-account-list .staff-card')).toHaveCount(data.accounts.length);
  await page.locator('[data-staff-filter="suspended"]').click();
  await expect(page.locator('#shop-account-list .staff-card')).toHaveCount(data.accounts.filter((a: { status: string }) => a.status === 'suspended').length);
  await page.locator('[data-staff-filter="all"]').click();
  await page.locator('#shop-account-search').fill('no matching staff account ' + crypto.randomUUID());
  await expect(page.locator('#shop-account-list .staff-card')).toHaveCount(0);
  await page.locator('#shop-account-search').clear();
  await page.locator('#btn-shop-pw-generate').click();
  const generated = await page.locator('#shop-account-password').inputValue();
  expect(generated).toMatch(/^[A-Za-z0-9_-]{20}$/);
  await page.locator('#btn-shop-pw-generate').click();
  expect(await page.locator('#shop-account-password').inputValue()).not.toBe(generated);
  await page.locator('#btn-shop-pw-toggle').click();
  await expect(page.locator('#shop-account-password')).toHaveAttribute('type', 'password');
  await page.locator('#shop-account-password').fill('12345678');
  expect(await page.locator('#shop-account-password').evaluate((input: HTMLInputElement) => input.validity.valid)).toBe(true);
  await page.locator('#shop-account-password').fill('1234567');
  expect(await page.locator('#shop-account-password').evaluate((input: HTMLInputElement) => input.validity.tooShort)).toBe(true);
  await page.evaluate(() => document.getElementById('btn-lock')!.click());
  await expect(page.locator('#gate-view')).toBeVisible();
  await expect(page.locator('#shop-account-password')).toHaveValue('');
  await expect(page.locator('#shop-account-list')).toBeEmpty();
  await page.locator('#gate-tab-account').click();
  await expect(page.locator('#gate-username')).toBeVisible();
  expect(await page.locator('#gate-passcode').evaluate((input: HTMLInputElement) => input.required)).toBe(false);
  await page.locator('#gate-tab-passcode').click();
  await expect(page.locator('#gate-passcode')).toBeVisible();
});

test('real unit form defaults to month-end without saving anything', async ({ page }) => {
  await page.goto(basePath + '/');
  await page.locator('#btn-add-truck').click();
  await expect(page.locator('#truck-unit')).toHaveValue('');
  await page.locator('.header-actions > [data-theme-toggle]').evaluate(button => { if (document.documentElement.dataset.theme !== 'light') (button as HTMLButtonElement).click(); });
  await expect(page.locator('#truck-unit')).toHaveCSS('background-color', 'rgb(248, 250, 252)');
  await page.locator('#truck-last-date').fill('2024-02-29');
  await page.locator('#truck-last-date').dispatchEvent('change');
  await expect(page.locator('#truck-due-date')).toHaveValue('2025-02-28');
  await page.locator('#truck-interval').selectOption('6');
  await expect(page.locator('#truck-due-date')).toHaveValue('2024-08-31');
  await page.locator('#truck-no-date').check();
  await expect(page.locator('#truck-last-date')).toBeDisabled();
  await expect(page.locator('#truck-due-date')).toBeDisabled();
  await expect(page.locator('#truck-due-date')).toHaveValue('');
  await expect(page.locator('#truck-reminder-days')).toHaveValue('');
  await page.locator('#truck-reminder-days').selectOption('none');
  await expect(page.locator('#truck-reminder-days')).toHaveValue('none');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#modal-truck').getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('#modal-truck')).toBeHidden();

  // Verify left nav shortcuts and backup modal preview + Escape handling
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator('[data-nav-action="backup"]').click();
  await expect(page.locator('#modal-backup')).toBeVisible();
  await page.locator('#backup-restore-file').setInputFiles({
    name: 'empty-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      format: 'truck-safety-tracker-backup',
      version: 1,
      exported_at: '2026-10-25T00:00:00Z',
      includes_certificate_files: false,
      certificate_note: 'Certificate files are not included.',
      units: [],
      inspections: [],
      attachments: [],
    })),
  });
  await expect(page.locator('#backup-preview-box')).toBeVisible();
  await expect(page.locator('#backup-preview-box')).toContainText('0 unit(s)');
  await page.keyboard.press('Escape');
  await expect(page.locator('#modal-backup')).toBeHidden();
});
