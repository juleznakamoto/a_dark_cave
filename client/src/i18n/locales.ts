/** Supported game UI locales (English is source/fallback). */
export const SUPPORTED_LOCALES = [
  "en",
  "de",
  "fr",
  "es",
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
  "zh-CN": "简体中文",
  ru: "Русский",
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

export function setStoredLocale(locale: SupportedLocale): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore quota errors */
  }
}
