import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  globalTimeout: 5 * 60_000,
  reporter: process.env.CI ? 'github' : 'list',
  globalSetup: './tests/browser/global-setup.js',
  use: {
    baseURL: 'http://127.0.0.1:8765/verse-of-the-day/',
    browserName: 'chromium',
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
