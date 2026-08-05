import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  /* Everything statically prerenders; no output: 'export' — deploying to Vercel. */
  /* Pin the workspace root: an unrelated package-lock.json in the user's home
   * directory otherwise makes Next guess the wrong root for file tracing. */
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
