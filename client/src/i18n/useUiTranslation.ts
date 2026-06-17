import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { DEFAULT_LOCALE } from "./locales";
import { getCatalogString, tWithFallback } from "./resolveGameText";

type UiTranslateOptions = Record<string, string | number | boolean | undefined> & {
  defaultValue?: string;
};

/**
 * UI panel translations with English catalog fallback when keys are missing
 * (e.g. stale dev HMR before locale shards reload).
 */
export function useUiTranslation() {
  const { i18n } = useTranslation("ui");

  const t = useCallback(
    (key: string, options?: UiTranslateOptions) => {
      const { defaultValue, ...interpolation } = options ?? {};
      const fallback =
        defaultValue ??
        getCatalogString(DEFAULT_LOCALE, "ui", key) ??
        key;
      return tWithFallback("ui", key, fallback, interpolation);
    },
    [i18n.language, i18n.resolvedLanguage],
  );

  return { t, i18n };
}
