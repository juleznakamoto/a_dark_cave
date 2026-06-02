#!/usr/bin/env node
// Cursor `stop` hook: keep ARCHITECTURE.md in sync with the file structure.
//
// On every agent completion it compares the current set of source files (under the
// directories that ARCHITECTURE.md documents) against a cached manifest. If files were
// added/removed/renamed but ARCHITECTURE.md was NOT updated, it returns a `followup_message`
// so the agent updates the doc. Once ARCHITECTURE.md changes, the manifest is refreshed and
// the nudging stops. Fails open: any error => no output, agent continues normally.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const WATCHED_DIRS = ["client", "server", "shared", "supabase", "scripts", "gender-service"];
const WATCHED_EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py"];
const ARCH_FILE = "ARCHITECTURE.md";
const MANIFEST_FILE = ".cursor/.architecture-manifest.json";
const MAX_LISTED = 20;

function emit(obj) {
  if (obj) process.stdout.write(JSON.stringify(obj));
  process.exit(0);
}

function readStdin() {
  try {
    return JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
}

function gitFiles(root, args) {
  try {
    const out = execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return out.split("\n").map((l) => l.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function isWatched(p) {
  const path = p.replace(/\\/g, "/");
  if (!WATCHED_DIRS.some((d) => path === d || path.startsWith(d + "/"))) return false;
  return WATCHED_EXTS.some((ext) => path.endsWith(ext));
}

function collectSourceFiles(root) {
  const tracked = gitFiles(root, ["ls-files", "--", ...WATCHED_DIRS]);
  const untracked = gitFiles(root, ["ls-files", "--others", "--exclude-standard", "--", ...WATCHED_DIRS]);
  const set = new Set([...tracked, ...untracked].map((p) => p.replace(/\\/g, "/")).filter(isWatched));
  return [...set].sort();
}

function hashFile(path) {
  try {
    return createHash("sha256").update(readFileSync(path)).digest("hex");
  } catch {
    return "";
  }
}

function loadManifest(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function saveManifest(path, data) {
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
  } catch {
    /* best effort */
  }
}

try {
  const input = readStdin();
  if (input.status && input.status !== "completed") emit(null);

  const root = (Array.isArray(input.workspace_roots) && input.workspace_roots[0]) || process.cwd();
  const archPath = resolve(root, ARCH_FILE);
  const manifestPath = resolve(root, MANIFEST_FILE);

  const files = collectSourceFiles(root);
  if (files.length === 0) emit(null); // not a git repo / nothing to track

  const archHash = hashFile(archPath);
  const manifest = loadManifest(manifestPath);

  // First run: seed the manifest, no nudge.
  if (!manifest) {
    saveManifest(manifestPath, { files, archHash });
    emit(null);
  }

  // ARCHITECTURE.md changed since last seen => assume it was kept in sync. Refresh + stop nudging.
  if (archHash !== manifest.archHash) {
    saveManifest(manifestPath, { files, archHash });
    emit(null);
  }

  const prev = new Set(manifest.files || []);
  const curr = new Set(files);
  const added = files.filter((f) => !prev.has(f));
  const removed = (manifest.files || []).filter((f) => !curr.has(f));

  if (added.length === 0 && removed.length === 0) emit(null);

  const fmt = (arr) =>
    arr.slice(0, MAX_LISTED).map((f) => `  - ${f}`).join("\n") +
    (arr.length > MAX_LISTED ? `\n  - …and ${arr.length - MAX_LISTED} more` : "");

  const parts = [];
  if (added.length) parts.push(`Added (${added.length}):\n${fmt(added)}`);
  if (removed.length) parts.push(`Removed (${removed.length}):\n${fmt(removed)}`);

  // Record the new file set (keep the old archHash) so we nudge once per delta rather than
  // nagging on every future completion. A real ARCHITECTURE.md edit changes the hash above.
  saveManifest(manifestPath, { files, archHash: manifest.archHash });

  emit({
    followup_message:
      `The project's file structure changed but ARCHITECTURE.md was not updated.\n\n` +
      `${parts.join("\n\n")}\n\n` +
      `Update ARCHITECTURE.md so its layout/file tables reflect these changes (add/remove/rename ` +
      `entries with one-line responsibilities, keep it concise). If a change does not affect the ` +
      `documented architecture (e.g. a new test file next to existing code), make no edit — saving ` +
      `the file or running the check again will clear this reminder.`,
  });
} catch {
  emit(null); // fail open
}
