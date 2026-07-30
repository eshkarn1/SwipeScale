#!/usr/bin/env node
/**
 * build-agent-data.mjs
 *
 * Build-time content pipeline for the AI Agent Studio.
 *
 * Reads the eight real agent definition files from `.claude/agents/*.md` at
 * the repo root, parses their YAML frontmatter and markdown bodies with a
 * small hand-rolled parser (no YAML dependency — the frontmatter here is a
 * handful of scalar keys and one block list, well within reach of a
 * deterministic hand parser), and emits:
 *
 *   - src/data/agents.generated.ts  (TypeScript module, committed)
 *   - src/data/agents.json          (same data, for non-TS tooling)
 *
 * Every emitted field is either verbatim from a source file or a pure
 * derivation documented inline. Nothing is invented. If a source file is
 * missing a key, absent it as null/[] rather than fabricating a value.
 *
 * This script fails loudly: a missing file, an unparsable frontmatter block,
 * an unknown delegation target, an unclassifiable tool name, or fewer than
 * eight parsed agents all cause a clear message and a non-zero exit. A
 * generator that silently emits partial data is worse than one that crashes.
 *
 * Run: node scripts/build-agent-data.mjs
 */

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

// Resolved relative to this script's own location, not process.cwd(), so it
// works regardless of where it is invoked from.
const SOURCE_DIR = path.resolve(SCRIPT_DIR, '..', '..', '..', '.claude', 'agents');
const DATA_DIR = path.resolve(SCRIPT_DIR, '..', 'src', 'data');

const AGENT_IDS = [
  'team-lead',
  'critic',
  'frontend-dev',
  'ui-builder',
  'motion-designer',
  'backend-dev',
  'graphics-designer',
  'threed-artist',
];
const AGENT_ID_SET = new Set(AGENT_IDS);

const TITLES = {
  'team-lead': 'Orchestrator',
  critic: 'Reviewer & Gate',
  'frontend-dev': 'Frontend & 3D Engineer',
  'ui-builder': 'Interface Engineer',
  'motion-designer': 'Motion Engineer',
  'backend-dev': 'Backend Engineer',
  'graphics-designer': '2D Artist',
  'threed-artist': '3D Artist',
};

/** Tool name -> ToolKind. Extend this if a new tool name shows up in a source file. */
const TOOL_KIND_MAP = {
  Read: 'read',
  Grep: 'read',
  Glob: 'read',
  Write: 'write',
  Edit: 'write',
  NotebookEdit: 'write',
  Bash: 'exec',
  Agent: 'delegate',
  WebSearch: 'web',
  WebFetch: 'web',
  Skill: 'skill',
  TodoWrite: 'plan',
  ExitPlanMode: 'plan',
};

function fail(message) {
  console.error(`\n[build-agent-data] FATAL: ${message}\n`);
  process.exit(1);
}

/** Depth-aware split on top-level commas — does not split inside `(...)`. */
function splitTopLevel(str) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of str) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

/** Parse the frontmatter block (between the two `---` fences) into a plain object. */
function parseFrontmatter(block, filePath) {
  const lines = block.split('\n');
  const result = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i++;
      continue;
    }
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) {
      fail(`${filePath}: could not parse frontmatter line ${i + 1}: ${JSON.stringify(line)}`);
    }
    const key = m[1];
    const inlineValue = m[2];
    if (inlineValue.trim() === '') {
      // Possibly a YAML block list: subsequent lines of the form "  - item".
      const items = [];
      let j = i + 1;
      while (j < lines.length && /^\s*-\s+/.test(lines[j])) {
        items.push(lines[j].replace(/^\s*-\s+/, '').trim());
        j++;
      }
      if (items.length > 0) {
        result[key] = items;
        i = j;
      } else {
        result[key] = null;
        i++;
      }
    } else {
      result[key] = inlineValue.trim();
      i++;
    }
  }
  return result;
}

/** Parse the `tools` frontmatter string into an array of AgentTool. */
function parseTools(toolsStr, filePath) {
  const entries = splitTopLevel(toolsStr);
  return entries.map((raw) => {
    const m = raw.match(/^([A-Za-z0-9_]+)\((.*)\)$/s);
    let name;
    let targets;
    if (m) {
      name = m[1];
      const targetNames = splitTopLevel(m[2]);
      targets = targetNames.map((t) => {
        if (!AGENT_ID_SET.has(t)) {
          fail(
            `${filePath}: delegation target "${t}" in tool entry "${raw}" is not one of the eight known agent ids.`
          );
        }
        return t;
      });
    } else {
      name = raw.trim();
    }

    let kind;
    if (name.startsWith('mcp__')) {
      kind = 'mcp';
    } else if (Object.prototype.hasOwnProperty.call(TOOL_KIND_MAP, name)) {
      kind = TOOL_KIND_MAP[name];
    } else {
      fail(
        `${filePath}: tool name "${name}" (from entry "${raw}") has no known ToolKind classification. Add it to TOOL_KIND_MAP in build-agent-data.mjs.`
      );
    }

    const tool = { raw, name, kind };
    // Only Agent(...) entries carry a target list; a bare "Agent" (no
    // parens, used by graphics-designer/threed-artist for their critic
    // approval loop) must NOT get a phantom empty targets array.
    if (name === 'Agent' && targets && targets.length > 0) {
      tool.targets = targets;
    }
    return tool;
  });
}

