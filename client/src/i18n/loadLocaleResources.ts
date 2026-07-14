import i18n from "i18next";
import { parseLocaleJson } from "./parseLocaleJson";
import {
  DEFAULT_LOCALE,
  getInitialLocale,
  type SupportedLocale,
} from "./locales";

const localeModules = import.meta.glob<string>(
  ["./locales/*/*.json", "./locales/*/ui/*.json"],
  { query: "?raw", import: "default" },
);

const loadedLocales = new Set<SupportedLocale>();
const loadingLocales = new Map<SupportedLocale, Promise<void>>();

function mergeLocalePath(
  resources: Record<string, Record<string, unknown>>,
  path: string,
  raw: string,
): void {
  const parsed = parseLocaleJson(raw);
  const uiShard = path.match(/\.\/locales\/([^/]+)\/ui\/([^/]+)\.json$/);
  if (uiShard) {
    resources.ui ??= {};
    Object.assign(resources.ui, parsed);
    return;
  }

  const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) return;
  const namespace = match[2];
  if (namespace === "ui") return;
  resources[namespace] = parsed;
}

async function fetchLocaleResources(
  locale: SupportedLocale,
): Promise<Record<string, Record<string, unknown>>> {
  const resources: Record<string, Record<string, unknown>> = {};
  const prefix = `./locales/${locale}/`;

  await Promise.all(
    Object.entries(localeModules)
      .filter(([path]) => path.startsWith(prefix))
      .map(async ([path, loader]) => {
        const raw = await loader();
        mergeLocalePath(resources, path, raw);
      }),
  );

  return resources;
}

export async function loadLocaleResources(
  locale: SupportedLocale,
): Promise<void> {
  if (loadedLocales.has(locale)) return;

  const inFlight = loadingLocales.get(locale);
  if (inFlight) {
    await inFlight;
    return;
  }

  const loadPromise = (async () => {
    const resources = await fetchLocaleResources(locale);
    for (const [namespace, bundle] of Object.entries(resources)) {
      i18n.addResourceBundle(locale, namespace, bundle, true, true);
    }
    loadedLocales.add(locale);
  })();

  loadingLocales.set(locale, loadPromise);
  try {
    await loadPromise;
  } finally {
    loadingLocales.delete(locale);
  }
}

/** Load English (fallback) plus the player's saved locale before first paint. */
export async function ensureInitialLocalesLoaded(): Promise<void> {
  const initial = getInitialLocale();
  await loadLocaleResources(DEFAULT_LOCALE);
  if (initial !== DEFAULT_LOCALE) {
    await loadLocaleResources(initial);
  }
}
