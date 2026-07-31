'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const LINKS = [
  { href: '/agents', label: 'Agents' },
  { href: '/teams', label: 'Teams' },
  { href: '/custom', label: 'Custom' },
  { href: '/pricing', label: 'Pricing' },
];

/**
 * Primary navigation.
 *
 * The persistent "Book a call" is a direct answer to the open question raised
 * in Deliverable 1: the home page holds roughly 8.6 seconds of pinned scroll
 * before its closing CTA, which is far too long to leave a ready buyer without
 * a way to convert. Keeping the primary CTA in the nav means conversion is one
 * click away at any scroll depth — and it lives in the DOM, above the canvas,
 * so the 3D can never obstruct it.
 *
 * The bar starts transparent over the hero and gains its surface after the
 * first viewport, so the opening frame is uninterrupted.
 */
export function SiteNav() {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    // Threshold, not a scrub — this is a state change, not an animation, and
    // reading scrollY on a passive listener is cheap enough not to need GSAP.
    const onScroll = () => setSolid(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={[
        'fixed inset-x-0 top-0 z-50 transition-colors duration-[var(--duration-base)]',
        solid ? 'border-b border-hairline bg-void/85 backdrop-blur-md' : 'border-b border-transparent',
      ].join(' ')}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-[var(--container-page)] items-center gap-8 px-6 py-4 md:px-12"
      >
        <Link href="/" className="mr-auto text-sm font-bold tracking-tight">
          AI Agent Studio
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="rounded-[var(--radius-sm)] px-3 py-2 text-sm text-text-muted transition-colors duration-[var(--duration-fast)] hover:text-text"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/contact"
          className="rounded-[var(--radius-full)] bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink transition-transform duration-[var(--duration-fast)] hover:-translate-y-0.5"
        >
          Book a call
        </Link>
      </nav>
    </header>
  );
}