/** Split a markdown body into the leading summary paragraph and its `## ` sections. */
function parseBody(bodyRaw) {
  const trimmed = bodyRaw.trim();
  const blankIdx = trimmed.indexOf('\n\n');
  const summary = (blankIdx === -1 ? trimmed : trimmed.slice(0, blankIdx)).trim();

  const lines = trimmed.split('\n');
  const sections = [];
  let current = null;
  for (const line of lines) {
    const headingMatch = line.match(/^## (.*)$/);
    if (headingMatch) {
      if (current) {
        sections.push({ heading: current.heading, body: current.lines.join('\n').trim() });
      }
      current = { heading: headingMatch[1].trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
    // Lines before the first '## ' heading belong to the preamble
    // (captured by `summary` above), not to any section.
  }
  if (current) {
    sections.push({ heading: current.heading, body: current.lines.join('\n').trim() });
  }
  return { summary, sections };
}

function parseAgentFile(id) {
  const filePath = path.join(SOURCE_DIR, `${id}.md`);
  if (!fs.existsSync(filePath)) {
    fail(`expected source file for agent "${id}" at ${filePath}, but it does not exist.`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!fmMatch) {
    fail(`${filePath}: could not find a well-formed YAML frontmatter block (--- ... ---).`);
  }
  const [, frontmatterBlock, bodyRaw] = fmMatch;
  const fm = parseFrontmatter(frontmatterBlock, filePath);

  for (const required of ['name', 'description', 'tools', 'model', 'color']) {
    if (!fm[required]) {
      fail(`${filePath}: required frontmatter key "${required}" is missing or empty.`);
    }
  }
  if (fm.name !== id) {
    fail(`${filePath}: frontmatter name "${fm.name}" does not match expected agent id "${id}".`);
  }

  const tools = parseTools(fm.tools, filePath);
  const canEditFiles = tools.some((t) => t.name === 'Write' || t.name === 'Edit');
  const delegatesTo = Array.from(
    new Set(tools.filter((t) => t.name === 'Agent' && t.targets).flatMap((t) => t.targets))
  );

  const seenKinds = new Set();
  const capabilities = [];
  for (const t of tools) {
    if (!seenKinds.has(t.kind)) {
      seenKinds.add(t.kind);
      capabilities.push(t.kind);
    }
  }

  const { summary, sections } = parseBody(bodyRaw);
  if (!summary) {
    fail(`${filePath}: could not extract a non-empty summary paragraph from the markdown body.`);
  }
  if (sections.length === 0) {
    fail(`${filePath}: found zero "## " sections in the markdown body.`);
  }

  let skills = [];
  if (Array.isArray(fm.skills)) {
    skills = fm.skills;
  } else if (typeof fm.skills === 'string') {
    skills = fm.skills.split(',').map((s) => s.trim()).filter(Boolean);
  }

  let mcpServers = [];
  if (Array.isArray(fm.mcpServers)) {
    mcpServers = fm.mcpServers;
  } else if (typeof fm.mcpServers === 'string') {
    mcpServers = fm.mcpServers.split(',').map((s) => s.trim()).filter(Boolean);
  }

  return {
    id,
    name: fm.name,
    title: TITLES[id],
    description: fm.description,
    model: fm.model,
    color: fm.color,
    effort: fm.effort ?? null,
    permissionMode: fm.permissionMode ?? null,
    memory: fm.memory ?? null,
    skills,
    mcpServers,
    tools,
    canEditFiles,
    delegatesTo,
    summary,
    capabilities,
    sections,
    sourceFile: `.claude/agents/${id}.md`,
  };
}

function labelFor(from, to) {
  const LABELS = {
    'team-lead->critic': 'gate: every deliverable is sent to critic for review',
    'team-lead->frontend-dev': 'delegates the frontend: R3F canvas and app architecture',
    'team-lead->backend-dev': 'delegates the backend: APIs, data, persistence',
    'team-lead->graphics-designer': 'delegates 2D asset production',
    'team-lead->threed-artist': 'delegates 3D asset production',
    'frontend-dev->ui-builder': 'delegates the DOM UI layer',
    'frontend-dev->motion-designer': 'delegates DOM animation',
  };
  const key = `${from}->${to}`;
  if (!LABELS[key]) {
    fail(`no edge label defined for delegation ${key}. Add one to labelFor() in build-agent-data.mjs.`);
  }
  return LABELS[key];
}

function buildTeams(agentsById) {
  const edges = [];

  // Delegation edges, derived programmatically from each agent's own
  // Agent(...) targets so they cannot drift from the source frontmatter.
  for (const id of AGENT_IDS) {
    for (const target of agentsById[id].delegatesTo) {
      edges.push({ from: id, to: target, kind: 'delegates', label: labelFor(id, target) });
    }
  }

  // Approval edges are not expressible in frontmatter (graphics-designer and
  // threed-artist carry a bare `Agent` tool with no parenthesised target —
  // see the "Make sure your parser handles Agent with no parens" note).
  // They are declared explicitly here, each citing the section of the
  // source file that documents the loop:
  //   - graphics-designer.md, "## Approval loop — required": "Every asset
  //     must be approved by the critic before you report it as done."
  //   - threed-artist.md, "## Approval loop — required": "Every model must
  //     be approved by the critic before you report it done."
  edges.push({
    from: 'graphics-designer',
    to: 'critic',
    kind: 'approves',
    label: 'submits every 2D asset for approval before reporting it done',
  });
  edges.push({
    from: 'threed-artist',
    to: 'critic',
    kind: 'approves',
    label: 'submits every 3D model for approval before reporting it done',
  });

  const team = {
    id: 'studio-core',
    name: 'Studio Core',
    lead: 'team-lead',
    members: [...AGENT_IDS],
    edges,
    description:
      "The studio's real first team: the eight agents that planned, built, and " +
      'reviewed this very site, from orchestration and review through frontend, ' +
      'backend, and 2D/3D asset production.',
  };

  return [team];
}

function tsStringOf(value) {
  return JSON.stringify(value, null, 2);
}

function main() {
  const agents = AGENT_IDS.map((id) => parseAgentFile(id));

  if (agents.length !== 8) {
    fail(`expected exactly 8 parsed agents, got ${agents.length}.`);
  }
  agents.forEach((a, i) => {
    if (a.id !== AGENT_IDS[i]) {
      fail(`agent order drifted: position ${i} is "${a.id}", expected "${AGENT_IDS[i]}".`);
    }
  });

  const agentsById = {};
  for (const a of agents) {
    agentsById[a.id] = a;
  }

  const teams = buildTeams(agentsById);

  // Sanity-check every edge endpoint is a known agent id.
  for (const team of teams) {
    for (const edge of team.edges) {
      if (!AGENT_ID_SET.has(edge.from) || !AGENT_ID_SET.has(edge.to)) {
        fail(`team "${team.id}" has an edge with an unknown endpoint: ${JSON.stringify(edge)}`);
      }
    }
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });

  const jsonPath = path.join(DATA_DIR, 'agents.json');
  const jsonOutput = JSON.stringify({ agents, teams, agentsById }, null, 2) + '\n';
  fs.writeFileSync(jsonPath, jsonOutput);

  const tsPath = path.join(DATA_DIR, 'agents.generated.ts');
  const tsOutput =
    '/**\n' +
    ' * GENERATED FILE — do not hand-edit.\n' +
    ' *\n' +
    ' * Produced by `scripts/build-agent-data.mjs` from the eight real agent\n' +
    ' * definition files at `.claude/agents/*.md`. Re-run that script to\n' +
    ' * regenerate this file after a source file changes:\n' +
    ' *\n' +
    ' *   node scripts/build-agent-data.mjs\n' +
    ' */\n' +
    "import type { Agent, Team, AgentId } from './types';\n" +
    '\n' +
    `export const agents: Agent[] = ${tsStringOf(agents)};\n` +
    '\n' +
    `export const teams: Team[] = ${tsStringOf(teams)};\n` +
    '\n' +
    `export const agentsById: Record<AgentId, Agent> = ${tsStringOf(agentsById)};\n`;
  fs.writeFileSync(tsPath, tsOutput);

  console.log(`[build-agent-data] wrote ${agents.length} agents, ${teams.length} team(s).`);
  console.log(`[build-agent-data] -> ${path.relative(process.cwd(), tsPath)}`);
  console.log(`[build-agent-data] -> ${path.relative(process.cwd(), jsonPath)}`);
}

main();
