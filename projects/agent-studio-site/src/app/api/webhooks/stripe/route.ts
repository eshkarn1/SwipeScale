import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';

/**
 * Stripe webhook.
 *
 * Two rules this endpoint exists to enforce:
 *
 * 1. VERIFY THE SIGNATURE. This URL is public, so anyone can POST a
 *    convincing-looking "payment succeeded" body to it. Without signature
 *    verification against the raw request body, that is free product. The body
 *    must be read as text, not JSON — parsing and re-serialising changes bytes
 *    and the signature will not match.
 *
 * 2. RESPOND 200 QUICKLY, EVEN ON OUR OWN FAILURE. Stripe retries non-2xx for
 *    days. If our fulfilment throws and we return 500, we get the same event
 *    repeatedly while the customer waits. Acknowledge receipt, log loudly, and
 *    fix forward. The only 4xx here is a genuinely invalid signature.
 *
 * Fulfilment itself is intentionally a single logged function. What should
 * happen on purchase — provisioning, a welcome email, a CRM record — depends
 * on systems that do not exist yet, and writing a plausible-looking stub that
 * silently does nothing would be worse than an obvious TODO.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !secret) {
    console.error('[stripe-webhook] Not configured — STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET missing.');
    return NextResponse.json({ error: 'Webhooks are not configured.' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });
  }

  // Raw text. Never request.json() here — see rule 1.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    // The one case that legitimately gets a 4xx: this did not come from Stripe.
    console.error('[stripe-webhook] Signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await onPurchase({
          sessionId: session.id,
          agentSlug: session.metadata?.agentSlug ?? null,
          agentName: session.metadata?.agentName ?? null,
          customerEmail: session.customer_details?.email ?? null,
          mode: session.mode,
          amountTotal: session.amount_total,
          currency: session.currency,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.warn(
          `[stripe-webhook] Subscription cancelled: ${subscription.id}. ` +
            'TODO: deprovision the agent and notify the account owner.',
        );
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.warn(
          `[stripe-webhook] Payment failed for invoice ${invoice.id}. ` +
            'TODO: notify the customer before dunning ends.',
        );
        break;
      }

      default:
        // Not an error. Stripe sends many event types and ignoring the ones we
        // have not opted into is correct.
        break;
    }
  } catch (error) {
    // Log loudly, still acknowledge — see rule 2.
    console.error(`[stripe-webhook] Handler threw for ${event.type} (${event.id}):`, error);
  }

  return NextResponse.json({ received: true });
}

interface PurchaseRecord {
  sessionId: string;
  agentSlug: string | null;
  agentName: string | null;
  customerEmail: string | null;
  mode: Stripe.Checkout.Session.Mode | null;
  amountTotal: number | null;
  currency: string | null;
}

/**
 * Fulfilment.
 *
 * TODO: provision the agent, send the welcome email, record the sale. Each of
 * those needs a system that does not exist yet. Until then this logs enough to
 * reconcile a real payment by hand, which is honest — a stub that returned
 * success while doing nothing would hide missed orders.
 *
 * When implementing: make this idempotent. Stripe can deliver the same event
 * more than once, and provisioning twice is worse than provisioning late.
 */
async function onPurchase(record: PurchaseRecord): Promise<void> {
  console.info('[stripe-webhook] PURCHASE — fulfilment not implemented:', JSON.stringify(record));
}
