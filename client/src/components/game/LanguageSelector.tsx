import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/useLocale";
import { useTranslation } from "react-i18next";
import type { SupportedLocale } from "@/i18n/locales";

export default function LanguageSelector() {
  const { locale, setLocale, locales, localeLabels } = useLocale();
  const { t } = useTranslation("ui");

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className="px-2 py-1 text-xs hover bg-background text-neutral-300 backdrop-blur-sm border border-border"
          aria-label={t("languageSelector.ariaLabel")}
        >
          {t("languageSelector.label")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="text-xs">
        {locales.map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => void setLocale(code as SupportedLocale)}
            className={locale === code ? "font-semibold" : undefined}
          >
            {localeLabels[code as SupportedLocale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
