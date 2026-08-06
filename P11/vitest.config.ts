import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Resolves the `@/*` alias straight from tsconfig.json.
    //
    // This replaces the `vite-tsconfig-paths` plugin, which vitest 4 reports
    // as redundant ("Vite now supports tsconfig paths resolution natively").
    // Dropping it also removes the only peer-dependency conflict in the tree:
    // vite-tsconfig-paths -> tsconfck@3.1.6 (deprecated "unmaintained")
    // peers typescript@^5.0.0 and we are on 6.0.3.
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "src/**/*.spec.{ts,tsx}"],
    // e2e/ is Playwright's, and Playwright is not installed in M0.
    exclude: ["node_modules/**", ".next/**", "e2e/**", "src/generated/**"],
  },
});
