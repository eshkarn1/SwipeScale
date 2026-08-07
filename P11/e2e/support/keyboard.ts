/**
 * Keyboard-only driving helpers.
 *
 * BUILD_SPEC §7 M2's acceptance criterion is "a record can be created,
 * edited inline, deleted, and restored entirely by keyboard". A test that
 * uses `locator.click()` to get to each control proves nothing about that —
 * it proves the control exists. So the lifecycle spec never calls `click`,
 * `fill`, `hover`, `tap` or `selectOption`; it presses keys and reads
 * `document.activeElement` back, which is the only way to show that every
 * step is actually *reachable* by keyboard.
 *
 * `tabUntil` is the load-bearing piece: it walks the real tab order one stop
 * at a time and fails with the full route it took, so a regression that
 * makes something unreachable reports where focus actually went instead of
 * timing out on a locator.
 */
import type { Page } from "@playwright/test";

export interface FocusInfo {
  tag: string;
  role: string | null;
  /** `aria-label`, or the trimmed text content when there is none. */
  label: string;
  text: string;
  /** The grid's `row:col` coordinate, when focus is inside the record grid. */
  cell: string | null;
  disabled: boolean;
}

export async function focusInfo(page: Page): Promise<FocusInfo> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    const empty: FocusInfo = {
      tag: "",
      role: null,
      label: "",
      text: "",
      cell: null,
      disabled: false,
    };
    if (!el || el === document.body) return empty;
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    return {
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute("role"),
      label: el.getAttribute("aria-label") ?? text,
      text,
      cell: el.getAttribute("data-grid-cell"),
      disabled: el.hasAttribute("disabled"),
    };
  }) as Promise<FocusInfo>;
}

export interface TabUntilOptions {
  /** Backwards, via Shift+Tab. */
  reverse?: boolean;
  /** Bounded so an unreachable target fails fast with a trail, not a hang. */
  maxTabs?: number;
  /** Describes the target in the failure message. */
  description: string;
}

export async function tabUntil(
  page: Page,
  predicate: (info: FocusInfo) => boolean,
  options: TabUntilOptions,
): Promise<FocusInfo> {
  const { reverse = false, maxTabs = 60, description } = options;
  const key = reverse ? "Shift+Tab" : "Tab";
  const trail: string[] = [];

  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press(key);
    const info = await focusInfo(page);
    trail.push(info.label || info.tag || "(nothing)");
    if (predicate(info)) return info;
  }

  throw new Error(
    `Never reached ${description} after ${maxTabs} ${key} presses. ` +
      `Focus went: ${trail.join(" -> ")}`,
  );
}

/**
 * Presses `key` until the focused element matches — used inside an open
 * Radix menu, where role locators are unusable because Radix marks the rest
 * of the page `aria-hidden` while the menu is open.
 */
export async function pressUntil(
  page: Page,
  key: string,
  predicate: (info: FocusInfo) => boolean,
  options: { maxPresses?: number; description: string },
): Promise<FocusInfo> {
  const { maxPresses = 12, description } = options;
  const trail: string[] = [];

  const current = await focusInfo(page);
  if (predicate(current)) return current;

  for (let i = 0; i < maxPresses; i++) {
    await page.keyboard.press(key);
    const info = await focusInfo(page);
    trail.push(info.label || info.tag || "(nothing)");
    if (predicate(info)) return info;
  }

  throw new Error(
    `Never reached ${description} after ${maxPresses} ${key} presses. ` +
      `Focus went: ${trail.join(" -> ")}`,
  );
}

/** Clears the focused text input the way a person would. */
export async function selectAllAndType(page: Page, value: string) {
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type(value);
}
