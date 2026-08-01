import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LEGAL_DOCS, LEGAL_SLUGS, type LegalDoc } from '@/content/legal';

export function generateStaticParams() {
  return LEGAL_SLUGS.map((slug) => ({ slug }));
}

function getDoc(slug: string): LegalDoc | undefined {
  return (LEGAL_SLUGS as string[]).includes(slug)
    ? LEGAL_DOCS[slug as LegalDoc['slug']]
    : undefined;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) return {};
  return { title: doc.title, description: doc.summary };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();

  return (
    <div className="mx-auto max-w-[var(--container-page)] px-6 pb-32 pt-36 md:px-12 md:pt-44">
      <div className="grid gap-16 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Legal documents" className="lg:sticky lg:top-32 lg:self-start">
          {/* Not a heading: this sits before the article's h1 in document
              order, and an h2 there breaks the heading outline for screen
              reader users navigating by headings. The nav's aria-label
              already carries the semantics. */}
          <p className="font-mono text-2xs uppercase tracking-[0.16em] text-text-faint">Legal</p>
          <ul className="mt-4 flex flex-col gap-2.5">
            {LEGAL_SLUGS.map((s) => (
              <li key={s}>
                <Link
                  href={`/legal/${s}`}
                  aria-current={s === doc.slug ? 'page' : undefined}
                  className={
                    s === doc.slug
                      ? 'text-sm font-semibold text-accent'
                      : 'text-sm text-text-muted transition-colors duration-[var(--duration-fast)] hover:text-text'
                  }
                >
                  {LEGAL_DOCS[s].title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <article className="max-w-[var(--container-text)]">
          <header>
            <h1 className="text-4xl">{doc.title}</h1>
            <p className="mt-4 text-lg text-text-muted">{doc.summary}</p>
            <p className="mt-6 font-mono text-2xs uppercase tracking-[0.14em] text-text-faint">
              Last updated{' '}
              <time dateTime={doc.updated}>
                {new Date(doc.updated).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
            </p>
          </header>

          <div className="mt-14 flex flex-col gap-12">
            {doc.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-xl">{section.heading}</h2>
                <div className="mt-4 flex flex-col gap-4">
                  {section.body.map((para) => (
                    <p key={para} className="text-text-muted">
                      {para}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
