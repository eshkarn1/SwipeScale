/**
 * Turns a display name into a URL-safe slug. Used for `Workspace.slug`,
 * which is what identifies a tenant in every `(app)/[workspace]/*` route.
 */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    // ̀-ͯ is the combining-diacritical-marks block that NFKD
    // decomposition leaves behind (e.g. "é" -> "e" + U+0301) — strip it so
    // accented names still produce a plain ASCII slug.
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return base || "workspace";
}
