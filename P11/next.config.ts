import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Without this, Next walks up and picks /Users/<user>/package-lock.json as
  // the workspace root (there is a stray lockfile in the home directory), and
  // traces the wrong tree for the deployment bundle. Pin it to this project.
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  typedRoutes: true,
  eslint: {
    // Linting is a separate, explicit step (`pnpm lint`) and a CI job.
    // Running it inside `next build` couples two failures together and
    // makes a lint error look like a build error.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
