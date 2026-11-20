"use client";

import { useEffect, useRef, useState } from "react";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import cn from "clsx";
import { useCoinHoverParticles } from "@/components/ui/coin-hover-particles";
import { TRADER_TAB_PARTICLE_CONFIG } from "@/components/ui/bubbly-button.particles";
import { useGameStore } from "@/game/state";
import { GameUiIcon } from "@/components/game/GameUiIcon";
import {
  GOLD_ACCENT_MASK_ICON_CLASS,
  TAB_ICON_ALIGN_CLASS,
  TAB_ICON_SIZE_CLASS,
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
  const { t } = useUiTranslation();
  const iconRef = useRef<HTMLSpanElement>(null);
  const { hoverHandlers, portal, setForcedEmit } = useCoinHoverParticles("gold", {
    particleOriginRef: iconRef,
    particleConfig: TRADER_TAB_PARTICLE_CONFIG,
    zIndex: 50,
  });
  const [isHintActive, setIsHintActive] = useState(false);
  const setForcedEmitRef = useRef(setForcedEmit);
  setForcedEmitRef.current = setForcedEmit;

  // After the fade, stay on the gold coin glow. The shared green tab flash
  // paints this mask icon, and on a phone that reads as a hard green blink.
  const unlockAttention = isAnimating && !isFadePhase;
  const showActiveGlow = isHintActive || unlockAttention;

  useEffect(() => {
    setForcedEmitRef.current(showActiveGlow);
  }, [showActiveGlow]);

  useEffect(() => {
    let endTimeout: ReturnType<typeof setTimeout> | null = null;

    const endHint = () => {
      setIsHintActive(false);
      endTimeout = null;
    };

    const startHint = () => {
      if (useGameStore.getState().shopDialogOpen) return;

      setIsHintActive(true);
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
          isAnimating && isFadePhase && "tab-fade-in",
        )}
        onClick={onClick}
        data-testid="tab-trader"
      >
        <span ref={iconRef} className="inline-flex items-end" aria-hidden>
          <GameUiIcon
            name="trader"
            sizeClassName={TAB_ICON_SIZE_CLASS}
            className={cn(
              "text-yellow-500",
              TAB_ICON_ALIGN_CLASS,
              GOLD_ACCENT_MASK_ICON_CLASS,
              showActiveGlow && "gold-accent-mask-icon-active",
            )}
          />
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
              "col-start-1 row-start-1 font-medium transition-[opacity,color]",
              isAnimating && isFadePhase
                ? ""
                : showActiveGlow
                  ? "opacity-100 font-semibold text-yellow-500"
                  : isPaused
                    ? tabInactiveTextClass
                    : "opacity-80 group-hover:opacity-100 group-hover:font-semibold group-hover:text-yellow-500",
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
