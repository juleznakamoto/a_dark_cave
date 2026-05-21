import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import {
  DEFAULT_LOCALE,
  I18N_NAMESPACES,
  getStoredLocale,
  type SupportedLocale,
} from "./locales";

const localeModules = import.meta.glob<{ default: Record<string, unknown> }>(
  ["./locales/*/*.json", "./locales/*/ui/*.json"],
  { eager: true },
);

function buildResources(): Record<
  string,
  Record<string, Record<string, unknown>>
> {
  const resources: Record<string, Record<string, Record<string, unknown>>> = {};

  for (const [path, mod] of Object.entries(localeModules)) {
    const uiShard = path.match(/\.\/locales\/([^/]+)\/ui\/([^/]+)\.json$/);
    if (uiShard) {
      const [, locale] = uiShard;
      resources[locale] ??= {};
      resources[locale].ui ??= {};
      Object.assign(resources[locale].ui, mod.default);
      continue;
    }

    const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/);
    if (!match) continue;
    const [, locale, namespace] = match;
    // ui namespace is loaded from ui/*.json shards only (no monolithic ui.json).
    if (namespace === "ui") continue;
    resources[locale] ??= {};
    resources[locale][namespace] = mod.default;
  }

  return resources;
}

const resources = buildResources();

void i18n.use(initReactI18next).init({
  resources,
  lng: getStoredLocale(),
  fallbackLng: DEFAULT_LOCALE,
  ns: [...I18N_NAMESPACES],
  defaultNS: "ui",
  interpolation: {
    escapeValue: false,
  },
  returnEmptyString: false,
  returnNull: false,
});

export function applyDocumentLocale(locale: SupportedLocale): void {
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale === "zh-CN" ? "zh-Hans" : locale;
  }
}

applyDocumentLocale(getStoredLocale());

export default i18n;
