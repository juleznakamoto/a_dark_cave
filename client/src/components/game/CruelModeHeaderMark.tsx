import { useEffect, useState } from "react";
import { CruelModePentagramIcon } from "@/components/game/GameUiIcon";
import { GAME_CHROME_NO_BG_HOVER } from "@/components/game/gameChrome";

const HEADER_ICON_BTN =
  `group shrink-0 p-0 w-7 h-7 flex items-center justify-center ${GAME_CHROME_NO_BG_HOVER}`;

/** Red pentagram used in the game header when Cruel Mode is on. */
export function CruelModeHeaderMark({
  label,
  sizeClassName = "game-header-cruel-icon",
}: {
  label: string;
  sizeClassName?: string;
}) {
  return (
    <span
      className={`${HEADER_ICON_BTN} cursor-default opacity-70 hover:opacity-100 transition-opacity`}
      aria-label={label}
      data-testid="cruel-mode-icon"
    >
      <CruelModePentagramIcon
        className="text-red-600"
        sizeClassName={sizeClassName}
      />
    </span>
  );
}

type HoverCalloutTooltipComponent =
  typeof import("@/components/game/HoverCalloutTooltip").HoverCalloutTooltip;

/**
 * Start-screen corner mark. The image paints immediately. The header callout
 * loads on demand so the public start screen does not pull the game store.
 */
export function StartScreenCruelModeIcon({ label }: { label: string }) {
  const [HoverCalloutTooltipCmp, setHoverCalloutTooltipCmp] =
    useState<HoverCalloutTooltipComponent | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("@/components/game/HoverCalloutTooltip").then((mod) => {
      if (!cancelled) setHoverCalloutTooltipCmp(() => mod.HoverCalloutTooltip);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const mark = (
    <CruelModeHeaderMark label={label} sizeClassName="game-start-cruel-icon" />
  );
  if (!HoverCalloutTooltipCmp) return mark;

  return (
    <HoverCalloutTooltipCmp label={label} side="bottom">
      {mark}
    </HoverCalloutTooltipCmp>
  );
}
