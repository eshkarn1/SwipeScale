/**
 * Outbound transactional email. BUILD_SPEC §2: Resend + React Email.
 *
 * No `RESEND_API_KEY` is configured anywhere in this environment (DECISIONS
 * §9 — nobody has signed up for Resend yet, and doing so is outside this
 * agent's authority per BUILD_SPEC §9). Real delivery is fully implemented
 * and will work the moment the key is set; until then, non-production runs
 * fall back to a "dev inbox": the rendered email is written to
 * `.local/dev-inbox/` and logged, so the magic-link and invite flows can
 * still be exercised end-to-end (see e2e/support/dev-inbox.ts, which is how
 * the Playwright suite "receives" mail).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { render } from "@react-email/render";
import { Resend } from "resend";

import { brand } from "@/config/brand";

import { InviteEmail } from "./emails/invite-email";
import { MagicLinkEmail } from "./emails/magic-link-email";

const DEV_INBOX_DIR = path.join(process.cwd(), ".local", "dev-inbox");

async function deliver(params: {
  to: string;
  subject: string;
  react: React.ReactElement;
  /** The single primary action link, if any — written verbatim to the dev
   * inbox file so tests don't have to scrape it out of rendered HTML. */
  debugUrl?: string;
}): Promise<void> {
  const { to, subject, react, debugUrl } = params;
  const html = await render(react);
  const text = await render(react, { plainText: true });

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const resend = new Resend(apiKey);
    const from = process.env.AUTH_EMAIL_FROM || `${brand.name} <onboarding@resend.dev>`;
    const result = await resend.emails.send({ from, to, subject, html, text });
    if (result.error) {
      // Never leak provider error detail past this log line (Security note
      // in .claude/ENGINEERING-NOTES.md).
      console.error("[email] Resend send failed:", result.error.message);
      throw new Error("Failed to send email.");
    }
    return;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "RESEND_API_KEY is not set. Refusing to silently drop an email in production.",
    );
  }

  await mkdir(DEV_INBOX_DIR, { recursive: true });
  const file = path.join(
    DEV_INBOX_DIR,
    `${Date.now()}-${to.replace(/[^a-z0-9]/gi, "_")}.json`,
  );
  await writeFile(
    file,
    JSON.stringify({ to, subject, url: debugUrl ?? null, html }, null, 2),
  );
  console.log(`[dev email] "${subject}" to ${to} -> ${file}`);
}

export async function sendMagicLinkEmail(params: {
  to: string;
  url: string;
}): Promise<void> {
  await deliver({
    to: params.to,
    subject: `Sign in to ${brand.name}`,
    react: <MagicLinkEmail url={params.url} />,
    debugUrl: params.url,
  });
}

export async function sendInviteEmail(params: {
  to: string;
  workspaceName: string;
  inviterName: string | null;
  acceptUrl: string;
}): Promise<void> {
  await deliver({
    to: params.to,
    subject: `You're invited to join ${params.workspaceName} on ${brand.name}`,
    react: (
      <InviteEmail
        workspaceName={params.workspaceName}
        inviterName={params.inviterName}
        acceptUrl={params.acceptUrl}
      />
    ),
    debugUrl: params.acceptUrl,
  });
}
