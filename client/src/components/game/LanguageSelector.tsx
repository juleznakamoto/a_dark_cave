import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { HoverCalloutTooltip } from "@/components/game/HoverCalloutTooltip";
import { ChevronDown, Globe } from "lucide-react";
import { useLocale } from "@/i18n/useLocale";
import { useTranslation } from "react-i18next";
import type { SupportedLocale } from "@/i18n/locales";
import cn from "clsx";

export default function LanguageSelector({
  buttonClassName = "group px-1 py-1 text-xs text-neutral-300 hover hover:text-red-600",
  iconClassName = "w-4 h-4 text-neutral-300 opacity-80 transition-[opacity,color] group-hover:opacity-100 group-hover:!text-red-600",
  menuAlign = "end",
  showTooltip = true,
  showIcon = true,
  showInlineLabel = false,
  inlineLabelClassName = "sr-only sm:not-sr-only sm:inline",
  /** "static" shows the generic "Language" label; "selected" shows the active language name. */
  inlineLabelVariant = "static",
  showChevron = false,
  /** Nested in a Radix Dialog — avoids instant-close from focus/pointer-outside conflicts. */
  inDialog = false,
}: {
  buttonClassName?: string;
  iconClassName?: string;
  menuAlign?: "start" | "end";
  showTooltip?: boolean;
  showIcon?: boolean;
  showInlineLabel?: boolean;
  inlineLabelClassName?: string;
  inlineLabelVariant?: "static" | "selected";
  showChevron?: boolean;
  inDialog?: boolean;
} = {}) {
  const { locale, setLocale, locales, localeLabels } = useLocale();
  const { t } = useTranslation("ui");

  const inlineLabel =
    inlineLabelVariant === "selected"
      ? localeLabels[locale as SupportedLocale]
      : t("languageSelector.label");

  const trigger = (
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="xs"
        className={buttonClassName}
        aria-label={t("languageSelector.ariaLabel")}
        onPointerDown={inDialog ? (e) => e.preventDefault() : undefined}
      >
        {showIcon && <Globe className={iconClassName} aria-hidden />}
        {showInlineLabel && (
          <span className={inlineLabelClassName}>{inlineLabel}</span>
        )}
        {showChevron && (
          <ChevronDown
            className="w-3.5 h-3.5 shrink-0 opacity-70"
            aria-hidden
          />
        )}
      </Button>
    </DropdownMenuTrigger>
  );

  return (
    <DropdownMenu modal={inDialog}>
      {showTooltip ? (
        <HoverCalloutTooltip label={t("languageSelector.ariaLabel")} side="top">
          {trigger}
        </HoverCalloutTooltip>
      ) : (
        trigger
      )}
      <DropdownMenuContent
        align={menuAlign}
        className={cn("w-max min-w-0 text-xs", inDialog && "z-[80]")}
        onCloseAutoFocus={inDialog ? (e) => e.preventDefault() : undefined}
        onInteractOutside={
          inDialog
            ? (e) => {
                const target = e.target as HTMLElement;
                if (target.closest('[role="dialog"]')) {
                  e.preventDefault();
                }
              }
            : undefined
        }
      >
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
