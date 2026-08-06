import { expect, test } from "@playwright/test";

import { waitForEmail } from "./support/dev-inbox";

/**
 * BUILD_SPEC §7 M1 acceptance test, verbatim: "A Playwright test signs up,
 * invites a second user, and that second user CANNOT reach the first
 * workspace's URL."
 *
 * Deliberately does NOT have the second user accept the invite — an
 * accepted invite legitimately grants access, so that would prove nothing.
 * The point of this test is that being *invited* (an `Invite` row exists,
 * addressed to this exact email) is not the same as being a *member*, and
 * that a second, real, separately-authenticated user has zero access to a
 * workspace's URL until they actually accept.
 */
test("an invited-but-not-accepted user cannot reach the inviting workspace", async ({
  page,
  browser,
}) => {
  const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const ownerEmail = `owner-${runId}@e2e.lightline.invalid`;
  const inviteeEmail = `invitee-${runId}@e2e.lightline.invalid`;
  const workspaceName = `Acme Realty ${runId}`;

  // ---- User A signs up via magic link ----
  await page.goto("/login");
  await page.getByLabel("Email").fill(ownerEmail);
  const beforeOwnerLink = Date.now();
  await page.getByRole("button", { name: "Send magic link" }).click();
  await expect(page).toHaveURL(/\/verify/);

  const ownerEmailMsg = await waitForEmail(ownerEmail, beforeOwnerLink);
  expect(ownerEmailMsg.url).toBeTruthy();
  await page.goto(ownerEmailMsg.url as string);

  // Zero memberships -> onboarding.
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("Workspace name").fill(workspaceName);
  await page.getByRole("button", { name: "Create workspace" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  const slugA = new URL(page.url()).pathname.split("/")[1];
  expect(slugA).toBeTruthy();
  await expect(page.getByRole("heading", { name: workspaceName })).toBeVisible();

  // ---- User A invites User B ----
  await page.goto(`/${slugA}/settings/team`);
  await page.getByPlaceholder("teammate@company.com").fill(inviteeEmail);
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText(`Invite sent to ${inviteeEmail}.`)).toBeVisible();

  // ---- User B signs up separately, in a fresh browser context (own
  // cookies/session) — and never visits the invite link. ----
  const inviteeContext = await browser.newContext();
  const inviteePage = await inviteeContext.newPage();

  await inviteePage.goto("/login");
  await inviteePage.getByLabel("Email").fill(inviteeEmail);
  const beforeInviteeLink = Date.now();
  await inviteePage.getByRole("button", { name: "Send magic link" }).click();
  await expect(inviteePage).toHaveURL(/\/verify/);

  // `beforeInviteeLink` is after the invite email was sent above, so this
  // correctly picks up User B's own sign-in email, not the invite.
  const inviteeMsg = await waitForEmail(inviteeEmail, beforeInviteeLink);
  await inviteePage.goto(inviteeMsg.url as string);

  // User B is now authenticated with zero memberships. Attempt to reach
  // Workspace A's URL directly.
  const response = await inviteePage.goto(`/${slugA}/dashboard`);
  expect(response?.status()).toBe(404);
  await expect(
    inviteePage.getByRole("heading", { name: workspaceName }),
  ).not.toBeVisible();

  await inviteeContext.close();
});
