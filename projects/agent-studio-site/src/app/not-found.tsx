import Link from 'next/link';

/**
 * 404.
 *
 * Deliberately plain — no canvas, no motion. This is the one page a visitor
 * reaches while already mildly annoyed, and it is also the page most likely to
 * be hit on a slow connection or a weak device. It should load instantly and
 * offer a way onward, not perform.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[var(--container-page)] flex-col justify-center px-6 py-32 md:px-12">
      <p className="font-mono text-2xs uppercase tracking-[0.24em] text-accent">404</p>
      <h1 className="mt-6 max-w-[16ch] text-5xl">This page doesn&apos;t exist.</h1>
      <p className="mt-6 max-w-[52ch] text-lg text-text-muted">
        The link may be out of date, or the page may have been renamed. Here is
        where most people are heading.
      </p>

      <nav aria-label="Suggested pages" className="mt-12">
        <ul className="flex flex-wrap gap-3">
          {[
            { href: '/agents', label: 'Browse agents' },
            { href: '/teams', label: 'Agent teams' },
            { href: '/pricing', label: 'Pricing' },
            { href: '/contact', label: 'Book a call' },
          ].map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex min-h-11 items-center rounded-[var(--radius-full)] border border-edge px-6 py-3 text-sm font-semibold transition-colors duration-[var(--duration-fast)] hover:bg-raised"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
