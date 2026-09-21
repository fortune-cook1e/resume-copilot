import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:3100';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm exec next dev --hostname 127.0.0.1 --port 3100',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_APP_URL: baseURL,
      BETTER_AUTH_URL: baseURL,
      BETTER_AUTH_SECRET: 'local-playwright-only-secret-not-for-production',
      DATABASE_URL: 'postgresql://test:test@127.0.0.1:5432/test',
    },
  },
});
