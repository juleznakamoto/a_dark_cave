import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useGameStore } from "@/game/state";
import { publicUrl } from "@/lib/publicUrl";
import { useUiNow } from "@/lib/uiClock";
import { formatCompactDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { gameActionButtonGridClassName } from "@/components/CooldownButton";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import {
  SuccessParticles,
  useFeedFireParticles,
} from "@/components/ui/feed-fire-particles";
import { getEffectName } from "@/i18n/resolveGameText";
import {
  WANDERERS_LANTERN_ACTIVE_MS,
  WANDERERS_LANTERN_COOLDOWN_MS,
  WANDERERS_LANTERN_SILVER_AMOUNT,
  WANDERERS_LANTERN_SILVER_CHANCE,
  WANDERERS_LANTERN_TOOL_ID,
  activateWanderersLantern,
  isWanderersLanternReady,
  ownsWanderersLantern,
  wanderersLanternActiveUntil,
  wanderersLanternCooldownUntil,
} from "@/game/wanderersLantern";

const BURST_MS = 700;

export function WanderersLanternButton() {
  const { t } = useTranslation("ui");
  const owned = useGameStore((s) => ownsWanderersLantern(s));
  const activeUntil = useGameStore((s) => wanderersLanternActiveUntil(s));
  const cooldownUntil = useGameStore((s) => wanderersLanternCooldownUntil(s));
  const now = useUiNow(
    owned && Math.max(activeUntil, cooldownUntil) > Date.now(),
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { sparks, spawnParticles } = useFeedFireParticles();
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    if (!burst) return;
    const timer = window.setTimeout(() => setBurst(false), BURST_MS);
    return () => window.clearTimeout(timer);
  }, [burst]);

  if (!owned) return null;

  const lit = activeUntil > now;
  const cooling = !lit && cooldownUntil > now;
  const ready = !lit && !cooling;
  const remainingSec = Math.max(0, ((lit ? activeUntil : cooldownUntil) - now) / 1000);
  const name = getEffectName(
    "tools",
    WANDERERS_LANTERN_TOOL_ID,
    "Wanderer's Lantern",
  );
  const durationVars = {
    active: WANDERERS_LANTERN_ACTIVE_MS / 60_000,
    cooldown: WANDERERS_LANTERN_COOLDOWN_MS / 60_000,
    percent: Math.round(WANDERERS_LANTERN_SILVER_CHANCE * 100),
    amount: WANDERERS_LANTERN_SILVER_AMOUNT,
  };

  const tooltip = (
    <div className="max-w-[16rem] space-y-1 text-xs">
      <div className="font-bold">{name}</div>
      <div>
        {ready
          ? t("tooltips.wanderersLanternLight", durationVars)
          : lit
            ? t("tooltips.wanderersLanternLit", durationVars)
            : t("tooltips.wanderersLanternCooling")}
      </div>
      {lit || cooling ? (
        <div className="text-muted-foreground">
          {t("tooltips.timeRemaining", {
            duration: formatCompactDuration(remainingSec),
          })}
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <TooltipWrapper tooltip={tooltip} tooltipId="wanderers-lantern">
        <button
          ref={buttonRef}
          type="button"
          data-testid="wanderers-lantern"
          aria-label={name}
          aria-disabled={!ready || undefined}
          className={cn(
            "wanderers-lantern adc-btn-size-xs relative inline-flex w-7 shrink-0 items-center justify-center bg-transparent p-0",
            ready && "wanderers-lantern--ready cursor-pointer",
            lit && "wanderers-lantern--active",
            burst && "wanderers-lantern--burst",
            !ready && "cursor-default",
          )}
          onClick={() => {
            const state = useGameStore.getState();
            if (!isWanderersLanternReady(state)) return;
            spawnParticles(50, buttonRef, { fromCenter: true });
            setBurst(true);
            useGameStore.setState(activateWanderersLantern(state));
          }}
        >
          <span className="wanderers-lantern__glow" aria-hidden />
          <img
            src={publicUrl("/icons/wanderers_lantern.svg")}
            alt=""
            draggable={false}
            className="relative z-[1] h-6 w-auto"
          />
        </button>
      </TooltipWrapper>
      <SuccessParticles buttonRef={buttonRef} sparks={sparks} />
    </>
  );
}

/**
 * Sits in the same gap as the action buttons, immediately after the rightmost
 * button on the first row. Later rows stay left-aligned underneath.
 */
export function WanderersLanternFirstRow({ children }: { children: ReactNode }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    const measure = () => {
      const buttons = [...row.children].filter(
        (child): child is HTMLElement =>
          child instanceof HTMLElement &&
          child.dataset.wanderersLanternAnchor == null,
      );
      if (buttons.length === 0) {
        setPlace((prev) =>
          prev && prev.left === 0 && prev.top === 0 ? prev : { left: 0, top: 0 },
        );
        return;
      }
      const firstTop = Math.min(...buttons.map((button) => button.offsetTop));
      const rightmost = buttons.reduce((best, button) => {
        if (Math.abs(button.offsetTop - firstTop) > 2) return best;
        const bestRight = best.offsetLeft + best.offsetWidth;
        const buttonRight = button.offsetLeft + button.offsetWidth;
        return buttonRight >= bestRight ? button : best;
      }, buttons[0]);
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      const left = rightmost.offsetLeft + rightmost.offsetWidth + gap;
      const top = rightmost.offsetTop;
      setPlace((prev) =>
        prev && Math.abs(prev.left - left) < 0.5 && Math.abs(prev.top - top) < 0.5
          ? prev
          : { left, top },
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    for (const child of row.children) {
      if (
        child instanceof HTMLElement &&
        child.dataset.wanderersLanternAnchor == null
      ) {
        observer.observe(child);
      }
    }
    return () => observer.disconnect();
  });

  return (
    <div ref={rowRef} className={gameActionButtonGridClassName("relative w-full")}>
      {children}
      <div
        data-wanderers-lantern-anchor=""
        className="absolute"
        style={
          place
            ? { left: place.left, top: place.top }
            : { left: 0, top: 0, visibility: "hidden" }
        }
      >
        <WanderersLanternButton />
      </div>
    </div>
  );
}
