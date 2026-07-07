import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { HoverCalloutTooltip } from "@/components/game/HoverCalloutTooltip";
import { ChevronDown } from "lucide-react";
import { GameUiIcon } from "@/components/game/GameUiIcon";
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
  /** Nested in a Radix Dialog — non-modal menu portaled into the dialog layer. */
  inDialog = false,
  menuPortalContainer = null,
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
  menuPortalContainer?: HTMLElement | null;
} = {}) {
  const { locale, setLocale, locales, localeLabels } = useLocale();
  const { t } = useTranslation("ui");
  const [open, setOpen] = useState(false);

  const inlineLabel =
    inlineLabelVariant === "selected"
      ? localeLabels[locale as SupportedLocale]
      : t("languageSelector.label");

  const dialogPortalReady = !inDialog || menuPortalContainer != null;

  const handleOpenChange = (next: boolean) => {
    if (inDialog) {
      if (next && !menuPortalContainer) return;
      setOpen(next);
    }
  };

  useEffect(() => {
    if (inDialog && !menuPortalContainer) {
      setOpen(false);
    }
  }, [inDialog, menuPortalContainer]);

  const trigger = (
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="xs"
        className={buttonClassName}
        aria-label={t("languageSelector.ariaLabel")}
        aria-expanded={inDialog ? open : undefined}
      >
        {showIcon && (
          <GameUiIcon
            name="language"
            className={iconClassName}
            sizeClassName="w-4 h-4"
          />
        )}
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
    <DropdownMenu
      open={inDialog ? open : undefined}
      onOpenChange={inDialog ? handleOpenChange : undefined}
      modal={!inDialog}
    >
      {showTooltip ? (
        <HoverCalloutTooltip label={t("languageSelector.ariaLabel")} side="top">
          {trigger}
        </HoverCalloutTooltip>
      ) : (
        trigger
      )}
      {dialogPortalReady && (
        <DropdownMenuContent
          align={menuAlign}
          portalContainer={
            inDialog ? (menuPortalContainer ?? undefined) : undefined
          }
          className={cn(
            "w-max min-w-0",
            inDialog ? "text-sm" : "text-xs",
            inDialog && "z-[60]",
          )}
          onCloseAutoFocus={inDialog ? (e) => e.preventDefault() : undefined}
        >
          {locales.map((code) => (
            <DropdownMenuItem
              key={code}
              onClick={() => {
                void setLocale(code as SupportedLocale);
                if (inDialog) setOpen(false);
              }}
              className={cn(
                locale === code && "font-semibold",
                inDialog && "text-sm",
              )}
            >
              {localeLabels[code as SupportedLocale]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
