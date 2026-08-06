import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { FlatCompat } from "@eslint/eslintrc";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

const __dirname = dirname(fileURLToPath(import.meta.url));

// eslint-config-next@15.5.22 is still eslintrc-format ({ extends: [...] }),
// so it has to be bridged into flat config via FlatCompat. eslint-config-next
// only ships a flat-config entrypoint from v16, which is pinned out by
// BUILD_SPEC §2 (Next 15).
const compat = new FlatCompat({ baseDirectory: __dirname });

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Generated Prisma client — not ours to lint.
      "src/generated/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  ...tseslint.configs.recommended,
  {
    rules: {
      // BUILD_SPEC §8: no `any`, no un-annotated `@ts-ignore`.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": true,
          "ts-expect-error": "allow-with-description",
          minimumDescriptionLength: 10,
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Must stay last: turns off every stylistic rule Prettier owns.
  eslintConfigPrettier,
);
