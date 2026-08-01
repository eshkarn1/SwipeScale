import type { Agent } from '@/content/agents';
import { siteUrl } from '@/lib/stripe';

/**
 * JSON-LD structured data.
 *
 * Only facts that are actually true and visible on the page go in here.
 * Marking up an aggregateRating or a review that does not exist is both a
 * Google policy violation and the same fabrication problem the rest of this
 * codebase avoids — so there is no rating, no review count, and no
 * testimonial markup until real ones exist.
 *
 * Prices are emitted only when a real number exists; a `quote` agent gets no
 * `offers` block rather than a made-up figure.
 */

const CURRENCY = 'GBP';

export function organizationSchema() {
  const base = siteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AI Agent Studio',
    url: base,
    description:
      'Pre-built AI agents, custom agents built to your spec, and multi-agent teams that run entire workflows.',
    logo: `${base}/brand/logo-mark.svg`,
  };
}

export function websiteSchema() {
  const base = siteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'AI Agent Studio',
    url: base,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${base}/agents?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function agentSchema(agent: Agent) {
  const base = siteUrl();

  const offers =
    agent.pricing.model !== 'quote' && typeof agent.pricing.from === 'number'
      ? {
          offers: {
            '@type': 'Offer',
            price: agent.pricing.from,
            priceCurrency: CURRENCY,
            availability: 'https://schema.org/InStock',
            url: `${base}/agents/${agent.slug}`,
          },
        }
      : {};

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: agent.name,
    description: agent.tagline,
    category: agent.category,
    url: `${base}/agents/${agent.slug}`,
    brand: { '@type': 'Brand', name: 'AI Agent Studio' },
    ...offers,
  };
}

export function faqSchema(faq: { q: string; a: string }[]) {
  if (faq.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

/**
 * Renders a JSON-LD script tag.
 *
 * JSON.stringify escapes nothing dangerous here because every value comes from
 * our own typed content, never from user input. If that ever changes, escape
 * `<` to `<` before injecting.
 */
export function jsonLd(data: object | null): string | null {
  if (!data) return null;
  return JSON.stringify(data);
}
