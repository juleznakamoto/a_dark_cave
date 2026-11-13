import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every literal key the UI code asks for must exist in the English catalog.
 * A missing key never fails at runtime: tWithFallback returns the code's English
 * fallback (or the raw key), so every locale silently shows English. This is
 * how the share text and the fortification stat lines stayed untranslated.
 * Dynamic keys (template literals, variables) are covered at runtime by the
 * dev-only warning in tWithFallback.
 */

const SRC = path.resolve(__dirname, "..");
const EN_DIR = path.join(__dirname, "locales", "en");
const NAMESPACES = ["achievements", "actions", "common", "effects", "events", "shop", "ui"];

function loadEnglishCatalogs(): Record<string, Record<string, unknown>> {
  const catalogs: Record<string, Record<string, unknown>> = {};
  const walk = (dir: string, rel: string) => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) {
        walk(full, `${rel}${name}/`);
        continue;
      }
      if (!name.endsWith(".json")) continue;
      const ns = rel.startsWith("ui/") ? "ui" : name.replace(/\.json$/, "");
      catalogs[ns] = { ...catalogs[ns], ...JSON.parse(fs.readFileSync(full, "utf8")) };
    }
  };
  walk(EN_DIR, "");
  return catalogs;
}

function hasKey(catalog: Record<string, unknown> | undefined, key: string): boolean {
  const parts = key.split(".");
  const last = parts.pop()!;
  let node: unknown = catalog;
  for (const part of parts) {
    if (!node || typeof node !== "object") return false;
    node = (node as Record<string, unknown>)[part];
  }
  if (!node || typeof node !== "object") return false;
  const parent = node as Record<string, unknown>;
  return (
    typeof parent[last] === "string" ||
    typeof parent[`${last}_one`] === "string" ||
    typeof parent[`${last}_other`] === "string"
  );
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      if (name !== "locales" && name !== "node_modules") sourceFiles(full, out);
    } else if (/\.tsx?$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

function splitNamespace(key: string, defaultNs: string): [string, string] {
  const colon = key.indexOf(":");
  if (colon > 0 && NAMESPACES.includes(key.slice(0, colon))) {
    return [key.slice(0, colon), key.slice(colon + 1)];
  }
  return [defaultNs, key];
}

describe("i18n keys referenced in code", () => {
  it("exist in the English catalog", () => {
    const catalogs = loadEnglishCatalogs();
    const missing: string[] = [];
    const check = (ns: string, key: string, file: string, index: number, text: string) => {
      if (hasKey(catalogs[ns], key)) return;
      const line = text.slice(0, index).split("\n").length;
      missing.push(`${ns}:${key}  (${path.relative(SRC, file)}:${line})`);
    };

    for (const file of sourceFiles(SRC)) {
      const text = fs.readFileSync(file, "utf8");
      const usesUiT = text.includes("useUiTranslation");
      for (const m of text.matchAll(/getUiTooltip\(\s*"([\w.]+)"/g)) {
        check("ui", `tooltips.${m[1]}`, file, m.index!, text);
      }
      for (const m of text.matchAll(/tWithFallback\(\s*"(\w+)",\s*"([\w.]+)"/g)) {
        check(m[1], m[2], file, m.index!, text);
      }
      for (const m of text.matchAll(/getStatName\(\s*"(\w+)"/g)) {
        check("common", `stats.${m[1]}`, file, m.index!, text);
      }
      if (text.includes("buildingTooltipEffects")) {
        for (const m of text.matchAll(/\bbt\(\s*"([\w.]+)"/g)) {
          check("ui", `tooltips.buildings.${m[1]}`, file, m.index!, text);
        }
      }
      if (usesUiT) {
        // Optional `{ ..., ns: "common" }` in the same call overrides the namespace.
        for (const m of text.matchAll(/\bt\(\s*"([\w.:-]+)"\s*(?:,\s*\{[^}]*?\bns:\s*"(\w+)")?/g)) {
          const [ns, key] = splitNamespace(m[1], m[2] ?? "ui");
          check(ns, key, file, m.index!, text);
        }
      }
    }

    expect(missing).toEqual([]);
  });
});
