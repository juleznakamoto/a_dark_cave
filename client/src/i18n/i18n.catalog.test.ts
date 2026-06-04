import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseLocaleJson } from "./parseLocaleJson";
import { SCHEMA_AVAILABLE_LANGUAGES } from "./locales";

const LOCALES_DIR = path.resolve(import.meta.dirname, "./locales");
const SOURCE_LOCALE = "en";
const TARGET_LOCALES = ["de", "fr", "es", "it", "pt-BR", "zh-CN", "ru"];

function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return flattenKeys(value as Record<string, unknown>, full);
    }
    return [full];
  });
}

function listNamespaces(localeDir: string): string[] {
  const ns = fs
    .readdirSync(localeDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
  if (fs.existsSync(path.join(localeDir, "ui"))) ns.push("ui");
  return ns.sort();
}

function loadNamespace(locale: string, ns: string): Record<string, unknown> {
  const localeDir = path.join(LOCALES_DIR, locale);
  if (ns === "ui") {
    const uiDir = path.join(localeDir, "ui");
    const merged: Record<string, unknown> = {};
    for (const f of fs.readdirSync(uiDir).filter((x) => x.endsWith(".json"))) {
      Object.assign(
        merged,
        parseLocaleJson(fs.readFileSync(path.join(uiDir, f), "utf8")),
      );
    }
    return merged;
  }
  return parseLocaleJson(
    fs.readFileSync(path.join(localeDir, `${ns}.json`), "utf8"),
  );
}

describe("i18n catalog parity", () => {
  const enNamespaces = listNamespaces(path.join(LOCALES_DIR, SOURCE_LOCALE));

  for (const ns of enNamespaces) {
    const enKeys = flattenKeys(loadNamespace(SOURCE_LOCALE, ns)).sort();

    for (const locale of TARGET_LOCALES) {
      it(`${locale}/${ns} matches en key structure`, () => {
        const targetKeys = flattenKeys(loadNamespace(locale, ns)).sort();
        expect(targetKeys).toEqual(enKeys);
      });
    }
  }

  for (const locale of [SOURCE_LOCALE, ...TARGET_LOCALES]) {
    it(`${locale}/ui shards have no duplicate top-level keys`, () => {
      const uiDir = path.join(LOCALES_DIR, locale, "ui");
      const seen = new Set<string>();
      for (const f of fs.readdirSync(uiDir).filter((x) => x.endsWith(".json"))) {
        const chunk = parseLocaleJson(
          fs.readFileSync(path.join(uiDir, f), "utf8"),
        ) as Record<string, unknown>;
        for (const key of Object.keys(chunk)) {
          expect(seen.has(key)).toBe(false);
          seen.add(key);
        }
      }
    });
  }
});

describe("SEO language metadata", () => {
  it("index.html availableLanguage matches SCHEMA_AVAILABLE_LANGUAGES", () => {
    const indexHtml = fs.readFileSync(
      path.resolve(import.meta.dirname, "../../index.html"),
      "utf8",
    );
    const match = indexHtml.match(/"availableLanguage":\s*(\[[^\]]+\])/);
    expect(match).not.toBeNull();
    const listed = JSON.parse(match![1]) as string[];
    expect(listed).toEqual([...SCHEMA_AVAILABLE_LANGUAGES]);
  });
});

describe("locale interpolation syntax", () => {
  for (const locale of [SOURCE_LOCALE, ...TARGET_LOCALES]) {
    it(`${locale}/events.json uses i18next {{var}} placeholders, not \${var}`, () => {
      const raw = fs.readFileSync(
        path.join(LOCALES_DIR, locale, "events.json"),
        "utf8",
      );
      const bad = [...raw.matchAll(/\$\{[a-zA-Z_][a-zA-Z0-9_]*\}/g)].map(
        (m) => m[0],
      );
      expect(bad, `Found JS-style placeholders: ${bad.join(", ")}`).toEqual(
        [],
      );
    });
  }
});
