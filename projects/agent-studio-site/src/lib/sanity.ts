import { AGENTS, type Agent } from '@/content/agents';

/**
 * Content source.
 *
 * Reads from Sanity when NEXT_PUBLIC_SANITY_PROJECT_ID is configured, and falls
 * back to the local placeholder catalog when it is not. That fallback is
 * deliberate: it keeps the site buildable and demoable before the CMS exists,
 * and means a missing environment variable degrades to stale-but-correct
 * content rather than an empty catalog in production.
 *
 * The fallback is logged, not silent — a build that quietly serves placeholder
 * data because an env var was misspelled is a bad afternoon.
 */

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production';
const apiVersion = '2026-01-01';

export const isCmsConfigured = Boolean(projectId);

const AGENT_PROJECTION = `{
  name,
  "slug": slug.current,
  category,
  tagline,
  description,
  useCases,
  inputs,
  outputs,
  integrations,
  setupTime,
  pricing,
  variantKey,
  faq,
  featured
}`;

async function query<T>(groq: string): Promise<T | null> {
  if (!projectId) return null;

  const url =
    `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}` +
    `?query=${encodeURIComponent(groq)}`;

  try {
    const res = await fetch(url, {
      // Content changes rarely and pages are static; revalidate hourly rather
      // than on every request.
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      console.error('[sanity] Query failed:', res.status, await res.text());
      return null;
    }
    const json = (await res.json()) as { result: T };
    return json.result;
  } catch (error) {
    console.error('[sanity] Query threw:', error);
    return null;
  }
}

export async function getAgents(): Promise<Agent[]> {
  if (!isCmsConfigured) {
    console.warn('[sanity] Not configured — serving the local placeholder catalog.');
    return AGENTS;
  }

  const result = await query<Agent[]>(`*[_type == "agent"] | order(name asc) ${AGENT_PROJECTION}`);

  // An empty array is a legitimate answer (nothing published yet); null means
  // the query failed and falling back is the safer behaviour.
  if (result === null) {
    console.warn('[sanity] Query failed — falling back to the local catalog.');
    return AGENTS;
  }
  return result;
}

export async function getAgentBySlug(slug: string): Promise<Agent | null> {
  if (!isCmsConfigured) {
    return AGENTS.find((a) => a.slug === slug) ?? null;
  }

  const result = await query<Agent | null>(
    `*[_type == "agent" && slug.current == "${slug}"][0] ${AGENT_PROJECTION}`,
  );

  if (result === null) {
    return AGENTS.find((a) => a.slug === slug) ?? null;
  }
  return result;
}
