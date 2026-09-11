import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseLocaleJson } from "./parseLocaleJson";
import { SCHEMA_AVAILABLE_LANGUAGES, SUPPORTED_LOCALES } from "./locales";

const LOCALES_DIR = path.resolve(import.meta.dirname, "./locales");
const SOURCE_LOCALE = "en";
const TARGET_LOCALES = SUPPORTED_LOCALES.filter((locale) => locale !== SOURCE_LOCALE);

function localeCatalogExists(locale: string): boolean {
  return fs.existsSync(path.join(LOCALES_DIR, locale));
}

function localeNamespaceExists(locale: string, ns: string): boolean {
  const localeDir = path.join(LOCALES_DIR, locale);
  if (ns === "ui") return fs.existsSync(path.join(localeDir, "ui"));
  return fs.existsSync(path.join(localeDir, `${ns}.json`));
}

/** Skip key-structure checks until a locale has the same catalog files as English. */
function localeCatalogComplete(locale: string): boolean {
  const enFiles = listCatalogFiles(path.join(LOCALES_DIR, SOURCE_LOCALE));
  if (!localeCatalogExists(locale)) return false;
  const locFiles = listCatalogFiles(path.join(LOCALES_DIR, locale));
  return enFiles.every((rel) => locFiles.includes(rel));
}

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

/** Relative catalog paths under a locale dir (top-level + ui/*.json shards). */
function listCatalogFiles(localeDir: string): string[] {
  const paths: string[] = [];
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

describe("locale JSON parse validity", () => {
  for (const locale of [SOURCE_LOCALE, ...TARGET_LOCALES].filter(
    localeCatalogExists,
  )) {
    const files = listCatalogFiles(path.join(LOCALES_DIR, locale));

    it.each(files)(`${locale}/%s parses as locale JSON`, (rel) => {
      const filePath = path.join(LOCALES_DIR, locale, rel);
      const raw = fs.readFileSync(filePath, "utf8");
      expect(
        () => parseLocaleJson(raw),
        `Invalid locale JSON: ${locale}/${rel}`,
      ).not.toThrow();
      const parsed = parseLocaleJson(raw);
      expect(parsed).toBeTypeOf("object");
      expect(parsed).not.toBeNull();
      expect(Array.isArray(parsed)).toBe(false);
    });
  }
});

describe("i18n catalog parity", () => {
  const enNamespaces = listNamespaces(path.join(LOCALES_DIR, SOURCE_LOCALE));

  for (const ns of enNamespaces) {
    const enKeys = flattenKeys(loadNamespace(SOURCE_LOCALE, ns)).sort();
    const enKeySet = new Set(enKeys);

    for (const locale of TARGET_LOCALES.filter(localeCatalogComplete)) {
      it(`${locale}/${ns} matches en key structure`, () => {
        const targetKeys = flattenKeys(loadNamespace(locale, ns)).sort();
        const extraPlural = targetKeys.filter(
          (key) =>
            !enKeySet.has(key) && /_(few|many|zero)$/.test(key),
        );
        const targetWithoutExtraPlural = targetKeys.filter(
          (key) => !extraPlural.includes(key),
        );
        expect(targetWithoutExtraPlural).toEqual(enKeys);
        for (const key of extraPlural) {
          const base = key.replace(/_(few|many|zero)$/, "");
          expect(
            enKeySet.has(`${base}_one`) ||
              enKeySet.has(`${base}_other`) ||
              enKeySet.has(base),
            `${locale} extra plural ${key} has no English base`,
          ).toBe(true);
        }
      });
    }
  }

  for (const locale of [SOURCE_LOCALE, ...TARGET_LOCALES].filter((locale) =>
    localeNamespaceExists(locale, "ui"),
  )) {
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
  for (const locale of [SOURCE_LOCALE, ...TARGET_LOCALES].filter((locale) =>
    localeNamespaceExists(locale, "events"),
  )) {
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
