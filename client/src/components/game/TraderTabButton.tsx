"use client";

import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useCoinHoverParticles } from "@/components/ui/coin-hover-particles";
import { TRADER_TAB_PARTICLE_CONFIG } from "@/components/ui/bubbly-button.particles";

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
  const { hoverHandlers, portal } = useCoinHoverParticles("gold", {
    particleOriginRef: iconRef,
    particleConfig: TRADER_TAB_PARTICLE_CONFIG,
    zIndex: 50,
  });

  return (
    <>
      <button
        type="button"
        {...hoverHandlers}
        className={`${tabButtonClass} group shrink-0 gap-1.5 pl-2 ${isAnimating
          ? isFadePhase
            ? "tab-fade-in"
            : "tab-blink-new"
          : ""
          }`}
        onClick={onClick}
        data-testid="tab-trader"
      >
        <span
          ref={iconRef}
          className="font-noto-symbols-2 text-[19px] leading-none text-lime-500 opacity-80 transition-[opacity,text-shadow] group-hover:opacity-100 group-hover:[text-shadow:0_0_14px_rgba(132,204,22,0.95),0_0_28px_rgba(132,204,22,0.55)] group-focus-visible:opacity-100 group-focus-visible:[text-shadow:0_0_14px_rgba(132,204,22,0.95),0_0_28px_rgba(132,204,22,0.55)] relative top-px"
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
            className={`col-start-1 row-start-1 font-normal transition-opacity group-hover:font-semibold ${isAnimating
              ? ""
              : isPaused
                ? tabInactiveTextClass
                : "opacity-80 group-hover:opacity-100"
              }`}
          >
            {t("tabs.trader", { ns: "common" })}
          </span>
        </span>
      </button>
      {portal}
    </>
  );
}
