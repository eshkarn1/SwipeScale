#!/usr/bin/env node
/**
 * Contrast check for the design tokens.
 *
 * Exists because a comment in globals.css claimed --color-edge met WCAG SC
 * 1.4.11 (>=3:1 for UI component boundaries) when it actually measured 1.78:1.
 * A documented ratio nobody recomputes is a ratio that drifts, so this reads
 * the real values out of globals.css and fails the build if any pair regresses.
 *
 *   npm run check:contrast
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const cssPath = join(here, '..', 'src', 'app', 'globals.css');

/** Pull `--name: #hex;` declarations out of the stylesheet. */
function readTokens(css) {
  const tokens = {};
  const re = /--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g;
  let match;
  while ((match = re.exec(css)) !== null) {
    tokens[match[1]] = match[2].toLowerCase();
  }
  return tokens;
}

const toLinear = (channel) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

function luminance(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrast(a, b) {
  const [la, lb] = [luminance(a), luminance(b)];
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const css = readFileSync(cssPath, 'utf8');
const t = readTokens(css);

// Pure black is a real surface here — the hero and the graph canvas sit on it.
const BLACK = '#000000';

/**
 * [label, foreground token, background token or literal, required ratio]
 * 4.5 = SC 1.4.3 normal text. 3.0 = SC 1.4.11 non-text / SC 1.4.3 large text.
 */
const PAIRS = [
  ['text on void', 'color-text', 'color-void', 4.5],
  ['text on black', 'color-text', BLACK, 4.5],
  ['text-muted on void', 'color-text-muted', 'color-void', 4.5],
  ['text-muted on surface', 'color-text-muted', 'color-surface', 4.5],
  ['text-muted on raised', 'color-text-muted', 'color-raised', 4.5],
  ['text-muted on black', 'color-text-muted', BLACK, 4.5],
  ['text-faint on void', 'color-text-faint', 'color-void', 3.0],
  ['text-faint on surface', 'color-text-faint', 'color-surface', 3.0],
  ['accent on void', 'color-accent', 'color-void', 4.5],
  ['accent on black', 'color-accent', BLACK, 4.5],
  ['accent on surface', 'color-accent', 'color-surface', 4.5],
  ['accent-ink on accent', 'color-accent-ink', 'color-accent', 4.5],
  ['edge on void', 'color-edge', 'color-void', 3.0],
  ['edge on surface', 'color-edge', 'color-surface', 3.0],
  ['edge on raised', 'color-edge', 'color-raised', 3.0],
];

const resolve = (v) => (v.startsWith('#') ? v : t[v]);

let failures = 0;
const rows = [];

for (const [label, fgKey, bgKey, need] of PAIRS) {
  const fg = resolve(fgKey);
  const bg = resolve(bgKey);

  if (!fg || !bg) {
    rows.push([label, '—', need, 'MISSING TOKEN']);
    failures += 1;
    continue;
  }

  const ratio = contrast(fg, bg);
  const pass = ratio >= need;
  if (!pass) failures += 1;
  rows.push([label, `${ratio.toFixed(2)}:1`, need, pass ? 'pass' : 'FAIL']);
}

const width = Math.max(...rows.map((r) => r[0].length));
console.log(`\n  ${'pair'.padEnd(width)}  ${'ratio'.padStart(8)}  need  result`);
console.log(`  ${'-'.repeat(width + 24)}`);
for (const [label, ratio, need, result] of rows) {
  console.log(
    `  ${label.padEnd(width)}  ${String(ratio).padStart(8)}  ${String(need).padStart(4)}  ${result}`,
  );
}
console.log(`  ${'-'.repeat(width + 24)}`);

if (failures > 0) {
  console.error(`\n  ${failures} contrast failure(s). Fix the token or the pairing.\n`);
  process.exit(1);
}

console.log(`\n  All ${rows.length} pairs pass.\n`);
