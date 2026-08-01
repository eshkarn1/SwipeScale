import type { MetadataRoute } from 'next';
import { AGENTS } from '@/content/agents';
import { LEGAL_SLUGS } from '@/content/legal';
import { siteUrl } from '@/lib/stripe';

/**
 * Sitemap.
 *
 * Generated from the same content modules the pages render from, so it cannot
 * drift out of sync — a hand-maintained sitemap is stale the first time
 * someone adds an agent and forgets.
 *
 * Priorities reflect commercial intent rather than a flat list: the catalogue
 * and contact routes are where conversion happens.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();

  const staticRoutes: { path: string; priority: number; freq: 'weekly' | 'monthly' | 'yearly' }[] = [
    { path: '', priority: 1.0, freq: 'weekly' },
    { path: '/agents', priority: 0.9, freq: 'weekly' },
    { path: '/teams', priority: 0.8, freq: 'monthly' },
    { path: '/custom', priority: 0.8, freq: 'monthly' },
    { path: '/pricing', priority: 0.8, freq: 'monthly' },
    { path: '/contact', priority: 0.9, freq: 'monthly' },
    { path: '/about', priority: 0.5, freq: 'monthly' },
    { path: '/resources', priority: 0.4, freq: 'weekly' },
  ];

  return [
    ...staticRoutes.map((r) => ({
      url: `${base}${r.path}`,
      lastModified: now,
      changeFrequency: r.freq,
      priority: r.priority,
    })),
    ...AGENTS.map((agent) => ({
      url: `${base}/agents/${agent.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...LEGAL_SLUGS.map((slug) => ({
      url: `${base}/legal/${slug}`,
      lastModified: now,
      changeFrequency: 'yearly' as const,
      priority: 0.2,
    })),
  ];
}
