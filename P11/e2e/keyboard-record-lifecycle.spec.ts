import { expect, test, type Page } from "@playwright/test";

import { waitForEmail } from "./support/dev-inbox";
import {
  focusInfo,
  pressUntil,
  selectAllAndType,
  tabUntil,
} from "./support/keyboard";

/**
 * BUILD_SPEC §7 M2 acceptance test, verbatim: "a record can be created,
 * edited inline, deleted, and restored entirely by keyboard."
 *
 * The previous M2 pass explicitly did NOT verify this and assumed Radix
 * supplied it (DECISIONS §10). It does not: Radix supplies the menu and the
 * dialog, but the record grid's cell-to-cell navigation, its Enter/Escape
 * edit semantics, and — the part that actually breaks — focus surviving the
 * re-render after a mutation are all ours.
 *
 * ── THE RULE THIS FILE FOLLOWS ────────────────────────────────────────────
 * After sign-in, the lifecycle phase calls NO mouse or shortcut API: no
 * `click`, `fill`, `hover`, `tap`, `selectOption`, and no `locator.press`
 * that would focus an element implicitly. Every step is `page.keyboard`
 * plus a read of `document.activeElement`. A test that clicks its way to
 * each control would pass against a grid that is completely unusable
 * without a mouse.
 *
 * Sign-up and workspace creation are setup, not the thing under test, and
 * do use `fill`/`click` — called out here so the boundary is explicit.
 */

async function signUpAndCreateWorkspace(page: Page, runId: string) {
  const ownerEmail = `kb-owner-${runId}@e2e.lightline.invalid`;
  const workspaceName = `Keyboard QA ${runId}`;

  await page.goto("/login");
  await page.getByLabel("Email").fill(ownerEmail);
  const sentAt = Date.now();
  await page.getByRole("button", { name: "Send magic link" }).click();
  await expect(page).toHaveURL(/\/verify/);

  const email = await waitForEmail(ownerEmail, sentAt);
  await page.goto(email.url as string);

  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("Workspace name").fill(workspaceName);
  await page.getByRole("button", { name: "Create workspace" }).click();

  // Onboarding redirects to `/{slug}`, which is itself a Server Component
  // that redirects again to `/{slug}/dashboard`. Waiting on the second hop
  // means waiting for the dashboard route to compile, which this test does
  // not need — it only needs the slug.
  await page.waitForURL((url) => !url.pathname.startsWith("/onboarding"));

  const slug = new URL(page.url()).pathname.split("/")[1];
  expect(slug).toBeTruthy();
  return slug as string;
}

