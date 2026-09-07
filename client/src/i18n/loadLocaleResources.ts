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
const PUBLIC_DOC_UI_SHARDS = new Set(["shell", "seo", "publicPages"]);
const PUBLIC_DOC_PATHS = new Set([
  "/faq",
  "/about",
  "/press",
  "/privacy",
  "/terms",
  "/imprint",
  "/withdrawal",
]);
const loadedModulePaths = new Set<string>();
const loadingModulePaths = new Map<string, Promise<string>>();
const fullyLoadedLocales = new Set<SupportedLocale>();
const loadingFullLocales = new Map<SupportedLocale, Promise<void>>();
let gameplayResourcesRequested = false;

function uiShardMatches(
  path: string,
  locale: SupportedLocale,
  shards: Set<string>,
): boolean {
  const match = path.match(/\.\/locales\/([^/]+)\/ui\/([^/]+)\.json$/);
  return match?.[1] === locale && shards.has(match[2]);
}

export function isStartupLocaleModulePath(
  path: string,
  locale: SupportedLocale,
): boolean {
  return uiShardMatches(path, locale, STARTUP_UI_SHARDS);
}

export function isPublicDocLocaleModulePath(
  path: string,
  locale: SupportedLocale,
): boolean {
  return uiShardMatches(path, locale, PUBLIC_DOC_UI_SHARDS);
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

/** Gameplay catalogs include `events`. Startup shards (shell/seo) do not. */
function hasGameplayCatalog(locale: SupportedLocale): boolean {
  return i18n.hasResourceBundle(locale, "events");
}

function forgetLoadedLocale(locale: SupportedLocale): void {
  fullyLoadedLocales.delete(locale);
  const prefix = `./locales/${locale}/`;
  for (const path of [...loadedModulePaths]) {
    if (path.startsWith(prefix)) loadedModulePaths.delete(path);
  }
}

export async function loadLocaleResources(
  locale: SupportedLocale,
): Promise<void> {
  if (fullyLoadedLocales.has(locale)) {
    // Locale JSON HMR re-inits i18n with empty resources while this module
    // still thinks catalogs are loaded. Re-fetch when the gameplay bundle is gone.
    if (hasGameplayCatalog(locale)) return;
    forgetLoadedLocale(locale);
  }

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

export function isStartupSurfacePath(path: string): boolean {
  return (
    path === "/" ||
    path === "/galaxy" ||
    path === "/crazygames" ||
    path === "/boost"
  );
}

export function isPublicDocPath(path: string): boolean {
  const bare = (path.split("?")[0] ?? "/").trim() || "/";
  const withLeading = bare.startsWith("/") ? bare : `/${bare}`;
  const normalized =
    withLeading !== "/" && withLeading.endsWith("/")
      ? withLeading.slice(0, -1)
      : withLeading;
  return PUBLIC_DOC_PATHS.has(normalized);
}

export function initialLocaleLoadMode(
  path: string,
): "startup" | "publicDoc" | "gameplay" {
  if (isStartupSurfacePath(path)) return "startup";
  if (isPublicDocPath(path)) return "publicDoc";
  return "gameplay";
}

export async function loadPublicDocLocaleResources(
  locale: SupportedLocale,
): Promise<void> {
  const resources = await fetchLocaleResources(locale, (path) =>
    isPublicDocLocaleModulePath(path, locale),
  );
  installLocaleResources(locale, resources);
}

async function loadBootLocaleResources(
  loader: (locale: SupportedLocale) => Promise<void>,
): Promise<void> {
  const initial = getInitialLocale();
  await Promise.all([
    loader(DEFAULT_LOCALE),
    initial === DEFAULT_LOCALE ? Promise.resolve() : loader(initial),
  ]);
}

/** Load StartScreen shell + SEO strings (or public-doc / full catalogs). */
export async function ensureInitialLocalesLoaded(): Promise<void> {
  const path =
    typeof window === "undefined" ? "/" : window.location.pathname;
  const mode = initialLocaleLoadMode(path);
  if (mode === "startup") {
    await loadBootLocaleResources(loadStartupLocaleResources);
    return;
  }
  if (mode === "publicDoc") {
    await loadBootLocaleResources(loadPublicDocLocaleResources);
    return;
  }

  await ensureGameplayLocalesLoaded();
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
  const path =
    typeof window === "undefined" ? "/" : window.location.pathname;
  if (isPublicDocPath(path)) {
    await loadPublicDocLocaleResources(locale);
    return;
  }
  await loadStartupLocaleResources(locale);
}
