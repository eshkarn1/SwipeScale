#!/usr/bin/env node
// Verification script — spec §11, as resolved for this project's manifest
// contract (see BRIEF-02-MOTION.md / 02-MOTION-SYSTEM.md §2, §7, §11).
//
// Run:
//   export PATH="$HOME/.nvm/versions/node/v24.16.0/bin:$PATH"
//   pnpm verify:seq
//
// Four checks, all must pass clean; exits non-zero on any failure.
//
//   1. No video anywhere shipped to the browser or referenced in source.
//   2. Every manifest is valid and complete against the frozen contract.
//   3. Frame counts on disk match the manifest — tiers against `frameCount`,
//      the hero's `mobileVariant` directory against `mobileVariant.frameCount`.
//   4. `poster.webp` is byte-identical to that sequence's `0960/frame_0001.webp`.
//
// --- §11 vs §7 resolution (read before "fixing" this script) ---
// §11's script as literally written iterates *every* subdirectory of a
// sequence and compares its file count to the single top-level `frameCount`.
// Applied here that would flag `public/seq/hero/0960-half/` (90 files) as a
// MISMATCH against hero's `frameCount` (180) — but §7 explicitly mandates a
// 90-frame decimated variant at that exact path. That is a genuine
// inconsistency between §7 and §11 in the spec, not a bug in the frames.
// Resolved the way §7 intends: ordinary tier directories are checked against
// `frameCount`; the `mobileVariant` directory (present only for hero) is
// checked separately against `mobileVariant.frameCount`. See CHECK 3 below.
//
// --- iCloud trap ---
// This Desktop is iCloud-synced; deleting and rewriting a frame directory
// races the sync daemon, which can restore a just-deleted file under a
// *conflict name* (`frame_0090 2.webp` beside `frame_0090.webp`). A loose
// glob like `frame_*.webp` would silently count those stale forks as real
// frames. Every count in this script matches the STRICT pattern
// `^frame_\d{4}\.webp$` only, and anything else found in a sequence
// directory is reported by name as its own failure, never folded into a
// frame count or a byte total.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SEQ_DIR = path.join(ROOT, "public", "seq");
const SOURCE_DIRS = ["app", "components", "public", "lib", "scripts"];

const FRAME_RE = /^frame_\d{4}\.webp$/;
const VIDEO_RE = /<video|\.mp4|\.webm|\.gif/i;

// Resolved path of this file, so the detector can skip itself. See CHECK 1.
const SELF = fileURLToPath(import.meta.url);
const SOURCE_EXT_RE = /\.(tsx|ts|jsx|js|mjs|cjs|css)$/;

const REQUIRED_KEYS = [
  "id",
  "mode",
  "frameCount",
  "fps",
  "aspect",
  "alt",
  "posterFrame",
  "posterPath",
  "tiers",
  "filePattern",
  "padding",
];

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`FAIL  ${msg}`);
};
const ok = (msg) => console.log(`OK    ${msg}`);
const info = (msg) => console.log(`      ${msg}`);