test("a company can be created, edited inline, deleted and restored entirely by keyboard", async ({
  page,
}) => {
  const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const slug = await signUpAndCreateWorkspace(page, runId);

  // Sorts first in the default `name:asc` ordering, so the record under test
  // is deterministically row 0 regardless of what else exists.
  const originalName = `AAA Keyboard ${runId}`;
  const editedName = `AAA Renamed ${runId}`;

  await page.goto(`/${slug}/companies`);
  // `exact` matters: Playwright matches an accessible name as a
  // case-insensitive substring by default, and "Companies" also matches the
  // empty state's "No companies yet" heading.
  await expect(
    page.getByRole("heading", { level: 1, name: "Companies", exact: true }),
  ).toBeVisible();

  // ── CREATE ──────────────────────────────────────────────────────────────
  // Start from the top of the document so the tab walk is the real one.
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });

  await tabUntil(page, (info) => info.label === "New company", {
    description: 'the "New company" button',
  });
  await page.keyboard.press("Enter");

  // The Sheet autofocuses its first field; Radix traps focus while open.
  const nameField = await focusInfo(page);
  expect(nameField.tag).toBe("input");

  await page.keyboard.type(originalName);
  // Implicit form submission: the form has a single type="submit" button.
  await page.keyboard.press("Enter");

  const nameCell = page.getByRole("button", {
    name: `Edit Name for ${originalName}`,
  });
  await expect(nameCell).toBeVisible();

  // ── EDIT INLINE ─────────────────────────────────────────────────────────
  // Radix returns focus to the trigger when the Sheet closes, so this walks
  // forward from there through the whole toolbar into the grid.
  await tabUntil(
    page,
    (info) => info.label === `Edit Name for ${originalName}`,
    { description: "the Name cell of the new row" },
  );

  const beforeEdit = await focusInfo(page);
  expect(beforeEdit.cell).toBe("0:1");

  // Enter opens the editor in place.
  await page.keyboard.press("Enter");
  const editor = await focusInfo(page);
  expect(editor.tag).toBe("input");

  // Escape must cancel without writing.
  await selectAllAndType(page, "discard me");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: `Edit Name for ${originalName}` }),
  ).toBeVisible();

  // Focus has to come back to the cell it left, or the next keystroke goes
  // to the document and the grid is dead.
  const afterEscape = await focusInfo(page);
  expect(afterEscape.cell).toBe("0:1");
  expect(afterEscape.tag).toBe("button");

  // Enter again, edit for real, Enter to commit.
  await page.keyboard.press("Enter");
  await selectAllAndType(page, editedName);
  await page.keyboard.press("Enter");

  await expect(
    page.getByRole("button", { name: `Edit Name for ${editedName}` }),
  ).toBeVisible();

  // THE REGRESSION THIS TEST EXISTS FOR: the commit unmounts the <input>,
  // the server action revalidates, and the row data is replaced. Focus must
  // still be on the cell afterwards.
  await expect
    .poll(async () => (await focusInfo(page)).cell, {
      message: "focus should return to the edited cell after the mutation",
    })
    .toBe("0:1");
  expect((await focusInfo(page)).tag).toBe("button");

  // ── DELETE ──────────────────────────────────────────────────────────────
  // End moves to the last column of the row: the actions menu.
  await page.keyboard.press("End");
  const actionsCell = await focusInfo(page);
  expect(actionsCell.label).toBe(`Actions for ${editedName}`);

  await page.keyboard.press("Enter");
  await pressUntil(page, "ArrowDown", (info) => info.text === "Delete", {
    description: 'the "Delete" menu item',
  });
  await page.keyboard.press("Enter");

  await expect(
    page.getByRole("button", { name: `Edit Name for ${editedName}` }),
  ).toBeHidden();

  // ── RESTORE ─────────────────────────────────────────────────────────────
  // The trash is a filter on the same list, reached by keyboard like
  // everything else.
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
  });
  await tabUntil(page, (info) => info.label === "Trash", {
    description: "the Trash toggle",
  });
  await page.keyboard.press("Enter");

  // Soft-deleted rows are read-only, so the Name cell is a plain label here
  // rather than an "Edit …" button.
  const deletedCell = page.getByRole("button", {
    name: `Name for ${editedName}`,
  });
  await expect(deletedCell).toBeVisible();

  // The grid is a roving-tabindex widget: ONE tab stop, and it remembers the
  // cell you last used rather than resetting to the first column. So tab in
  // to whichever cell currently holds the stop, then move with arrows —
  // tabbing towards a specific cell would be asserting the opposite of the
  // ARIA grid pattern this implements.
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
  });
  await tabUntil(page, (info) => info.cell !== null, {
    description: "any cell of the record grid",
  });

  await page.keyboard.press("End");
  expect((await focusInfo(page)).label).toBe(`Actions for ${editedName}`);

  await page.keyboard.press("Enter");
  await pressUntil(page, "ArrowDown", (info) => info.text === "Restore", {
    description: 'the "Restore" menu item',
  });
  await page.keyboard.press("Enter");

  await expect(deletedCell).toBeHidden();

  // Back to the live list: the record is there, editable again.
  await page.goto(`/${slug}/companies`);
  await expect(
    page.getByRole("button", { name: `Edit Name for ${editedName}` }),
  ).toBeVisible();
});

test("the command palette opens with the keyboard and navigates to a record", async ({
  page,
}) => {
  const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const slug = await signUpAndCreateWorkspace(page, runId);
  const companyName = `Palette Target ${runId}`;

  // One record to find. Created through the UI by keyboard, same as above.
  await page.goto(`/${slug}/companies`);
  await tabUntil(page, (info) => info.label === "New company", {
    description: 'the "New company" button',
  });
  await page.keyboard.press("Enter");
  await page.keyboard.type(companyName);
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: `Edit Name for ${companyName}` }),
  ).toBeVisible();

  // ⌘K from anywhere on the page.
  await page.keyboard.press("ControlOrMeta+k");

  const input = await focusInfo(page);
  expect(input.role).toBe("combobox");

  await page.keyboard.type("Palette Target");

  // The combobox keeps focus; the listbox cursor moves via
  // aria-activedescendant, so `document.activeElement` stays the input.
  const option = page.getByRole("option", { name: new RegExp(companyName) });
  await expect(option).toBeVisible();
  await expect
    .poll(async () => option.getAttribute("aria-selected"), {
      message: "the first result should be the active option",
    })
    .toBe("true");

  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(new RegExp(`/${slug}/companies/[a-z0-9]+`));
  await expect(page.getByRole("heading", { name: companyName })).toBeVisible();

  // The record detail's centre tabs (BUILD_SPEC §7 M2) are keyboard-operable:
  // Radix Tabs gives the list one tab stop and arrow keys move between them.
  await tabUntil(page, (info) => info.text === "Overview", {
    description: "the Overview tab",
  });

  // Polled, not read once: activation is automatic, so each arrow both moves
  // focus and swaps the panel, and the focus move lands after React commits.
  for (const label of ["Activity", "Deals", "Files"]) {
    await page.keyboard.press("ArrowRight");
    await expect
      .poll(async () => (await focusInfo(page)).text, {
        message: `arrowing right should focus the "${label}" tab`,
      })
      .toBe(label);
  }

  // And the panel actually changed with it — Files is the last one focused.
  await expect(
    page.getByRole("heading", { name: "No files yet" }),
  ).toBeVisible();
});
