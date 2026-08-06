import { GeistMono } from "geist/font/mono";
import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toast";
import { brand, siteUrl } from "@/config/brand";

import "./globals.css";

/**
 * BUILD_SPEC §6: display type is "a geometric sans with personality", body and
 * numbers in Geist Mono for tabular figures, and never Inter as the primary.
 * Satoshi and General Sans are Fontshare-only (no npm, no Google Fonts), so
 * Space Grotesk stands in — geometric, distinctly not Inter, and self-hosted by
 * next/font at build time rather than fetched from a third party at runtime.
 *
 * Both expose CSS variables that globals.css already reads
 * (`--font-space-grotesk`, `--font-geist-mono`); they are attached to <html>
 * below.
 */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  // metadataBase is required, or Next emits no canonical and no og:image and
  // every share renders a blank card.
  metadataBase: new URL(siteUrl()),
  title: {
    default: brand.name,
    template: `%s · ${brand.name}`,
  },
  description: brand.description,
  applicationName: brand.name,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    siteName: brand.name,
    title: brand.name,
    description: brand.description,
    url: "/",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning is required by next-themes: it writes
    // `data-theme` onto <html> before React hydrates, so server and client
    // markup differ on this one element by design.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${GeistMono.variable}`}
    >
      <body>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
