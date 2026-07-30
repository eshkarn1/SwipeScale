import type { Metadata } from 'next';
import { Syne, Geist, Geist_Mono } from 'next/font/google';
import { SmoothScrollProvider } from '@/components/providers/SmoothScrollProvider';
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
  title: {
    default: 'AI Agent Studio — AI agents that ship real work',
    template: '%s — AI Agent Studio',
  },
  description:
    'Pre-built AI agents, custom agents built to your spec, and multi-agent teams that run entire workflows. Deploy in days, not quarters.',
  openGraph: {
    type: 'website',
    siteName: 'AI Agent Studio',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${geist.variable} ${geistMono.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SmoothScrollProvider>
          <main id="main">{children}</main>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
