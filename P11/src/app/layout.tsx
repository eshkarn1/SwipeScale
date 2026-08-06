import type { Metadata } from "next";

import { brand, siteUrl } from "@/config/brand";

import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
