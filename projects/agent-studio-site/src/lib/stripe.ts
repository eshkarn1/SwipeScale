import Stripe from 'stripe';

/**
 * Stripe client.
 *
 * Lazily constructed and null when unconfigured, so importing this module can
 * never crash a build or a page render that does not actually need payments.
 * Every consumer must handle null — that is the whole point, since the site
 * has to be demoable and deployable before a Stripe account exists.
 */

let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client) {
    client = new Stripe(key, {
      // Pin the API version. Letting Stripe pick means a server-side account
      // upgrade can silently change response shapes under a running deploy.
      // Must match the version this SDK's types are generated against —
      // bump both together when upgrading the package.
      apiVersion: '2026-07-29.dahlia',
      typescript: true,
    });
  }
  return client;
}

export const isPaymentsConfigured = (): boolean => Boolean(process.env.STRIPE_SECRET_KEY);

/**
 * Absolute site origin, needed for Checkout success/cancel URLs.
 * Falls back through Vercel's env var, then localhost for development.
 */
export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return 'http://localhost:3000';
}
