/**
 * THE single source of the product name.
 *
 * BUILD_SPEC §1: a rename must be a one-line change. No component, page,
 * layout, route handler, email, or `metadata` block may hard-code the product
 * name, domain, or support address — import from here instead.
 *
 * Values are from docs/DECISIONS.md §1 (name and domain), §2 (buyer) and
 * §6 (support channel).
 *
 * NOTE for the owner: DECISIONS §1 lists domain registration and the
 * CIPO/USPTO trademark searches as still OPEN. `uselightline.com` is not
 * confirmed as owned. If the name changes, this file is the only edit.
 */
export const brand = {
  name: "Lightline",
  domain: "uselightline.com",
  url: "https://uselightline.com",
  supportEmail: "support@uselightline.com",
  tagline: "Every deal, in the light.",
  description:
    "A CRM built for real-estate teams — track listings and buyer-side transactions from first lead to closing in one pipeline.",
} as const;

export type Brand = typeof brand;

/**
 * The canonical origin for metadata, sitemap and OG URLs.
 *
 * ENGINEERING NOTE: Next emits no canonical and no og:image without
 * `metadataBase`, so every share renders a blank card. `NEXT_PUBLIC_SITE_URL`
 * must be set at deploy or canonicals ship pointing at localhost.
 */
export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? brand.url;
}
