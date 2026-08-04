import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans, Martian_Mono } from "next/font/google";
import "./globals.css";
import SmoothAnchors from "@/components/motion/SmoothAnchors";

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700", "800"],
  variable: "--font-display",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  variable: "--font-body",
});

const martianMono = Martian_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
  variable: "--font-mono",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const title = "Swipe & Scale — motion-led web design";
const description =
  "Motion-led web design, built in 2–6 weeks, fixed price. Websites that feel expensive.";

export const metadata: Metadata = {
  // Without metadataBase the canonical and og:image below silently resolve to
  // nothing in the built HTML.
  metadataBase: new URL(siteUrl),
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Swipe & Scale",
    title,
    description,
    url: "/",
    locale: "en_US",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bricolageGrotesque.variable} ${instrumentSans.variable} ${martianMono.variable} bg-void text-bone`}
      >
        {children}
        <SmoothAnchors />
      </body>
    </html>
  );
}
