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
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#modal-truck').getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('#modal-truck')).toBeHidden();
});
