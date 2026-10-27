import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const base = process.env.SITE_URL || 'http://127.0.0.1:5181';
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  for (const language of ['en', 'fr']) {
    await page.goto(`${base}/${language}/`);
    assert.equal(await page.locator('html').getAttribute('lang'), `${language}-CA`);
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('details').count(), 6);
    assert.equal(await page.locator('input[name=consent]').isChecked(), false);
    for (const width of [320, 375, 700, 960, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${language}: overflow at ${width}`);
      for (const selector of ['button[type=submit]', '#email', '#language', '.language']) {
        const box = await page.locator(selector).boundingBox();
        assert.ok(box && box.width >= 44 && box.height >= 44, `${selector}: touch target`);
      }
    }
  }
  await page.goto(`${base}/en/`);
  await page.locator('[data-language=fr]').click();
  await page.waitForURL('**/fr/');
  await page.goto(base);
  await page.waitForURL('**/fr/');
  assert.equal(await context.cookies().then(cookies => cookies.length), 0);
  const response = await fetch(`${base}/en/`);
  assert.equal(response.status, 200);
  assert.ok(response.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
  assert.equal((await fetch(`${base}/api/signup`, { method: 'POST', body: new URLSearchParams({}) })).status, 403);
  assert.equal((await fetch(`${base}/api/signup`, { method: 'POST', headers: { Origin: base }, body: new URLSearchParams({ email: 'invalid', language: 'en', consent: 'yes' }) })).status, 400);
  assert.equal((await fetch(`${base}/api/signup`, { method: 'POST', headers: { Origin: base }, body: new URLSearchParams({ padding: 'x'.repeat(5000) }) })).status, 400);
  assert.equal((await fetch(`${base}/truck-safety/api/trucks`)).status, 404);
  console.log('Bilingual DOM, language persistence, 320–1280px layout/touch targets, headers, origin/validation/body limits, and fleet isolation passed.');

  if (process.env.SIGNUP_TEST_EMAIL) {
    await page.goto(`${base}/fr/`);
    await page.locator('#email').fill(process.env.SIGNUP_TEST_EMAIL);
    await page.locator('input[name=consent]').check();
    const saved = page.waitForResponse(res => res.url().endsWith('/api/signup') && res.request().method() === 'POST');
    await page.locator('button[type=submit]').click();
    const savedResponse = await saved;
    assert.equal(savedResponse.status(), 200, await savedResponse.text());
    await page.locator('#removal-result:not([hidden])').waitFor();
    assert.ok((await page.locator('#form-status').textContent()).includes('Aucun courriel'));
    const removalLink = await page.locator('#removal-link').getAttribute('href');
    assert.match(removalLink, /#token=[a-f0-9]{64}$/);
    await page.locator('#removal-link').click();
    await page.waitForURL('**/remove?lang=fr');
    assert.equal(new URL(page.url()).hash, '');
    const removed = page.waitForResponse(res => res.url().endsWith('/api/remove'));
    await page.locator('button[type=submit]').click();
    assert.equal((await removed).status(), 200);
    await page.locator('#removal-form[hidden]').waitFor({ state: 'attached' });
    console.log('Real database signup → private removal link → deletion passed; no email was sent.');
  } else console.log('Signup write/removal not exercised: SIGNUP_TEST_EMAIL not supplied.');
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
