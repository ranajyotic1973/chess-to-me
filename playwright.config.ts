import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/integration',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 30 * 1000, // 30s per test
  expect: { timeout: 10 * 1000 }, // 10s for assertions
  use: {
    baseURL: 'http://127.0.0.1:5173',
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    navigationTimeout: 30 * 1000,
    actionTimeout: 10 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], headless: true },
    },
  ],
  // Serve ONLY the Vite renderer — do NOT launch Electron. Integration tests run
  // headless in Chromium and inject a mock `window.electronAPI`
  // (tests/integration/fixtures/electronMock.ts), so no real engine/LLM or
  // Electron window is needed — this works in headless CI (e.g. GitHub Actions).
  webServer: {
    command: 'npm run dev:renderer',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000, // 60s to start dev server
  },
});
