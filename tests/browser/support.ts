import { test as base, expect, type APIRequestContext } from '@playwright/test';
import type { AppSettings, EnrichedTruck } from '../../src/types';

export const basePath = '/truck-safety';
type SessionState = Awaited<ReturnType<APIRequestContext['storageState']>>;

export const test = base.extend<{}, { fleetSession: SessionState }>({
  fleetSession: [async ({ playwright }, use, workerInfo) => {
    const baseURL = workerInfo.project.use.baseURL;
    if (!baseURL) throw new Error('Configure APP_URL for the real application backend.');
    const passcode = process.env.APP_PASSCODE;
    if (!passcode) throw new Error('Set APP_PASSCODE for the real backend. Tests never substitute an authenticated response.');
    const client = await playwright.request.newContext({ baseURL });
    try {
      let login = await client.post(basePath + '/api/auth/login', { data: { passcode } });
      if (login.status() === 429) {
        const seconds = Number(login.headers()['retry-after'] || 60);
        await new Promise(resolve => setTimeout(resolve, (seconds + 1) * 1000));
        login = await client.post(basePath + '/api/auth/login', { data: { passcode } });
      }
      expect(login.status(), 'Real backend login must succeed').toBe(200);
      const state = await client.storageState();
      expect(state.cookies.some(cookie => cookie.name === 'ts_token' && cookie.httpOnly)).toBe(true);
      await use(state);
    } finally {
      await client.dispose();
    }
  }, { scope: 'worker', timeout: 90000 }],
  storageState: async ({ fleetSession }, use) => { await use(fleetSession); },
});

export { expect };

export async function readFleet(request: APIRequestContext): Promise<{ trucks: EnrichedTruck[]; settings: AppSettings }> {
  const response = await request.get(basePath + '/api/trucks');
  expect(response.status(), 'Read the actual fleet, without seeding records').toBe(200);
  expect(response.headers()['cache-control']).toBe('no-store');
  const data = await response.json();
  expect(Array.isArray(data.trucks)).toBe(true);
  return data;
}
