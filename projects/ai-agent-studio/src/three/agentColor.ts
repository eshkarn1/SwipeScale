import { Color } from 'three';

/**
 * Reads an agent accent colour straight from the CSS tokens
 * (`src/styles/tokens.css`) rather than duplicating the palette as a second
 * hardcoded JS table — one source of truth for colour, per the brand
 * requirement that rebranding stays a one-file change.
 */
const cache = new Map<string, string>();

function readCssVar(name: string): string {
  const cached = cache.get(name);
  if (cached) return cached;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  cache.set(name, value);
  return value;
}

/** The eight literal colour names `agent.color` can hold. Guards the lookup
 * below against ever building an unknown/untrusted CSS variable name. */
const KNOWN_COLORS = new Set([
  'purple',
  'orange',
  'green',
  'red',
  'yellow',
  'blue',
  'pink',
  'cyan',
]);

export function getAgentColorHex(colorName: string): string {
  const safe = KNOWN_COLORS.has(colorName) ? colorName : 'purple';
  return readCssVar(`--agent-${safe}-accent`);
}

export function getAgentColor(colorName: string): Color {
  return new Color(getAgentColorHex(colorName));
}
