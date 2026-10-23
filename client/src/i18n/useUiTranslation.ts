import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_LOCALE,
  I18N_NAMESPACES,
  type I18nNamespace,
} from "./locales";
import { getEnUiCatalogString } from "./enUiCatalog";
import { getCatalogString, tWithFallback } from "./resolveGameText";

type UiTranslateOptions = Record<
  string,
  string | number | boolean | undefined
> & {
  defaultValue?: string;
  /** Override namespace (also accepted as `common:key` / `ui:key` prefixes). */
  ns?: string;
};

function isI18nNamespace(value: string): value is I18nNamespace {
  return (I18N_NAMESPACES as readonly string[]).includes(value);
}

function resolveNamespaceAndKey(
  key: string,
  nsOpt?: string,
): { namespace: string; bareKey: string } {
  let namespace = "ui";
  let bareKey = key;

  const colon = key.indexOf(":");
  if (colon > 0) {
    const prefix = key.slice(0, colon);
    if (isI18nNamespace(prefix)) {
      namespace = prefix;
      bareKey = key.slice(colon + 1);
    }
  }

  if (nsOpt && isI18nNamespace(nsOpt)) {
    namespace = nsOpt;
  }

  return { namespace, bareKey };
}

/**
 * UI panel translations with English catalog fallback when keys are missing
 * (e.g. stale dev HMR before locale shards reload).
 *
 * Accepts bare ui keys (`shop.title`), prefixed keys (`ui:shop.title`,
 * `common:buttons.continue`), and `{ ns: "common" }` like react-i18next.
 */
export function useUiTranslation() {
  const { i18n } = useTranslation("ui");

  const t = useCallback(
    (key: string, options?: UiTranslateOptions) => {
      const { defaultValue, ns: nsOpt, ...interpolation } = options ?? {};
      const { namespace, bareKey } = resolveNamespaceAndKey(key, nsOpt);
      const fallback =
        defaultValue ??
        getCatalogString(DEFAULT_LOCALE, namespace, bareKey) ??
        (namespace === "ui" ? getEnUiCatalogString(bareKey) : undefined) ??
        bareKey;
      return tWithFallback(namespace, bareKey, fallback, interpolation);
    },
    [i18n.language, i18n.resolvedLanguage],
  );

  return { t, i18n };
}
