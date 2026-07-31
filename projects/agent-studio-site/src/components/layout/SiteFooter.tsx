import Link from 'next/link';

const COLUMNS = [
  {
    heading: 'Product',
    links: [
      { href: '/agents', label: 'Agent catalog' },
      { href: '/teams', label: 'Agent teams' },
      { href: '/custom', label: 'Custom agents' },
      { href: '/pricing', label: 'Pricing' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/resources', label: 'Resources' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { href: '/legal/privacy', label: 'Privacy' },
      { href: '/legal/terms', label: 'Terms' },
      // Enterprise buyers ask for this early enough that burying it costs deals.
      { href: '/legal/security', label: 'Security & DPA' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-hairline bg-void">
      <div className="mx-auto max-w-[var(--container-page)] px-6 py-16 md:px-12">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          <div className="max-w-[30ch]">
            <p className="text-sm font-bold">AI Agent Studio</p>
            <p className="mt-3 text-sm text-text-muted">
              Agents and agent teams that run real workflows. Deployed into your
              stack, measured in hours returned.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.heading}>
                <h2 className="font-mono text-2xs uppercase tracking-[0.16em] text-text-faint">
                  {col.heading}
                </h2>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-text-muted transition-colors duration-[var(--duration-fast)] hover:text-text"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-16 font-mono text-2xs text-text-faint">
          © {new Date().getFullYear()} AI Agent Studio
        </p>
      </div>
    </footer>
  );
}
