import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/stripe';

/**
 * robots.txt
 *
 * API routes are disallowed: they return JSON, have no SEO value, and one of
 * them is a webhook that should not appear in an index at all.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
