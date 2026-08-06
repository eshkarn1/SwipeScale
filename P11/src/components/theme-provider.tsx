"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Theme plumbing for the whole app.
 *
 * `attribute="data-theme"` is what `src/app/globals.css` is written against:
 * the dark token set lives in `@theme static` on `:root`, and the light set
 * re-declares the same custom properties under `[data-theme="light"]`.
 *
 * BUILD_SPEC §6 makes dark the product's identity and light explicitly
 * secondary, so `enableSystem` is off and dark is the default. A user who
 * wants light asks for it; the OS does not decide on their behalf. The choice
 * still persists in localStorage.
 *
 * `disableTransitionOnChange` stops every transitioned property on the page
 * from animating at once during the swap, which reads as a slow smear.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
