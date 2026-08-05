import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  // Without metadataBase the canonical and og:image below silently resolve
  // to nothing in the built HTML.
  metadataBase: new URL(siteUrl),
  title: "Motion system scaffold",
  description: "Scaffold placeholder — replaced by a later build pass.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
