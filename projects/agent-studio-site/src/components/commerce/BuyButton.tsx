'use client';

import Link from 'next/link';
import { useState } from 'react';

type Status = 'idle' | 'loading' | 'error';

/**
 * Checkout trigger.
 *
 * Progressive by design: when payments are unavailable — no Stripe key, no
 * price on this agent, or a quote-priced agent — this degrades to the primary
 * CTA rather than showing a buy button that fails when pressed. A broken buy
 * button costs more than no buy button.
 */
export function BuyButton({
  slug,
  model,
  className,
}: {
  slug: string;
  model: 'one-time' | 'subscription' | 'quote';
  className?: string;
}) {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  // Quote-priced work never goes through a card form.
  if (model === 'quote') {
    return (
      <Link href="/contact" className={className}>
        Book a scoping call
      </Link>
    );
  }

  async function buy() {
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;

      if (res.ok && payload?.url) {
        window.location.href = payload.url;
        return;
      }

      setMessage(payload?.error ?? 'Could not start checkout.');
      setStatus('error');
    } catch {
      setMessage('We couldn’t reach the server. Please try again.');
      setStatus('error');
    }
  }

  // Once checkout has failed, stop offering a button that does not work and
  // hand the visitor to the route that does.
  if (status === 'error') {
    return (
      <div className="flex flex-col gap-2">
        <Link href="/contact" className={className}>
          Book a call
        </Link>
        <p className="text-xs text-text-faint" role="status">
          {message}
        </p>
      </div>
    );
  }

  return (
    <button type="button" onClick={buy} disabled={status === 'loading'} className={className}>
      {status === 'loading' ? 'Starting checkout…' : 'Deploy this agent'}
    </button>
  );
}
