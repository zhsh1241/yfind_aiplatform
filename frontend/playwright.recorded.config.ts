import { defineConfig, devices } from '@playwright/test';

const artifactRoot = process.env.E2E_ARTIFACT_ROOT ?? 'docs/qa/e2e-manual';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  outputDir: `${artifactRoot}/test-results`,
  reporter: [
    ['list'],
    ['html', { outputFolder: `${artifactRoot}/playwright-report`, open: 'never' }],
    ['json', { outputFile: `${artifactRoot}/results.json` }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5174',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    launchOptions: {
      slowMo: Number(process.env.E2E_SLOW_MO ?? 250),
    },
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5174',
    url: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5174',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium-visible-recorded',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1440, height: 960 },
      },
    },
  ],
});
