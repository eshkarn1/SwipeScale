import type { Metadata } from 'next';
import { Syne, Geist, Geist_Mono } from 'next/font/google';
import { SmoothScrollProvider } from '@/components/providers/SmoothScrollProvider';
import { SiteNav } from '@/components/layout/SiteNav';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Preloader } from '@/components/layout/Preloader';
import { Cursor } from '@/components/motion/Cursor';
import { PageTransition } from '@/components/motion/PageTransition';
import { organizationSchema, websiteSchema } from '@/lib/structured-data';
import { siteUrl } from '@/lib/stripe';
import './globals.css';

// Self-hosted at build time by next/font — no runtime request to Google, which
// would otherwise be a render-blocking third-party hop against the 2.5s LCP budget.
const syne = Syne({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
});

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  // Required for canonical and og:url to resolve to absolute URLs. Without it
  // Next emits neither, and every page looks canonical-less to a crawler.
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'AI Agent Studio — AI agents that ship real work',
    template: '%s — AI Agent Studio',
  },
  description:
    'Buy a pre-built AI agent, commission one built to your spec, or deploy a multi-agent team that runs an entire workflow. Connected to your own tools, live in days.',
  // Self-referencing canonical on every route, resolved against metadataBase.
  alternates: { canonical: './' },
  openGraph: {
    type: 'website',
    siteName: 'AI Agent Studio',
    url: './',
    title: 'AI Agent Studio — AI agents that ship real work',
    description:
      'Buy a pre-built AI agent, commission one built to your spec, or deploy a multi-agent team that runs an entire workflow.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Agent Studio — AI agents that ship real work',
    description:
      'Buy a pre-built AI agent, commission one built to your spec, or deploy a multi-agent team that runs an entire workflow.',
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${geist.variable} ${geistMono.variable}`}>
      <body>
        <script
          type="application/ld+json"
          // Content is our own typed data, never user input — see structured-data.ts
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema()) }}
        />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Preloader />
        <Cursor />
        <SmoothScrollProvider>
          <SiteNav />
          <main id="main">
            <PageTransition>{children}</PageTransition>
          </main>
          <SiteFooter />
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
