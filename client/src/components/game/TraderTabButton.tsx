"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import cn from "clsx";
import { useCoinHoverParticles } from "@/components/ui/coin-hover-particles";
import { TRADER_TAB_PARTICLE_CONFIG } from "@/components/ui/bubbly-button.particles";
import { useGameStore } from "@/game/state";
import {
  LIME_ACCENT_BORDER_GLOW,
  LIME_ACCENT_BORDER_GLOW_HOVER,
  LIME_ACCENT_BORDER_IDLE,
  LIME_ACCENT_GLOW_TEXT_SHADOW_ACTIVE,
  LIME_ACCENT_GLOW_TEXT_SHADOW_HOVER,
  LIME_ACCENT_ICON_IDLE,
} from "./gameChrome";

const TRADER_TAB_HINT_INTERVAL_MS = 15 * 60 * 1000;
const TRADER_TAB_HINT_DURATION_MS = 10 * 1000;

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
    emitIntervalMs: 700,
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
          "group shrink-0",
          isAnimating ? (isFadePhase ? "tab-fade-in" : "tab-blink-new") : "",
        )}
        onClick={onClick}
        data-testid="tab-trader"
      >
        <span
          className={cn(
            // Compact chip; border (not ring) so rounded corners render.
            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 leading-none",
            LIME_ACCENT_BORDER_IDLE,
            LIME_ACCENT_BORDER_GLOW_HOVER,
            showActiveGlow && LIME_ACCENT_BORDER_GLOW,
          )}
        >
          <span
            ref={iconRef}
            className={cn(
              // ◬ sits high in its em-box; nudge down to optically center with the label.
              "font-noto-symbols-2 text-[16px] leading-none text-lime-500 translate-y-[2px]",
              LIME_ACCENT_ICON_IDLE,
              showActiveGlow
                ? cn("opacity-100", LIME_ACCENT_GLOW_TEXT_SHADOW_ACTIVE)
                : cn(LIME_ACCENT_GLOW_TEXT_SHADOW_HOVER),
            )}
            aria-hidden
          >
            ◬
          </span>
          <span
            className={cn(
              "font-normal transition-opacity",
              isAnimating
                ? ""
                : showActiveGlow
                  ? "opacity-100"
                  : isPaused
                    ? tabInactiveTextClass
                    : "opacity-80 group-hover:opacity-100",
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
