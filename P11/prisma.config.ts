import "dotenv/config";

import { defineConfig } from "prisma/config";

// Prisma 7 removed `datasource.url` from schema.prisma; the connection URL
// lives here instead. `datasource` is only required for commands that talk to
// a database (migrate / db push / introspect). M0 runs only `validate` and
// `generate`, neither of which needs it — so it is attached conditionally and
// nothing dials a database when DATABASE_URL is unset.
const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  ...(url ? { datasource: { url } } : {}),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
