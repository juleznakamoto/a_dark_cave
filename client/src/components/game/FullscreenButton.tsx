import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HoverCalloutTooltip } from "@/components/game/HoverCalloutTooltip";
import { useFullscreen } from "@/hooks/useFullscreen";
import { useTranslation } from "react-i18next";

const HEADER_ICON_BTN =
  "group shrink-0 p-0 w-7 h-7 flex items-center justify-center";
const HEADER_ICON_SYMBOL_HOVER =
  "text-neutral-300 opacity-80 transition-[opacity,color] group-hover:opacity-100 group-hover:!text-red-600";

export function FullscreenButton() {
  const { isFullscreen, toggleFullscreen, available } = useFullscreen();
  const { t } = useTranslation("ui");

  if (!available) return null;

  const label = isFullscreen
    ? t("profile.exitFullscreen", { defaultValue: "Exit full screen" })
    : t("profile.enterFullscreen", { defaultValue: "Full screen" });

  return (
    <HoverCalloutTooltip label={label} side="left" arrowAlign="end">
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={() => void toggleFullscreen()}
        aria-label={label}
        className={`${HEADER_ICON_BTN} group touch-manipulation`}
        data-testid="button-toggle-fullscreen"
      >
        {isFullscreen ? (
          <Minimize2
            className={`h-[15px] w-[15px] ${HEADER_ICON_SYMBOL_HOVER}`}
            aria-hidden="true"
          />
        ) : (
          <Maximize2
            className={`h-[15px] w-[15px] ${HEADER_ICON_SYMBOL_HOVER}`}
            aria-hidden="true"
          />
        )}
      </Button>
    </HoverCalloutTooltip>
  );
}
