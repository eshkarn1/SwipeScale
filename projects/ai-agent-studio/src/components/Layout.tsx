import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface LayoutProps {
  children: ReactNode;
}

/**
 * App chrome: skip link, header/nav, main landmark, footer. Baseline
 * structure and semantics are load-bearing (skip link target, nav landmark,
 * SC 2.4.11-safe focus — nothing here should ever sit under a sticky header
 * unobscured); ui-builder owns the final visual design layered on top.
 *
 * `viewTransition` on the nav links is gated behind `prefers-reduced-motion`
 * so route changes never animate for someone who asked for reduced motion.
 */
export function Layout({ children }: LayoutProps) {
  const reducedMotion = useReducedMotion();

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <nav className="site-nav" aria-label="Primary">
          <NavLink to="/" end viewTransition={!reducedMotion} className="site-nav__brand">
            AI Agent Studio
          </NavLink>
          <ul className="site-nav__links">
            <li>
              <NavLink to="/agents" viewTransition={!reducedMotion}>
                Agents
              </NavLink>
            </li>
            <li>
              <NavLink to="/teams" viewTransition={!reducedMotion}>
                Teams
              </NavLink>
            </li>
          </ul>
        </nav>
      </header>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <footer className="site-footer">
        <p>
          Built by the studio it presents. Content is generated from the
          real agent definitions at <code>.claude/agents/*.md</code>.
        </p>
      </footer>
    </>
  );
}
