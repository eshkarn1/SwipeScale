/**
 * The E2E database URL, in one place.
 *
 * `playwright.config.ts` passes this to the spawned dev server and
 * `global-setup.ts` connects to it directly, so it must be the same string
 * in both — a drift here would have the suite resetting one database while
 * the app under test used another, which looks exactly like the reset not
 * working.
 *
 * Deliberately NOT `lightline_dev` (would destroy manual testing data) and
 * NOT `lightline_test` (Vitest's — the two suites running concurrently would
 * race on the same rows). See docs/local-database.md.
 */
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://lightline:lightline_dev_pw@localhost:5433/lightline_e2e";
