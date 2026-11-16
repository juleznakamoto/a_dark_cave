import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseLocaleJson } from "./parseLocaleJson";

const CLIENT_SRC = path.resolve(import.meta.dirname, "..");

/**
 * getUiTooltip(someVariable) is allowed only when the variable's possible
 * keys are checked another way (a string literal, a bt() key, or a
 * key/fallback pair). A new dynamic call fails this list on purpose.
 */
const DYNAMIC_GET_UI_TOOLTIP = [
  /^\s*key,/,
  /^\s*entry\.key\b/,
  /^\s*tooltip\.key\b/,
  /^\s*unlock\.key\b/,
  /^\s*`buildings\.\$\{effect\.key\}`/,
];

type TooltipKeyRef = {
  key: string;
  at: string;
};

function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return flattenKeys(value as Record<string, unknown>, full);
    }
    return [full];
  });
}

function catalogHas(keys: Set<string>, key: string): boolean {
  if (keys.has(key)) return true;
  return ["one", "other", "few", "many", "zero"].some((suffix) =>
    keys.has(`${key}_${suffix}`),
  );
}

function walkSources(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "locales" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSources(full, out);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name) || /\.test\.(ts|tsx)$/.test(entry.name)) {
      continue;
    }
    out.push(full);
  }
  return out;
}

