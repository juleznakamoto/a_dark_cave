/**
 * Shared helpers for locale catalog files (top-level *.json and ui/*.json shards).
 */
import fs from "node:fs";
import path from "node:path";

/** Normalize catalog rel paths to forward slashes (ui/shell.json). */
export function normalizeCatalogRel(rel) {
  return rel.replace(/\\/g, "/");
}

/** Relative catalog paths under a locale dir, e.g. common.json, ui/shell.json */
export function listCatalogPaths(localeDir) {
  const paths = [];
  for (const f of fs.readdirSync(localeDir)) {
    if (f.endsWith(".json")) paths.push(f);
  }
  const uiDir = path.join(localeDir, "ui");
  if (fs.existsSync(uiDir)) {
    for (const f of fs.readdirSync(uiDir)) {
      if (f.endsWith(".json")) paths.push(`ui/${f}`);
    }
  }
  return paths.sort();
}

/** Namespace names for parity checks (ui is one namespace despite multiple files). */
export function listNamespaces(localeDir) {
  const ns = fs
    .readdirSync(localeDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
  if (fs.existsSync(path.join(localeDir, "ui"))) ns.push("ui");
  return ns.sort();
}

/** Load a namespace, merging ui/*.json shards when ns === "ui". */
export function loadMergedNamespace(localeDir, ns) {
  if (ns === "ui") {
    const uiDir = path.join(localeDir, "ui");
    const merged = {};
    for (const f of fs.readdirSync(uiDir).filter((x) => x.endsWith(".json"))) {
      Object.assign(
        merged,
        JSON.parse(fs.readFileSync(path.join(uiDir, f), "utf8")),
      );
    }
    return merged;
  }
  return JSON.parse(
    fs.readFileSync(path.join(localeDir, `${ns}.json`), "utf8"),
  );
}
