import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
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
          className="px-1 py-1 text-xs hover"
          title={t("languageSelector.ariaLabel")}
          aria-label={t("languageSelector.ariaLabel")}
        >
          <Globe
            className="w-4 h-4 opacity-60"
            style={{ filter: "invert(1)" }}
            aria-hidden
          />
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
