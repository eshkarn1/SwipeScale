#!/usr/bin/env node
/**
 * Contrast gate. Exits 1 on any regression.
 *
 *   node scripts/check-contrast.mjs
 *
 * Every colour is parsed out of app/globals.css at run time — none is restated
 * here. A contrast figure written into a comment is a figure nobody recomputes,
 * and this project has already shipped one that was wrong: a comment asserted
 * a colour met 3:1 when it measured 1.78:1, and every card border and input on
 * the site used it.
 *
 * Two floors, per WCAG 2.2:
 *   4.5:1  text (1.4.3)
 *   3.0:1  the visual boundary of a control, and large text (1.4.11, 1.4.3)
 *
 * Deliberately NOT checked, with reasons:
 *   - `--color-slate` as a border. It measures 1.46:1 and is used only for
 *     decorative rules, dividers and the timecode edge. 1.4.11 governs the
 *     boundary of *controls*; a horizontal rule is not one. Interactive
 *     boundaries use `--color-edge` instead, which is checked.
 *   - `.btn:disabled` borders. 1.4.11 explicitly exempts inactive controls,
 *     and the dimmer border is part of how disabled reads as disabled.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(ROOT, "app/globals.css"), "utf8");

/** Pull a custom property's hex value out of the real stylesheet. */
function token(name) {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`));
  if (!m) throw new Error(`token --${name} not found in globals.css`);
  return m[1].toUpperCase();
}

/** Pull a literal hex out of a named rule, e.g. the .field:hover border. */
function ruleHex(selector, prop) {
  const block = css.match(
    new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`),
  );
  if (!block) throw new Error(`rule ${selector} not found`);
  const m = block[1].match(new RegExp(`${prop}:\\s*(#[0-9A-Fa-f]{6})`));
  if (!m) throw new Error(`${prop} not found in ${selector}`);
  return m[1].toUpperCase();
}

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const VOID = token("color-void");
const GRAPHITE = token("color-graphite");
const BONE = token("color-bone");
const SIGNAL = token("color-signal");
const AMBER = token("color-amber");
const EDGE = token("color-edge");

const CHECKS = [
  // text
  ["body text", BONE, VOID, 4.5],
  ["body text on graphite", BONE, GRAPHITE, 4.5],
  ["timecode readout", AMBER, VOID, 4.5],
  ["field placeholder", ruleHex(".field::placeholder", "color"), VOID, 4.5],
  // control boundaries — 1.4.11
  ["button border", EDGE, VOID, 3.0],
  ["field border", EDGE, VOID, 3.0],
  ["field border, hover", ruleHex(".field:hover", "border-bottom-color"), VOID, 3.0],
  ["field border, focus", SIGNAL, VOID, 3.0],
  ["focus ring", SIGNAL, VOID, 3.0],
  ["emphasised pricing card", SIGNAL, VOID, 3.0],
];

let failed = 0;
console.log(`${"what".padEnd(26)} ${"fg".padEnd(8)} ${"bg".padEnd(8)} ${"ratio".padStart(7)}  floor`);
console.log("-".repeat(62));
for (const [what, fg, bg, floor] of CHECKS) {
  const ratio = contrast(fg, bg);
  const ok = ratio >= floor;
  if (!ok) failed += 1;
  console.log(
    `${what.padEnd(26)} ${fg.padEnd(8)} ${bg.padEnd(8)} ${ratio.toFixed(2).padStart(6)}:1  ${floor}` +
      (ok ? "" : "   <-- FAIL"),
  );
}

console.log();
if (failed) {
  console.error(`FAIL  ${failed} pair(s) below floor.`);
  process.exit(1);
}
console.log(`PASS  ${CHECKS.length} pairs checked, all clear.`);
