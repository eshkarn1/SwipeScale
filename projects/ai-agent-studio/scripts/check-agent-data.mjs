#!/usr/bin/env node
/**
 * check-agent-data.mjs
 *
 * Throwaway-but-kept verification script: imports the generated
 * src/data/agents.json and asserts the shape and invariants the content
 * pipeline promises. Run after `node scripts/build-agent-data.mjs`.
 *
 * Run: node scripts/check-agent-data.mjs
 */

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.resolve(SCRIPT_DIR, '..', 'src', 'data', 'agents.json');
const { agents, teams, agentsById } = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const CANONICAL_ORDER = [
  'team-lead',
  'critic',
  'frontend-dev',
  'ui-builder',
  'motion-designer',
  'backend-dev',
  'graphics-designer',
  'threed-artist',
];
const ID_SET = new Set(CANONICAL_ORDER);

let checks = 0;
function check(label, fn) {
  fn();
  checks++;
  console.log(`  ok  ${label}`);
}

console.log('Verifying src/data/agents.json ...');

check('exactly 8 agents', () => {
  assert.equal(agents.length, 8);
});

check('canonical id order', () => {
  assert.deepEqual(agents.map((a) => a.id), CANONICAL_ORDER);
});

check('every AgentId in every delegatesTo is one of the 8', () => {
  for (const a of agents) {
    for (const t of a.delegatesTo) {
      assert.ok(ID_SET.has(t), `${a.id}.delegatesTo contains unknown id "${t}"`);
    }
  }
});

check('every edge endpoint is one of the 8', () => {
  for (const team of teams) {
    for (const e of team.edges) {
      assert.ok(ID_SET.has(e.from), `edge.from "${e.from}" is not a known agent id`);
      assert.ok(ID_SET.has(e.to), `edge.to "${e.to}" is not a known agent id`);
    }
  }
});

check("team-lead.canEditFiles === false", () => {
  assert.equal(agentsById['team-lead'].canEditFiles, false);
});

check("critic.canEditFiles === true", () => {
  assert.equal(agentsById['critic'].canEditFiles, true);
});

check('team-lead.delegatesTo.length === 5', () => {
  assert.equal(agentsById['team-lead'].delegatesTo.length, 5);
});

check('frontend-dev.delegatesTo.length === 2', () => {
  assert.equal(agentsById['frontend-dev'].delegatesTo.length, 2);
});

check('exactly 9 edges (7 delegates + 2 approves)', () => {
  const all = teams.flatMap((t) => t.edges);
  assert.equal(all.length, 9);
  assert.equal(all.filter((e) => e.kind === 'delegates').length, 7);
  assert.equal(all.filter((e) => e.kind === 'approves').length, 2);
});

check('no agent has an empty summary', () => {
  for (const a of agents) {
    assert.ok(typeof a.summary === 'string' && a.summary.trim().length > 0, `${a.id} has empty summary`);
  }
});

check('every agent has at least one section', () => {
  for (const a of agents) {
    assert.ok(Array.isArray(a.sections) && a.sections.length > 0, `${a.id} has zero sections`);
  }
});

console.log(`\nAll ${checks} checks passed.`);