/** Tooltip catalog keys referenced from game source, plus dynamic calls. */
function collectTooltipKeyRefs(source: string, fileLabel: string): {
  refs: TooltipKeyRef[];
  dynamicProblems: string[];
} {
  const refs: TooltipKeyRef[] = [];
  const dynamicProblems: string[] = [];

  for (const match of source.matchAll(
    /(?<!function )getUiTooltip\(\s*(["'`])([^"'`\n]+)\1/g,
  )) {
    const key = match[2];
    if (key.includes("${")) {
      const arg = `${match[1]}${key}${match[1]}`;
      const allowed = DYNAMIC_GET_UI_TOOLTIP.some((pattern) => pattern.test(arg));
      if (!allowed) {
        dynamicProblems.push(`${fileLabel}: getUiTooltip(${arg})`);
      }
      continue;
    }
    refs.push({ key, at: fileLabel });
  }

  for (const match of source.matchAll(/\bbt\(\s*(["'])([^"'\n]+)\1/g)) {
    refs.push({ key: `buildings.${match[2]}`, at: fileLabel });
  }

  for (const match of source.matchAll(
    /key:\s*(["'])([^"'\n]+)\1\s*,\s*(?:\n\s*)?fallback:\s*["']/g,
  )) {
    refs.push({ key: match[2], at: fileLabel });
  }

  for (const match of source.matchAll(
    /(?<!function )getUiTooltip\(\s*([\s\S]{0,60})/g,
  )) {
    const arg = match[1];
    if (/^(["'`])/.test(arg)) continue;
    const allowed = DYNAMIC_GET_UI_TOOLTIP.some((pattern) => pattern.test(arg));
    if (!allowed) {
      const preview = arg.split("\n")[0].trim();
      dynamicProblems.push(`${fileLabel}: getUiTooltip(${preview}`);
    }
  }

  return { refs, dynamicProblems };
}

function loadTooltipKeys(): Set<string> {
  const parsed = parseLocaleJson(
    fs.readFileSync(
      path.resolve(import.meta.dirname, "locales/en/ui/tooltips.json"),
      "utf8",
    ),
  ) as { tooltips: Record<string, unknown> };
  return new Set(flattenKeys(parsed.tooltips));
}

const EN_LOCALES = path.resolve(import.meta.dirname, "locales/en");
const CATALOG_NAMESPACES = [
  "ui",
  "common",
  "shop",
  "actions",
  "effects",
  "events",
  "achievements",
] as const;

function loadEnNamespace(ns: (typeof CATALOG_NAMESPACES)[number]): Set<string> {
  if (ns === "ui") {
    const merged: Record<string, unknown> = {};
    const uiDir = path.join(EN_LOCALES, "ui");
    for (const file of fs.readdirSync(uiDir)) {
      if (!file.endsWith(".json")) continue;
      Object.assign(
        merged,
        parseLocaleJson(fs.readFileSync(path.join(uiDir, file), "utf8")),
      );
    }
    return new Set(flattenKeys(merged));
  }
  return new Set(
    flattenKeys(
      parseLocaleJson(
        fs.readFileSync(path.join(EN_LOCALES, `${ns}.json`), "utf8"),
      ) as Record<string, unknown>,
    ),
  );
}

function resolveCatalogKey(raw: string): { ns: string; key: string } {
  const colon = raw.indexOf(":");
  if (colon > 0) {
    const prefix = raw.slice(0, colon);
    if ((CATALOG_NAMESPACES as readonly string[]).includes(prefix)) {
      return { ns: prefix, key: raw.slice(colon + 1) };
    }
  }
  return { ns: "ui", key: raw };
}

describe("tooltip catalog keys used by code", () => {
  it("flags a call whose key is missing from the English catalog", () => {
    const { refs } = collectTooltipKeyRefs(
      'getUiTooltip("notARealTooltipKey", "English fallback")',
      "fixture",
    );
    const keys = loadTooltipKeys();
    const missing = refs
      .filter((ref) => !catalogHas(keys, ref.key))
      .map((ref) => ref.key);
    expect(missing).toEqual(["notARealTooltipKey"]);
  });

  it("every getUiTooltip, bt, and key/fallback pair exists in en/ui/tooltips.json", () => {
    const keys = loadTooltipKeys();
    const missing: string[] = [];
    const dynamicProblems: string[] = [];

    for (const file of walkSources(CLIENT_SRC)) {
      const source = fs.readFileSync(file, "utf8");
      const label = path.relative(CLIENT_SRC, file);
      const found = collectTooltipKeyRefs(source, label);
      dynamicProblems.push(...found.dynamicProblems);
      for (const ref of found.refs) {
        if (!catalogHas(keys, ref.key)) {
          missing.push(`${label}: ${ref.key}`);
        }
      }
    }

    expect(dynamicProblems, dynamicProblems.join("\n")).toEqual([]);
    expect(missing, missing.join("\n")).toEqual([]);
  });
});

describe("inline English fallbacks", () => {
  const catalogs = Object.fromEntries(
    CATALOG_NAMESPACES.map((ns) => [ns, loadEnNamespace(ns)]),
  ) as Record<(typeof CATALOG_NAMESPACES)[number], Set<string>>;

  function missingLiteral(ns: string, key: string): boolean {
    const set = catalogs[ns as (typeof CATALOG_NAMESPACES)[number]];
    if (!set) return true;
    return !catalogHas(set, key);
  }

  it("every tWithFallback and t(defaultValue) literal exists in the English catalog", () => {
    const missing: string[] = [];
    const fallbackRe =
      /tWithFallback\(\s*(["'])(ui|common)\1\s*,\s*(["'`])([^"'`\n]*)\3/g;
    const defaultRe =
      /\bt\(\s*(["'`])([^"'`\n]+)\1[\s\S]{0,220}?defaultValue\s*:/g;

    for (const file of walkSources(CLIENT_SRC)) {
      const source = fs.readFileSync(file, "utf8");
      const label = path.relative(CLIENT_SRC, file);

      for (const match of source.matchAll(fallbackRe)) {
        const key = match[4];
        if (key.includes("${")) continue;
        if (missingLiteral(match[2], key)) {
          missing.push(`${label}: ${match[2]}:${key}`);
        }
      }

      for (const match of source.matchAll(defaultRe)) {
        const raw = match[2];
        if (raw.includes("${") || raw.includes(" ")) continue;
        const { ns, key } = resolveCatalogKey(raw);
        if (missingLiteral(ns, key)) {
          missing.push(`${label}: ${ns}:${key}`);
        }
      }
    }

    expect(missing, missing.join("\n")).toEqual([]);
  });
});
