import { defineConfig, devices } from "@playwright/test";

import { E2E_DATABASE_URL } from "./e2e/support/database";

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
  // Clears the auth rate-limit buckets — without it the suite becomes
  // unrunnable after a few consecutive runs. See the file for why.
  globalSetup: "./e2e/support/global-setup.ts",
  // These run against `next dev`, which compiles each route on first request.
  // A cold `/[workspace]/companies` (grid + TanStack + palette) can take
  // tens of seconds on the first hit, and every one of those seconds came
  // out of the old 30s budget — the keyboard suite failed on compile time,
  // not on behaviour, before this was raised.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  // ONE worker, not just serial-within-a-file. `fullyParallel: false` still
  // runs separate spec FILES on separate workers, and every one of them
  // shares a single `next dev` process and a single database. Observed once
  // under two workers: the companies list rendered its empty state
  // immediately after a record had demonstrably been created and asserted
  // visible — a stale RSC payload landing late while the server was busy
  // compiling another worker's route. In isolation the same test passed
  // 3/3. An acceptance test that fails for a reason unrelated to what it
  // asserts is worse than no test, and this suite is ~40s serial.
  workers: 1,
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
      DATABASE_URL: E2E_DATABASE_URL,
      NEXT_PUBLIC_SITE_URL: BASE_URL,
      AUTH_SECRET: "e2e-only-not-a-real-secret",
      AUTH_GOOGLE_ID: "",
      AUTH_GOOGLE_SECRET: "",
      RESEND_API_KEY: "",
      AUTH_EMAIL_FROM: "",
    },
  },
});
