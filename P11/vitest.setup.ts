import { config } from "dotenv";

// Loaded before any test file, so `src/server/db.ts` (a module-level
// singleton that reads `process.env.DATABASE_URL` on first use) always sees
// the test database, never whatever `.env` points dev at. See
// docs/local-database.md for how `lightline_test` gets created.
config({ path: ".env.test", quiet: true });

import "@testing-library/jest-dom/vitest";
