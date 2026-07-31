'use client';

import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/lib/motion-tokens';

type Status = 'idle' | 'submitting' | 'sent' | 'error';

/**
 * Scoping request form.
 *
 * Posts to /api/contact, which validates again server-side — client validation
 * is a convenience, never a control. The error message shown is whatever the
 * server returns, so an unconfigured mail provider surfaces honestly instead of
 * looking like a success.
 *
 * Field validation is native (`required`, `type="email"`): the browser's own
 * messages are localised, announced by screen readers, and never drift out of
 * sync with the constraint they describe.
 */
export function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string>('');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus('submitting');
    setMessage('');

    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setStatus('sent');
        form.reset();
        return;
      }

      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      setMessage(payload?.error ?? 'Something went wrong. Please try again.');
      setStatus('error');
    } catch {
      setMessage('We couldn’t reach the server. Check your connection and try again.');
      setStatus('error');
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <Field id="name" label="Your name" autoComplete="name" required />
      <Field id="email" label="Work email" type="email" autoComplete="email" required />
      <Field id="company" label="Company" autoComplete="organization" />

      <div className="flex flex-col gap-2">
        <label htmlFor="task" className="text-sm font-semibold">
          What task are you thinking about?
        </label>
        <p id="task-hint" className="text-xs text-text-faint">
          The one your team complains about is usually the right one.
        </p>
        <textarea
          id="task"
          name="task"
          rows={5}
          required
          aria-describedby="task-hint"
          className="rounded-[var(--radius-md)] border border-edge bg-surface px-4 py-3 text-sm text-text placeholder:text-text-faint focus-visible:border-accent"
        />
      </div>

      {/* Honeypot. Hidden from sight and from assistive tech; only a bot fills it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="cursor-pointer rounded-[var(--radius-full)] bg-accent px-8 py-4 text-sm font-semibold text-accent-ink transition-transform duration-[var(--duration-fast)] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {status === 'submitting' ? 'Sending…' : 'Request a call'}
      </button>

      {/* Announced politely so a screen reader user hears the outcome without
          losing their place in the form. */}
      <div role="status" aria-live="polite">
        <AnimatePresence mode="wait">
          {status === 'sent' && (
            <motion.p
              key="sent"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION.fast, ease: EASE.outQuart }}
              className="rounded-[var(--radius-md)] border border-accent bg-raised px-4 py-3 text-sm"
            >
              Got it — we’ll reply within one working day.
            </motion.p>
          )}
          {status === 'error' && (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION.fast, ease: EASE.outQuart }}
              className="rounded-[var(--radius-md)] border border-edge bg-raised px-4 py-3 text-sm text-text-muted"
            >
              {message}{' '}
              <a href="mailto:hello@example.com" className="text-accent underline">
                hello@example.com
              </a>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  type = 'text',
  required,
  autoComplete,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        {!required && <span className="ml-2 font-normal text-text-faint">Optional</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="rounded-[var(--radius-md)] border border-edge bg-surface px-4 py-3 text-sm text-text focus-visible:border-accent"
      />
    </div>
  );
}