function walk(dir, results = []) {
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    // Never descend into build output, deps or VCS metadata — the check is
    // about what ships/what's referenced in source, not compiled artefacts.
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, results);
    } else {
      results.push(full);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// CHECK 1 — no video anywhere
// ---------------------------------------------------------------------------
console.log("\n=== 1. No video anywhere ===");
{
  let hits = 0;
  for (const dir of SOURCE_DIRS) {
    const files = walk(path.join(ROOT, dir)).filter((f) => {
      // public/seq/**/*.webp is the frame payload itself — not source, and
      // not video. Only inspect text-ish files plus anything directly under
      // public/ that isn't a frame asset (an accidental video sitting there
      // would still be caught since it wouldn't match .webp).
      if (f.startsWith(SEQ_DIR)) return f.endsWith(".webp") === false;
      return SOURCE_EXT_RE.test(f) || dir === "public";
    });
    for (const f of files) {
      // This file is the detector. It necessarily contains the very strings it
      // searches for (VIDEO_RE is literally `<video|.mp4|.webm|.gif`), so
      // scanning itself guarantees a hit and the script could never pass —
      // which matters, because §11 says all three checks must pass clean before
      // the script is done. §11's original bash form scanned app/, components/
      // and public/ only and never had this problem; it appeared when the check
      // was widened to the whole repo.
      //
      // Skipping only this one file, by resolved path, rather than excluding
      // scripts/ wholesale — a real <video> in some other script should still
      // fail the run.
      if (f === SELF) continue;

      let text;
      try {
        text = readFileSync(f, "utf8");
      } catch {
        continue; // binary file (e.g. a real image) — not a text reference
      }
      if (VIDEO_RE.test(text)) {
        fail(`video reference in ${path.relative(ROOT, f)}`);
        hits += 1;
      }
      if (/\.(mp4|webm|gif)$/i.test(f)) {
        fail(`video/gif file present: ${path.relative(ROOT, f)}`);
        hits += 1;
      }
    }
  }
  if (hits === 0) ok("no <video>, .mp4, .webm, .gif reference or file found");
}

// ---------------------------------------------------------------------------
// CHECK 2 — every manifest is valid and complete
// ---------------------------------------------------------------------------
console.log("\n=== 2. Manifests valid and complete ===");
const manifests = {}; // id -> parsed manifest
{
  if (!existsSync(SEQ_DIR)) {
    fail(`${SEQ_DIR} does not exist`);
  } else {
    const ids = readdirSync(SEQ_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();

    if (ids.length === 0) fail("no sequence directories under public/seq/");

    for (const id of ids) {
      const manifestPath = path.join(SEQ_DIR, id, "manifest.json");
      if (!existsSync(manifestPath)) {
        fail(`${id}: missing manifest.json`);
        continue;
      }
      let m;
      try {
        m = JSON.parse(readFileSync(manifestPath, "utf8"));
      } catch (e) {
        fail(`${id}: manifest.json is not valid JSON — ${e.message}`);
        continue;
      }

      const missing = REQUIRED_KEYS.filter((k) => m[k] === undefined);
      if (missing.length) {
        fail(`${id}: manifest missing keys: ${missing.join(", ")}`);
        continue;
      }

      if (!Array.isArray(m.tiers) || m.tiers.length === 0) {
        fail(`${id}: tiers must be a non-empty array`);
        continue;
      }
      const widths = m.tiers.map((t) => t.width);
      const ascending = widths.every((w, i) => i === 0 || w > widths[i - 1]);
      if (!ascending) {
        fail(`${id}: tiers are not ascending by width — got [${widths.join(", ")}]`);
      }

      if (m.mode !== "scrub" && m.mode !== "loop") {
        fail(`${id}: mode must be 'scrub' or 'loop', got '${m.mode}'`);
      }

      if (!(m.posterFrame >= 1 && m.posterFrame <= m.frameCount)) {
        fail(`${id}: posterFrame ${m.posterFrame} out of range 1..${m.frameCount}`);
      }

      if (id === "hero") {
        const mv = m.mobileVariant;
        if (!mv || typeof mv !== "object") {
          fail(`${id}: mobileVariant is required and missing`);
        } else {
          const mvMissing = ["width", "path", "frameCount", "step", "bytes"].filter(
            (k) => mv[k] === undefined
          );
          if (mvMissing.length) {
            fail(`${id}: mobileVariant missing keys: ${mvMissing.join(", ")}`);
          }
        }
      }

      manifests[id] = m;
      ok(`${id}: valid — ${m.frameCount} frames, ${m.tiers.length} tiers, mode=${m.mode}`);
    }
  }
}

// ---------------------------------------------------------------------------
// CHECK 3 — frame counts on disk match the manifest
// ---------------------------------------------------------------------------
console.log("\n=== 3. Frame counts match manifests ===");
{
  for (const [id, m] of Object.entries(manifests)) {
    const seqDir = path.join(SEQ_DIR, id);

    for (const tier of m.tiers) {
      const tierDir = path.join(seqDir, path.basename(tier.path));
      if (!existsSync(tierDir)) {
        fail(`${id}/${path.basename(tier.path)}: directory does not exist`);
        continue;
      }
      const entries = readdirSync(tierDir);
      const frames = entries.filter((f) => FRAME_RE.test(f));
      const stray = entries.filter((f) => !FRAME_RE.test(f));
      if (frames.length !== m.frameCount) {
        fail(
          `${id}/${path.basename(tier.path)}: ${frames.length} frames on disk vs frameCount ${m.frameCount}`
        );
      } else {
        ok(`${id}/${path.basename(tier.path)}: ${frames.length} frames matches frameCount`);
      }
      if (stray.length) {
        fail(
          `${id}/${path.basename(tier.path)}: ${stray.length} file(s) not matching ^frame_\\d{4}\\.webp$ — ${stray.join(", ")}`
        );
      }
    }

    // mobileVariant — checked against its OWN frameCount, never the parent's.
    // §11 as literally written would compare this directory to the parent
    // `frameCount` (180) and always report a false MISMATCH against its 90
    // real frames — see the header comment.
    if (m.mobileVariant) {
      const mvDir = path.join(seqDir, path.basename(m.mobileVariant.path));
      if (!existsSync(mvDir)) {
        fail(`${id}/${path.basename(m.mobileVariant.path)}: directory does not exist`);
      } else {
        const entries = readdirSync(mvDir);
        const frames = entries.filter((f) => FRAME_RE.test(f));
        const stray = entries.filter((f) => !FRAME_RE.test(f));
        if (frames.length !== m.mobileVariant.frameCount) {
          fail(
            `${id}/${path.basename(m.mobileVariant.path)}: ${frames.length} frames on disk vs mobileVariant.frameCount ${m.mobileVariant.frameCount}`
          );
        } else {
          ok(
            `${id}/${path.basename(m.mobileVariant.path)}: ${frames.length} frames matches mobileVariant.frameCount`
          );
        }
        if (stray.length) {
          fail(
            `${id}/${path.basename(m.mobileVariant.path)}: ${stray.length} file(s) not matching ^frame_\\d{4}\\.webp$ — ${stray.join(", ")}`
          );
        }
      }
    }

    // Anything else directly under the sequence dir that isn't a known tier,
    // the mobileVariant dir, manifest.json or poster.webp is unexpected.
    const known = new Set([
      "manifest.json",
      "poster.webp",
      ...m.tiers.map((t) => path.basename(t.path)),
      ...(m.mobileVariant ? [path.basename(m.mobileVariant.path)] : []),
    ]);
    const seqEntries = existsSync(seqDir) ? readdirSync(seqDir) : [];
    const unexpected = seqEntries.filter((e) => !known.has(e));
    if (unexpected.length) {
      fail(`${id}: unexpected entries in sequence directory: ${unexpected.join(", ")}`);
    }
  }
}

// ---------------------------------------------------------------------------
// CHECK 4 — poster.webp is byte-identical to 0960/frame_0001.webp
// ---------------------------------------------------------------------------
console.log("\n=== 4. Poster matches 0960/frame_0001.webp ===");
{
  const sha256 = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

  for (const id of Object.keys(manifests)) {
    const posterPath = path.join(SEQ_DIR, id, "poster.webp");
    const framePath = path.join(SEQ_DIR, id, "0960", "frame_0001.webp");
    if (!existsSync(posterPath)) {
      fail(`${id}: poster.webp does not exist`);
      continue;
    }
    if (!existsSync(framePath)) {
      fail(`${id}: reference frame 0960/frame_0001.webp does not exist`);
      continue;
    }
    const posterHash = sha256(posterPath);
    const frameHash = sha256(framePath);
    if (posterHash !== frameHash) {
      fail(`${id}: poster.webp is NOT byte-identical to 0960/frame_0001.webp`);
    } else {
      ok(`${id}: poster.webp byte-identical to 0960/frame_0001.webp (sha256 ${posterHash.slice(0, 12)}…)`);
    }
  }
}

// ---------------------------------------------------------------------------
// §7 transfer-budget report — recomputed every run, never trusted from a doc
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// CHECK 5 — declared `bytes` matches what is actually on disk
//
// Every tier shipped with `bytes: 0` as a placeholder. That is worse than a
// wrong number: §7 budgets the 1920 hero tier at <= 9.0 MB and each loop at
// <= 2.0 MB, and a manifest declaring 0 makes those budgets unverifiable by
// anyone reading the contract rather than the directory. Script 3 owns these
// files, so the manifest is the only place the engine can learn a tier's cost
// before fetching it.
//
// Tolerance is exact, not approximate — these are byte counts of files this
// repo owns, so any drift means the manifest and the frames disagree and one
// of them is stale.
// ---------------------------------------------------------------------------
console.log("\n=== 5. Declared bytes match disk ===");
{
  for (const [id, m] of Object.entries(manifests)) {
    const targets = [
      ...m.tiers.map((t) => ["tier " + t.width, t.path, t.bytes]),
      ...(m.mobileVariant
        ? [["mobileVariant", m.mobileVariant.path, m.mobileVariant.bytes]]
        : []),
    ];
    for (const [label, tierPath, declared] of targets) {
      const dir = path.join(SEQ_DIR, id, path.basename(tierPath));
      if (!existsSync(dir)) {
        fail(`${id} ${label}: directory ${tierPath} does not exist`);
        continue;
      }
      const actual = readdirSync(dir)
        .filter((f) => FRAME_RE.test(f))
        .reduce((a, f) => a + statSync(path.join(dir, f)).size, 0);

      if (declared === 0) {
        fail(`${id} ${label}: bytes is 0 — placeholder never populated (actual ${actual})`);
      } else if (declared !== actual) {
        fail(
          `${id} ${label}: bytes declared ${declared} but disk holds ${actual} ` +
            `(drift ${actual - declared})`,
        );
      } else {
        ok(`${id} ${label}: bytes ${actual} matches disk`);
      }
    }
  }
}

console.log("\n=== §7 transfer budgets (measured this run) ===");
{
  for (const [id, m] of Object.entries(manifests)) {
    const seqDir = path.join(SEQ_DIR, id);
    const report = (label, dir, expectedCount) => {
      if (!existsSync(dir)) return;
      const files = readdirSync(dir).filter((f) => FRAME_RE.test(f));
      const totalBytes = files.reduce((sum, f) => sum + statSync(path.join(dir, f)).size, 0);
      const avg = files.length ? totalBytes / files.length : 0;
      info(
        `${label.padEnd(24)} ${String(files.length).padStart(3)} files  ` +
          `${(totalBytes / 1024 / 1024).toFixed(2).padStart(6)} MB total  ` +
          `${(avg / 1024).toFixed(2).padStart(6)} KB/frame avg` +
          (expectedCount !== undefined && files.length !== expectedCount ? "  (COUNT MISMATCH)" : "")
      );
    };
    console.log(`  ${id}`);
    for (const tier of m.tiers) {
      report(`  ${path.basename(tier.path)}`, path.join(seqDir, path.basename(tier.path)), m.frameCount);
    }
    if (m.mobileVariant) {
      report(
        `  ${path.basename(m.mobileVariant.path)}`,
        path.join(seqDir, path.basename(m.mobileVariant.path)),
        m.mobileVariant.frameCount
      );
    }
  }
}

console.log("\n===============================");
if (failures > 0) {
  console.error(`${failures} check(s) FAILED`);
  process.exit(1);
} else {
  console.log("All checks passed clean.");
  process.exit(0);
}
