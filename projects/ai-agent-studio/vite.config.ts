import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Vite 8 ships Rolldown as the default bundler. Config keys that changed
// from the Rollup-era defaults:
//   build.rollupOptions        -> build.rolldownOptions
//   optimizeDeps.esbuildOptions -> optimizeDeps.rolldownOptions
//   the `esbuild` top-level key -> `oxc`
// We don't need any of those three overrides for this build, so they are
// intentionally omitted rather than filled with defaults.
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirrors the `paths` entry in tsconfig.app.json — TS `paths` alone does
    // not affect the bundler, so both must be kept in sync by hand.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  server: {
    port: 5173,
  },
});
