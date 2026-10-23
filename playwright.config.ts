import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: process.env.APP_URL || 'http://127.0.0.1:5173',
    headless: true,
    acceptDownloads: true,
  },
});
