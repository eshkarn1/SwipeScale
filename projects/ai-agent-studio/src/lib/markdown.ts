/**
 * A small, constrained markdown-to-AST parser for `AgentSection.body`.
 *
 * The content is our own repo (`.claude/agents/*.md`, generated verbatim
 * into `agents.generated.ts`) so it is trusted, but `dangerouslySetInnerHTML`
 * still buys nothing here and risks silent layout breakage on malformed
 * input. This parser instead produces a typed block/inline AST that
 * `MarkdownBody` (owned by ui-builder) renders as real React elements.
 *
 * Supported, matching what the data actually contains: `###` / `##`
 * headings, paragraphs, `-`/`*` bullet lists, GitHub-style pipe tables, and
 * inline `` `code` `` / `**bold**` spans. Nothing else is attempted —
 * anything unrecognised degrades to a plain paragraph rather than throwing.
 */

export type InlineNode =
  | { type: 'text'; value: string }
  | { type: 'code'; value: string }
  | { type: 'bold'; value: string };

export type Block =
  | { type: 'heading'; level: 2 | 3 | 4; inline: InlineNode[] }
  | { type: 'paragraph'; inline: InlineNode[] }
  | { type: 'list'; ordered: boolean; items: InlineNode[][] }
  | { type: 'table'; header: InlineNode[][]; rows: InlineNode[][][] };

/** Split a line of text into inline text / `code` / **bold** runs. */
export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  // Order matters: code spans first so `**` inside backticks isn't touched.
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    if (match[1]) {
      nodes.push({ type: 'code', value: match[1].slice(1, -1) });
    } else if (match[2]) {
      nodes.push({ type: 'bold', value: match[2].slice(2, -2) });
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    nodes.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return nodes.length > 0 ? nodes : [{ type: 'text', value: text }];
}

function isTableSeparator(line: string): boolean {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c.trim()));
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\||\|$/g, '');
  return trimmed.split('|');
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i++;
      continue;
    }

    const headingMatch = /^(#{2,4})\s+(.*)$/.exec(line);
    if (headingMatch) {
      const level = Math.min(4, headingMatch[1].length) as 2 | 3 | 4;
      blocks.push({ type: 'heading', level, inline: parseInline(headingMatch[2].trim()) });
      i++;
      continue;
    }

    // Table: a row containing '|' immediately followed by a separator row.
    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = splitTableRow(line).map((c) => parseInline(c.trim()));
      i += 2;
      const rows: InlineNode[][][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(splitTableRow(lines[i]).map((c) => parseInline(c.trim())));
        i++;
      }
      blocks.push({ type: 'table', header, rows });
      continue;
    }

    // List: consecutive '-' or '*' bullet lines.
    const listItemMatch = /^\s*[-*]\s+(.*)$/.exec(line);
    if (listItemMatch) {
      const items: InlineNode[][] = [];
      while (i < lines.length) {
        const m = /^\s*[-*]\s+(.*)$/.exec(lines[i]);
        if (!m) break;
        items.push(parseInline(m[1].trim()));
        i++;
      }
      blocks.push({ type: 'list', ordered: false, items });
      continue;
    }

    // Paragraph: gather until a blank line or the start of another block.
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{2,4})\s+/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: 'paragraph', inline: parseInline(paraLines.join(' ')) });
  }

  return blocks;
}
