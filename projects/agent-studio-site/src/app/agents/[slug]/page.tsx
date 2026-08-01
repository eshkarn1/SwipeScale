import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AGENTS, CATEGORY_LABELS, getAgent } from '@/content/agents';
import { BuyButton } from '@/components/commerce/BuyButton';
import { agentSchema, faqSchema } from '@/lib/structured-data';

/** Static params so every agent page is prerendered and crawlable. */
export function generateStaticParams() {
  return AGENTS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const agent = getAgent(slug);
  if (!agent) return {};
  return { title: agent.name, description: agent.tagline };
}

function priceLabel(agent: NonNullable<ReturnType<typeof getAgent>>) {
  const { model, from, unit } = agent.pricing;
  if (model === 'quote') return 'Priced per project';
  if (from === undefined) return 'Contact us';
  const amount = `£${from.toLocaleString()}`;
  return model === 'subscription' ? `From ${amount} / ${unit}` : `${amount} one-time`;
}

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const agent = getAgent(slug);
  if (!agent) notFound();

  const related = AGENTS.filter(
    (a) => a.category === agent.category && a.slug !== agent.slug,
  ).slice(0, 3);

  const faq = faqSchema(agent.faq);

  return (
    <article className="mx-auto max-w-[var(--container-page)] px-6 pb-32 pt-36 md:px-12 md:pt-44">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(agentSchema(agent)) }}
      />
      {faq && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
        />
      )}

      <nav aria-label="Breadcrumb" className="mb-10 font-mono text-2xs text-text-faint">
        <Link href="/agents" className="hover:text-text">
          Catalog
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="text-text-muted">{CATEGORY_LABELS[agent.category]}</span>
      </nav>

      <header className="max-w-[54ch]">
        <p className="font-mono text-2xs uppercase tracking-[0.2em] text-accent">
          {CATEGORY_LABELS[agent.category]}
        </p>
        <h1 className="mt-6 text-5xl">{agent.name}</h1>
        <p className="mt-6 text-lg text-text-muted">{agent.description}</p>
      </header>

      {/* Commerce block sits high — a buyer who has decided should not have to
          scroll past the spec to act. */}
      <div className="mt-12 flex flex-col gap-5 rounded-[var(--radius-lg)] border border-edge bg-surface p-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-2xl font-bold tracking-tight">{priceLabel(agent)}</p>
          <p className="mt-1 text-sm text-text-muted">Live in {agent.setupTime}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <BuyButton
            slug={agent.slug}
            model={agent.pricing.model}
            className="cursor-pointer rounded-[var(--radius-full)] bg-accent px-7 py-3.5 text-sm font-semibold text-accent-ink transition-transform duration-[var(--duration-fast)] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <Link
            href="/contact"
            className="rounded-[var(--radius-full)] border border-edge px-7 py-3.5 text-sm font-semibold transition-colors duration-[var(--duration-fast)] hover:bg-raised"
          >
            Book a call
          </Link>
        </div>
      </div>

      <div className="mt-20 grid gap-16 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-14">
          <Section heading="What you'd use it for">
            <ul className="flex flex-col gap-3">
              {agent.useCases.map((u) => (
                <li key={u} className="flex gap-3 text-text-muted">
                  <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                  {u}
                </li>
              ))}
            </ul>
          </Section>

          <Section heading="Inputs and outputs">
            <div className="grid gap-8 sm:grid-cols-2">
              <List label="Takes in" items={agent.inputs} />
              <List label="Produces" items={agent.outputs} />
            </div>
          </Section>

          <Section heading="Questions">
            <dl className="flex flex-col divide-y divide-hairline border-y border-hairline">
              {agent.faq.map((item) => (
                <div key={item.q} className="py-5">
                  <dt className="font-semibold">{item.q}</dt>
                  <dd className="mt-2 text-text-muted">{item.a}</dd>
                </div>
              ))}
            </dl>
          </Section>
        </div>

        <aside className="flex flex-col gap-10">
          <div>
            <h2 className="font-mono text-2xs uppercase tracking-[0.16em] text-text-faint">
              Works with
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {agent.integrations.map((i) => (
                <li
                  key={i}
                  className="rounded-[var(--radius-full)] border border-hairline bg-raised px-3 py-1.5 text-xs text-text-muted"
                >
                  {i}
                </li>
              ))}
            </ul>
          </div>

          {related.length > 0 && (
            <div>
              <h2 className="font-mono text-2xs uppercase tracking-[0.16em] text-text-faint">
                Also in {CATEGORY_LABELS[agent.category]}
              </h2>
              <ul className="mt-4 flex flex-col gap-2">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/agents/${r.slug}`}
                      className="text-sm text-text-muted transition-colors duration-[var(--duration-fast)] hover:text-accent"
                    >
                      {r.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl">{heading}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function List({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <h3 className="font-mono text-2xs uppercase tracking-[0.16em] text-text-faint">{label}</h3>
      <ul className="mt-3 flex flex-col gap-2 text-sm text-text-muted">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
