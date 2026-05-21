import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import i18n from "./index";
import {
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  setStoredLocale,
  type SupportedLocale,
} from "./locales";
import { applyDocumentLocale } from "./index";

export function useLocale() {
  const { i18n: i18nInstance } = useTranslation();

  const locale = (i18nInstance.language ?? "en") as SupportedLocale;

  const setLocale = useCallback(async (next: SupportedLocale) => {
    setStoredLocale(next);
    await i18n.changeLanguage(next);
    applyDocumentLocale(next);
  }, []);

  return {
    locale,
    setLocale,
    locales: SUPPORTED_LOCALES,
    localeLabels: LOCALE_LABELS,
  };
}
