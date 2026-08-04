const SOCIALS = [
  // STUB: placeholder profile URLs — swap for the studio's real handles.
  { label: "X", href: "https://x.com/swipeandscale" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/swipeandscale" },
] as const;

export default function Footer() {
  return (
    <footer className="rule mx-[var(--gutter)] flex flex-col gap-4 py-[var(--stack-md)] pb-[calc(var(--stack-md)+3rem)] sm:flex-row sm:items-center sm:justify-between">
      <a href="mailto:hello@swipeandscale.studio" className="mono inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-bone">
        hello@swipeandscale.studio
      </a>

      <nav aria-label="Elsewhere" className="flex gap-6">
        {SOCIALS.map((social) => (
          <a
            key={social.label}
            href={social.href}
            className="mono inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-bone"
          >
            {social.label}
          </a>
        ))}
      </nav>

      <nav aria-label="Legal" className="flex items-center gap-6">
        <a href="/privacy" className="mono inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-bone">
          Privacy
        </a>
        <a href="/terms" className="mono inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-bone">
          Terms
        </a>
      </nav>

      <p className="mono text-bone/70">© 2026 Swipe &amp; Scale</p>
    </footer>
  );
}
