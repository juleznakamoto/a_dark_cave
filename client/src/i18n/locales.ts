/** Supported game UI locales (English is source/fallback). */
export const SUPPORTED_LOCALES = [
  "en",
  "de",
  "fr",
  "es",
  "pt-BR",
  "zh-CN",
  "ru",
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";

export const LOCALE_STORAGE_KEY = "adc-locale";

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  "pt-BR": "Português (Brasil)",
  "zh-CN": "简体中文",
  ru: "Русский",
};

/** Open Graph locale tags (underscore form). */
export const OG_LOCALE_TAGS: Record<SupportedLocale, string> = {
  en: "en_US",
  de: "de_DE",
  fr: "fr_FR",
  es: "es_ES",
  "pt-BR": "pt_BR",
  "zh-CN": "zh_CN",
  ru: "ru_RU",
};

export const I18N_NAMESPACES = [
  "common",
  "ui",
  "shop",
  "actions",
  "effects",
  "events",
  "achievements",
] as const;

export type I18nNamespace = (typeof I18N_NAMESPACES)[number];

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: string | null | undefined): SupportedLocale {
  if (!value) return DEFAULT_LOCALE;
  if (isSupportedLocale(value)) return value;
  const lower = value.toLowerCase();
  if (lower.startsWith("de")) return "de";
  if (lower.startsWith("fr")) return "fr";
  if (lower.startsWith("es")) return "es";
  if (lower.startsWith("pt")) return "pt-BR";
  if (lower.startsWith("zh")) return "zh-CN";
  if (lower.startsWith("ru")) return "ru";
  return DEFAULT_LOCALE;
}

export function getStoredLocale(): SupportedLocale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    return normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** Browser language on first visit; falls back to stored preference when set. */
export function detectBrowserLocale(): SupportedLocale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  const candidates = navigator.languages?.length
    ? [...navigator.languages]
    : navigator.language
      ? [navigator.language]
      : [];
  for (const candidate of candidates) {
    const normalized = normalizeLocale(candidate);
    if (normalized !== DEFAULT_LOCALE) return normalized;
    if (candidate.toLowerCase().startsWith("en")) return DEFAULT_LOCALE;
  }
  return DEFAULT_LOCALE;
}

export function getInitialLocale(): SupportedLocale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored !== null) return normalizeLocale(stored);
  } catch {
    /* ignore quota / private mode */
  }
  return detectBrowserLocale();
}

export function setStoredLocale(locale: SupportedLocale): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore quota errors */
  }
}
