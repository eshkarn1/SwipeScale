import { NextResponse } from 'next/server';

/**
 * Contact / scoping request endpoint.
 *
 * Validates at the boundary and never trusts the client. Delivery is
 * provider-agnostic: set RESEND_API_KEY and CONTACT_TO_EMAIL and it sends;
 * leave them unset and it returns an honest 503 rather than pretending to
 * have delivered. A form that silently swallows leads is worse than one that
 * visibly fails.
 */

export const runtime = 'nodejs';

interface ContactPayload {
  name: string;
  email: string;
  company?: string;
  task: string;
  /** Honeypot — real users never fill this. */
  website?: string;
}

const LIMITS = { name: 120, email: 254, company: 160, task: 4000 } as const;

function validate(body: unknown): { ok: true; data: ContactPayload } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Expected a JSON object.' };
  }
  const b = body as Record<string, unknown>;

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const name = str(b.name);
  const email = str(b.email);
  const company = str(b.company);
  const task = str(b.task);
  const website = str(b.website);

  if (!name) return { ok: false, error: 'Please give us a name.' };
  if (!email) return { ok: false, error: 'Please give us an email address.' };
  // Deliberately permissive: over-strict email regexes reject valid addresses.
  // Real verification is the confirmation email, not a pattern.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'That email address does not look right.' };
  }
  if (!task) return { ok: false, error: 'Tell us what task you have in mind.' };

  if (name.length > LIMITS.name) return { ok: false, error: 'That name is too long.' };
  if (email.length > LIMITS.email) return { ok: false, error: 'That email is too long.' };
  if (company.length > LIMITS.company) return { ok: false, error: 'That company name is too long.' };
  if (task.length > LIMITS.task) {
    return { ok: false, error: 'Please keep the description under 4,000 characters.' };
  }

  return { ok: true, data: { name, email, company, task, website } };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Could not read that request.' }, { status: 400 });
  }

  const result = validate(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Honeypot filled means a bot. Return 200 so it learns nothing.
  if (result.data.website) {
    return NextResponse.json({ ok: true });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    // Honest failure. The message never reached a human, so do not claim it did.
    console.error('[contact] Delivery not configured — RESEND_API_KEY, CONTACT_TO_EMAIL, or CONTACT_FROM_EMAIL missing.');
    return NextResponse.json(
      { error: 'Our form isn’t connected yet. Please email us directly and we’ll pick it up.' },
      { status: 503 },
    );
  }

  const { name, email, company, task } = result.data;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: email,
        subject: `Scoping request — ${name}${company ? ` (${company})` : ''}`,
        text: [
          `Name: ${name}`,
          `Email: ${email}`,
          `Company: ${company || '—'}`,
          '',
          'Task:',
          task,
        ].join('\n'),
      }),
    });

    if (!response.ok) {
      // Log the provider's reason for us; never leak it to the client.
      console.error('[contact] Provider rejected the send:', response.status, await response.text());
      return NextResponse.json(
        { error: 'We couldn’t send that just now. Please try again shortly.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[contact] Send threw:', error);
    return NextResponse.json(
      { error: 'We couldn’t send that just now. Please try again shortly.' },
      { status: 502 },
    );
  }
}
