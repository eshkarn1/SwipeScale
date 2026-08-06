/**
 * Reads the dev-only "mailbox" `src/server/email.tsx` writes to when
 * `RESEND_API_KEY` is unset (see `playwright.config.ts`'s `webServer.env`).
 * This is how the E2E suite clicks a magic link or an invite accept link
 * without a real inbox, an SMTP catcher, or a paid Resend signup.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const DEV_INBOX_DIR = path.join(process.cwd(), ".local", "dev-inbox");

interface DevEmail {
  to: string;
  subject: string;
  url: string | null;
  html: string;
}

/**
 * Polls the dev-inbox directory for the most recent email to `to`, sent at
 * or after `sinceMs` (a `Date.now()` captured right before triggering the
 * send) — filtering by time as well as recipient so a re-run doesn't pick
 * up a stale file from a previous test run for the same address.
 */
export async function waitForEmail(
  to: string,
  sinceMs: number,
  timeoutMs = 10_000,
): Promise<DevEmail> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const found = await findLatestEmail(to, sinceMs);
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(
    `No dev-inbox email to ${to} appeared within ${timeoutMs}ms. ` +
      `Checked ${DEV_INBOX_DIR}.`,
  );
}

async function findLatestEmail(
  to: string,
  sinceMs: number,
): Promise<DevEmail | null> {
  let files: string[];
  try {
    files = await readdir(DEV_INBOX_DIR);
  } catch {
    return null; // directory doesn't exist yet — nothing sent so far
  }

  const candidates = files
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const timestampPart = name.split("-")[0];
      return { name, timestamp: Number(timestampPart) };
    })
    .filter((entry) => Number.isFinite(entry.timestamp) && entry.timestamp >= sinceMs)
    .sort((a, b) => b.timestamp - a.timestamp);

  for (const candidate of candidates) {
    const raw = await readFile(path.join(DEV_INBOX_DIR, candidate.name), "utf-8");
    const email = JSON.parse(raw) as DevEmail;
    if (email.to.toLowerCase() === to.toLowerCase()) {
      return email;
    }
  }
  return null;
}
