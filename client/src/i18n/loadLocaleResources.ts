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

const STARTUP_UI_SHARDS = new Set(["shell", "seo"]);
const loadedModulePaths = new Set<string>();
const loadingModulePaths = new Map<string, Promise<string>>();
const fullyLoadedLocales = new Set<SupportedLocale>();
const loadingFullLocales = new Map<SupportedLocale, Promise<void>>();
let gameplayResourcesRequested = false;

export function isStartupLocaleModulePath(
  path: string,
  locale: SupportedLocale,
): boolean {
  const match = path.match(/\.\/locales\/([^/]+)\/ui\/([^/]+)\.json$/);
  return match?.[1] === locale && STARTUP_UI_SHARDS.has(match[2]);
}

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
  pathFilter: (path: string) => boolean,
): Promise<Record<string, Record<string, unknown>>> {
  const resources: Record<string, Record<string, unknown>> = {};
  const prefix = `./locales/${locale}/`;

  await Promise.all(
    Object.entries(localeModules)
      .filter(
        ([path]) =>
          path.startsWith(prefix) &&
          pathFilter(path) &&
          !loadedModulePaths.has(path),
      )
      .map(async ([path, loader]) => {
        let loadPromise = loadingModulePaths.get(path);
        if (!loadPromise) {
          loadPromise = loader();
          loadingModulePaths.set(path, loadPromise);
        }
        try {
          const raw = await loadPromise;
          mergeLocalePath(resources, path, raw);
          loadedModulePaths.add(path);
        } finally {
          loadingModulePaths.delete(path);
        }
      }),
  );

  return resources;
}

function installLocaleResources(
  locale: SupportedLocale,
  resources: Record<string, Record<string, unknown>>,
): void {
  for (const [namespace, bundle] of Object.entries(resources)) {
    i18n.addResourceBundle(locale, namespace, bundle, true, true);
  }
}

export async function loadStartupLocaleResources(
  locale: SupportedLocale,
): Promise<void> {
  const resources = await fetchLocaleResources(
    locale,
    (path) => isStartupLocaleModulePath(path, locale),
  );
  installLocaleResources(locale, resources);
}

export async function loadLocaleResources(
  locale: SupportedLocale,
): Promise<void> {
  if (fullyLoadedLocales.has(locale)) return;

  const inFlight = loadingFullLocales.get(locale);
  if (inFlight) {
    await inFlight;
    return;
  }

  const loadPromise = (async () => {
    const resources = await fetchLocaleResources(locale, () => true);
    installLocaleResources(locale, resources);
    fullyLoadedLocales.add(locale);
  })();

  loadingFullLocales.set(locale, loadPromise);
  try {
    await loadPromise;
  } finally {
    loadingFullLocales.delete(locale);
  }
}

/** Load only the StartScreen shell + SEO strings before first React paint. */
export async function ensureInitialLocalesLoaded(): Promise<void> {
  const path =
    typeof window === "undefined" ? "/" : window.location.pathname;
  if (path !== "/" && path !== "/galaxy" && path !== "/boost") {
    await ensureGameplayLocalesLoaded();
    return;
  }

  const initial = getInitialLocale();
  await Promise.all([
    loadStartupLocaleResources(DEFAULT_LOCALE),
    initial === DEFAULT_LOCALE
      ? Promise.resolve()
      : loadStartupLocaleResources(initial),
  ]);
}

/** Load complete catalogs before gameplay becomes visible. */
export async function ensureGameplayLocalesLoaded(): Promise<void> {
  gameplayResourcesRequested = true;
  const initial = getInitialLocale();
  await Promise.all([
    loadLocaleResources(DEFAULT_LOCALE),
    initial === DEFAULT_LOCALE
      ? Promise.resolve()
      : loadLocaleResources(initial),
  ]);
}

/** StartScreen language changes stay small; gameplay changes load full catalogs. */
export async function loadResourcesForLanguageChange(
  locale: SupportedLocale,
): Promise<void> {
  if (gameplayResourcesRequested) {
    await loadLocaleResources(locale);
    return;
  }
  await loadStartupLocaleResources(locale);
}
