import { Link } from 'react-router';

/**
 * Catch-all route. Deliberately plain: no canvas, no 3D, no motion. A 404 is
 * the one page a visitor reaches while already mildly frustrated, and it is
 * also the page most likely to be hit on a slow connection or a weak device.
 */
export default function NotFound() {
  return (
    <div className="not-found">
      <header>
        <p className="not-found__code">404</p>
        <h1>Page not found</h1>
        <p>
          That route does not exist. It may have been renamed, or the link that
          brought you here may be out of date.
        </p>
      </header>
      <nav aria-label="Suggested pages">
        <ul className="not-found__links">
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/agents">Agent directory</Link>
          </li>
          <li>
            <Link to="/teams">Teams</Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
