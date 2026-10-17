import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:3100', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    { command: 'node tests/e2e/mock-tmdb.mjs', port: 4010, reuseExistingServer: !process.env.CI },
    {
      command: 'node tests/e2e/clear-fetch-cache.mjs && node tests/e2e/prepare-db.mjs && node scripts/migrate.mjs && node scripts/demo-seed.mjs && npm run build && npm run start -- -p 3100',
      port: 3100,
      timeout: 240_000,
      reuseExistingServer: !process.env.CI,
      env: {
        TMDB_BASE_URL: 'http://localhost:4010/3',
        TMDB_READ_TOKEN: 'token-e2e',
        DATABASE_URL: 'pglite:./.data/e2e',
        BETTER_AUTH_SECRET: 'segredo-dos-testes-e2e-com-mais-de-32-caracteres',
        BETTER_AUTH_URL: 'http://localhost:3100',
        DEMO_PASSWORD: 'demo-paidegua-2026',
      },
    },
  ],
});
