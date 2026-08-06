import { defineConfig, devices } from "@playwright/test";

/**
 * BUILD_SPEC §7 M1 acceptance: "A Playwright test signs up, invites a
 * second user, and that second user CANNOT reach the first workspace's
 * URL." `e2e/tenant-isolation.spec.ts` is that test.
 *
 * Runs against a dedicated `lightline_e2e` database (see
 * docs/local-database.md) — never `lightline_dev` (would pollute manual
 * testing data) or `lightline_test` (Vitest's, and the two suites running
 * concurrently would race on the same rows).
 *
 * `RESEND_API_KEY`/`AUTH_GOOGLE_*` are deliberately left unset for the
 * spawned server: magic-link email falls back to `.local/dev-inbox/`
 * (src/server/email.tsx), which is how this suite "receives" mail without
 * a real inbox or a paid signup — see e2e/support/dev-inbox.ts.
 */
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm exec next dev -p 3100",
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      NODE_ENV: "development",
      DATABASE_URL:
        "postgresql://lightline:lightline_dev_pw@localhost:5433/lightline_e2e",
      NEXT_PUBLIC_SITE_URL: BASE_URL,
      AUTH_SECRET: "e2e-only-not-a-real-secret",
      AUTH_GOOGLE_ID: "",
      AUTH_GOOGLE_SECRET: "",
      RESEND_API_KEY: "",
      AUTH_EMAIL_FROM: "",
    },
  },
});
