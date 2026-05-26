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
import cn from "clsx";

export default function LanguageSelector({
  buttonClassName = "group px-1 py-1 text-xs text-neutral-300 hover hover:text-red-500",
  iconClassName = "w-4 h-4 opacity-60 transition-[opacity,color] group-hover:opacity-100",
  menuAlign = "end",
}: {
  buttonClassName?: string;
  iconClassName?: string;
  menuAlign?: "start" | "end";
} = {}) {
  const { locale, setLocale, locales, localeLabels } = useLocale();
  const { t } = useTranslation("ui");

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className={buttonClassName}
          aria-label={t("languageSelector.ariaLabel")}
        >
          <Globe className={iconClassName} aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={menuAlign} className="w-max min-w-0 text-xs">
        {locales.map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => void setLocale(code as SupportedLocale)}
            className={cn(locale === code && "font-semibold")}
          >
            <span className="inline-flex items-center gap-1.5">
              <span>{localeLabels[code as SupportedLocale]}</span>
              {locale === code && (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-600"
                  aria-hidden
                />
              )}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
