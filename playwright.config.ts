import { defineConfig } from '@playwright/test';

/**
 * Environment variables required for E2E tests:
 *
 *   TEST_API_URL          — Strapi base URL (default: http://localhost:1337)
 *   STRIPE_SECRET_KEY     — Stripe test secret key (sk_test_…) — enables Stripe tests
 *   STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret (whsec_…) — enables webhook tests
 *
 * Run the full suite:
 *   npx strapi develop &
 *   npm run test:e2e
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.TEST_API_URL || 'http://localhost:1337',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  },
  // API-only tests — no browser binary required
  projects: [
    {
      name: 'api',
    },
  ],
});
