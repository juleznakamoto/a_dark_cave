import { parseLocaleJson } from "./parseLocaleJson";

const enUiShardModules = import.meta.glob<string>(
  "./locales/en/ui/*.json",
  { eager: true, query: "?raw", import: "default" },
);

function flattenCatalog(
  obj: Record<string, unknown>,
  prefix = "",
  out = new Map<string, string>(),
): Map<string, string> {
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      flattenCatalog(v as Record<string, unknown>, path, out);
    } else if (typeof v === "string") {
      out.set(path, v);
    }
  }
  return out;
}

const enUiCatalog = flattenCatalog(
  Object.values(enUiShardModules).reduce(
    (merged, raw) => {
      Object.assign(merged, parseLocaleJson(raw));
      return merged;
    },
    {} as Record<string, unknown>,
  ),
);

/** English UI catalog from locale shards (independent of i18n runtime bundle). */
export function getEnUiCatalogString(key: string): string | undefined {
  return enUiCatalog.get(key);
}
