import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Type } from "lucide-react";
import { useTextScale } from "@/i18n/useTextScale";
import { useTranslation } from "react-i18next";
import type { TextScale } from "@/lib/textScale";
import cn from "clsx";

const TEXT_SCALE_LABEL_KEYS: Record<TextScale, "textScale.normal" | "textScale.large"> =
{
  normal: "textScale.normal",
  large: "textScale.large",
};

export default function TextScaleSelector({
  buttonClassName = "group -mr-2 flex items-center gap-1 rounded-md px-2 py-1 text-sm hover:bg-muted/40 transition-colors",
  menuAlign = "end",
  inDialog = false,
  menuPortalContainer = null,
}: {
  buttonClassName?: string;
  menuAlign?: "start" | "end";
  inDialog?: boolean;
  menuPortalContainer?: HTMLElement | null;
} = {}) {
  const { textScale, setTextScale, textScaleOptions } = useTextScale();
  const { t } = useTranslation("ui");
  const [open, setOpen] = useState(false);

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

  return (
    <DropdownMenu
      open={inDialog ? open : undefined}
      onOpenChange={inDialog ? handleOpenChange : undefined}
      modal={!inDialog}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className={buttonClassName}
          aria-label={t("textScale.ariaLabel")}
          aria-expanded={inDialog ? open : undefined}
        >
          <span className="inline">{t(TEXT_SCALE_LABEL_KEYS[textScale])}</span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
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
          {textScaleOptions.map((option) => (
            <DropdownMenuItem
              key={option}
              onClick={() => {
                setTextScale(option);
                if (inDialog) setOpen(false);
              }}
              className={cn(
                textScale === option && "font-semibold",
                inDialog && "text-sm",
              )}
            >
              {t(TEXT_SCALE_LABEL_KEYS[option])}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}

export function TextScaleSettingsIcon() {
  return <Type className="w-5 h-5 opacity-90" aria-hidden />;
}
