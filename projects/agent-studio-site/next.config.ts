import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the workspace root explicitly. A stray package-lock.json in the home
    // directory otherwise wins the inference and Next resolves from there.
    root: import.meta.dirname,
    // GLSL shader sources are imported as strings. Keeping them as real files
    // (rather than template literals in .ts) means syntax highlighting and
    // diffs work, at the cost of this loader rule.
    rules: {
      '*.{glsl,vert,frag}': {
        loaders: ['raw-loader'],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;
