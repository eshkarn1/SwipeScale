'use client';

import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/lib/motion-tokens';

type Status = 'idle' | 'submitting' | 'sent' | 'error';

/**
 * Scoping request form.
 *
 * Client-side only for now — there is no endpoint yet, and the submit handler
 * is explicit about that rather than faking a success state. Wiring it to a
 * real handler is a single function swap.
 *
 * Validation is deliberately native (`required`, `type="email"`): the browser's
 * own messages are localised, announced by screen readers, and never drift out
 * of sync with the constraint they describe.
 */
export function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');

    // TODO: POST to the real endpoint once it exists. Deliberately not
    // simulated — a fake success would hide a broken form in production.
    setStatus('error');
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate={false}>
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

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="rounded-[var(--radius-full)] bg-accent px-8 py-4 text-sm font-semibold text-accent-ink transition-transform duration-[var(--duration-fast)] hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {status === 'submitting' ? 'Sending…' : 'Request a call'}
      </button>

      {/* Announced politely so a screen reader user hears the outcome without
          losing their place in the form. */}
      <div role="status" aria-live="polite">
        <AnimatePresence>
          {status === 'error' && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION.fast, ease: EASE.outQuart }}
              className="rounded-[var(--radius-md)] border border-edge bg-raised px-4 py-3 text-sm text-text-muted"
            >
              This form isn’t connected to a backend yet. Email{' '}
              <a href="mailto:hello@example.com" className="text-accent underline">
                hello@example.com
              </a>{' '}
              in the meantime.
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
