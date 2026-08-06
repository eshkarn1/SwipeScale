/**
 * Ambient declarations for non-code imports.
 *
 * WHY THIS FILE EXISTS — measured, not assumed:
 * TypeScript 6.0 raises `TS2882: Cannot find module or type declarations for
 * side-effect import` on `import "./globals.css"`. TypeScript 5.9.3 does not;
 * both were run against this exact project (5.9.3: 0 errors, 6.0.3: TS2882).
 * next@15.5.22 ships no `*.css` module declaration of its own — `grep` over
 * node_modules/next finds none — so `next-env.d.ts` does not satisfy it either.
 *
 * This is a real declaration, not a suppression. Revisit if a future Next 15.x
 * or Next 16 ships its own CSS declarations, at which point delete this file.
 */

declare module "*.css";

// Declared separately and more specifically so that CSS Modules keep a real
// type. TypeScript prefers the more specific wildcard pattern.
declare module "*.module.css" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
