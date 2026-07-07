"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import cn from "clsx";
import { useCoinHoverParticles } from "@/components/ui/coin-hover-particles";
import { TRADER_TAB_PARTICLE_CONFIG } from "@/components/ui/bubbly-button.particles";
import { useGameStore } from "@/game/state";

const TRADER_TAB_HINT_INTERVAL_MS = 15 * 60 * 1000;
const TRADER_TAB_HINT_DURATION_MS = 10 * 1000;

/** Intense lime glow when hovered, focused, or hint-pulsing (full class strings for Tailwind). */
const TRADER_ICON_GLOW_ACTIVE =
  "[text-shadow:0_0_4px_rgba(132,204,22,1),0_0_8px_rgba(132,204,22,1),0_0_16px_rgba(132,204,22,1)]";
const TRADER_ICON_GLOW_ACTIVE_HOVER =
  "group-hover:[text-shadow:0_0_4px_rgba(132,204,22,1),0_0_8px_rgba(132,204,22,1),0_0_16px_rgba(132,204,22,1),0_0_32px_rgba(132,204,22,1)] group-focus-visible:[text-shadow:0_0_4px_rgba(132,204,22,1),0_0_8px_rgba(132,204,22,1),0_0_16px_rgba(132,204,22,1),0_0_32px_rgba(132,204,22,1)]";

interface TraderTabButtonProps {
  tabButtonClass: string;
  tabInactiveTextClass: string;
  isPaused: boolean;
  isAnimating: boolean;
  isFadePhase: boolean;
  onClick: () => void;
}

export function TraderTabButton({
  tabButtonClass,
  tabInactiveTextClass,
  isPaused,
  isAnimating,
  isFadePhase,
  onClick,
}: TraderTabButtonProps) {
  const { t } = useTranslation();
  const iconRef = useRef<HTMLSpanElement>(null);
  const { hoverHandlers, portal, setForcedEmit } = useCoinHoverParticles("gold", {
    particleOriginRef: iconRef,
    particleConfig: TRADER_TAB_PARTICLE_CONFIG,
    zIndex: 50,
  });
  const [isHintActive, setIsHintActive] = useState(false);
  const setForcedEmitRef = useRef(setForcedEmit);
  setForcedEmitRef.current = setForcedEmit;

  const showActiveGlow = isHintActive;

  useEffect(() => {
    let endTimeout: ReturnType<typeof setTimeout> | null = null;

    const endHint = () => {
      setIsHintActive(false);
      setForcedEmitRef.current(false);
      endTimeout = null;
    };

    const startHint = () => {
      if (useGameStore.getState().shopDialogOpen) return;

      setIsHintActive(true);
      setForcedEmitRef.current(true);
      if (endTimeout) clearTimeout(endTimeout);
      endTimeout = setTimeout(endHint, TRADER_TAB_HINT_DURATION_MS);
    };

    const intervalId = setInterval(startHint, TRADER_TAB_HINT_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
      if (endTimeout) {
        clearTimeout(endTimeout);
        endHint();
      }
    };
  }, []);

  return (
    <>
      <button
        type="button"
        {...hoverHandlers}
        className={cn(
          tabButtonClass,
          "group shrink-0 gap-1.5",
          isAnimating ? (isFadePhase ? "tab-fade-in" : "tab-blink-new") : "",
        )}
        onClick={onClick}
        data-testid="tab-trader"
      >
        <span
          ref={iconRef}
          className={cn(
            "font-noto-symbols-2 text-[19px] leading-none text-lime-500 transition-[opacity,text-shadow] translate-y-[4px]",
            showActiveGlow
              ? cn("opacity-100", TRADER_ICON_GLOW_ACTIVE)
              : cn(
                "opacity-80",
                "group-hover:opacity-100 group-focus-visible:opacity-100",
                TRADER_ICON_GLOW_ACTIVE_HOVER,
              ),
          )}
          aria-hidden
        >
          ◬
        </span>
        <span className="inline-grid">
          <span
            className="invisible col-start-1 row-start-1 font-semibold"
            aria-hidden
          >
            {t("tabs.trader", { ns: "common" })}
          </span>
          <span
            className={cn(
              "col-start-1 row-start-1 font-normal transition-opacity",
              isAnimating
                ? ""
                : showActiveGlow
                  ? "opacity-100 font-semibold"
                  : isPaused
                    ? tabInactiveTextClass
                    : "opacity-80 group-hover:opacity-100 group-hover:font-semibold",
            )}
          >
            {t("tabs.trader", { ns: "common" })}
          </span>
        </span>
      </button>
      {portal}
    </>
  );
}
