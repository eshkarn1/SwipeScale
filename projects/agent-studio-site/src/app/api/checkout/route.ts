import { NextResponse } from 'next/server';
import { getStripe, siteUrl } from '@/lib/stripe';
import { getAgents } from '@/lib/sanity';

export const runtime = 'nodejs';

/**
 * Creates a Stripe Checkout session.
 *
 * The security-critical decision here: the client sends an agent SLUG, never a
 * price or a Stripe price ID. Prices are resolved server-side from our own
 * catalogue, so a tampered request cannot buy a £600/month agent for £1. Any
 * endpoint that accepts an amount from the browser is a bug.
 *
 * Hybrid pricing maps to Checkout modes:
 *   subscription -> mode 'subscription'
 *   one-time     -> mode 'payment'
 *   quote        -> refused; those go to a scoping call, not a card form
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: 'Card checkout isn’t available yet. Book a call and we’ll set you up.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Could not read that request.' }, { status: 400 });
  }

  const slug =
    typeof body === 'object' && body !== null && typeof (body as { slug?: unknown }).slug === 'string'
      ? (body as { slug: string }).slug
      : null;

  if (!slug) {
    return NextResponse.json({ error: 'No agent specified.' }, { status: 400 });
  }

  // Resolve against our own catalogue. Never trust a client-supplied price.
  const agents = await getAgents();
  const agent = agents.find((a) => a.slug === slug);

  if (!agent) {
    return NextResponse.json({ error: 'We don’t recognise that agent.' }, { status: 404 });
  }

  if (agent.pricing.model === 'quote') {
    return NextResponse.json(
      { error: 'This one is priced per project. Book a call and we’ll scope it.' },
      { status: 400 },
    );
  }

  const priceId = (agent.pricing as { stripePriceId?: string }).stripePriceId;
  if (!priceId) {
    // Configured Stripe but no price on this agent — a content gap, not a bug.
    // Say so rather than failing opaquely.
    console.error(`[checkout] Agent "${slug}" has no stripePriceId set.`);
    return NextResponse.json(
      { error: 'This agent isn’t set up for card checkout yet. Book a call instead.' },
      { status: 503 },
    );
  }

  const origin = siteUrl();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: agent.pricing.model === 'subscription' ? 'subscription' : 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/contact?purchased=${encodeURIComponent(agent.slug)}`,
      cancel_url: `${origin}/agents/${agent.slug}`,
      // Lets us reconcile the webhook back to a catalogue item without
      // depending on Stripe product metadata staying in sync.
      metadata: { agentSlug: agent.slug, agentName: agent.name },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    });

    if (!session.url) {
      console.error('[checkout] Stripe returned a session with no URL:', session.id);
      return NextResponse.json({ error: 'Could not start checkout.' }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    // Log the real reason for us; never leak Stripe internals to the client.
    console.error('[checkout] Session creation failed:', error);
    return NextResponse.json(
      { error: 'Could not start checkout just now. Please try again shortly.' },
      { status: 502 },
    );
  }
}
