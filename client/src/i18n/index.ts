import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import {
  DEFAULT_LOCALE,
  I18N_NAMESPACES,
  getInitialLocale,
  isSupportedLocale,
  normalizeLocale,
  type SupportedLocale,
} from "./locales";
import { loadLocaleResources } from "./loadLocaleResources";

void i18n.use(initReactI18next).init({
  resources: {},
  lng: getInitialLocale(),
  fallbackLng: DEFAULT_LOCALE,
  ns: [...I18N_NAMESPACES],
  defaultNS: "ui",
  interpolation: {
    escapeValue: false,
  },
  returnEmptyString: false,
  returnNull: false,
});

const nativeChangeLanguage = i18n.changeLanguage.bind(i18n);

async function changeLanguageWithLocaleLoad(
  lng: string,
  ...rest: Parameters<typeof nativeChangeLanguage> extends [string, ...infer R]
    ? R
    : never
) {
  const normalized = normalizeLocale(lng);
  if (isSupportedLocale(normalized)) {
    await loadLocaleResources(normalized);
  }
  return nativeChangeLanguage(lng, ...rest);
}

i18n.changeLanguage = ((lng, ...rest) =>
  typeof lng === "string"
    ? changeLanguageWithLocaleLoad(lng, ...rest)
    : nativeChangeLanguage(lng, ...rest)) as typeof i18n.changeLanguage;

if (import.meta.hot) {
  import.meta.hot.on("vite:beforeUpdate", (payload) => {
    const localeChanged = payload.updates.some((update) =>
      /[/\\]i18n[/\\]locales[/\\]/.test(update.path),
    );
    if (localeChanged) {
      import.meta.hot!.invalidate();
    }
  });
}

export function applyDocumentLocale(locale: SupportedLocale): void {
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale === "zh-CN" ? "zh-Hans" : locale;
  }
}

applyDocumentLocale(getInitialLocale());

export default i18n;
