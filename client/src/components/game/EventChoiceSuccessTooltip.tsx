import React from "react";
import { useTranslation } from "react-i18next";
import type { EventChoice } from "@/game/rules/events";
import type { GameState } from "@shared/schema";
import { cn } from "@/lib/utils";

export type RelevantStat = "strength" | "knowledge" | "luck" | "madness";

export const EVENT_STAT_ICONS: Record<string, { icon: string; color: string }> = {
  luck: { icon: "☆", color: "text-green-300/80" },
  strength: { icon: "⬡", color: "text-red-300/80" },
  knowledge: { icon: "✧", color: "text-blue-300/80" },
  madness: { icon: "✺", color: "text-violet-300/80" },
};

export function RelevantStatIcon({
  stat,
  className,
  title,
}: {
  stat: string;
  className?: string;
  title?: string;
}) {
  const statInfo = EVENT_STAT_ICONS[stat.toLowerCase()];
  if (!statInfo) return null;
  return (
    <span
      className={cn(
        "font-noto-symbols-2 inline-flex shrink-0 items-center justify-center translate-y-px text-xs leading-none",
        statInfo.color,
        className,
      )}
      aria-hidden={title ? undefined : true}
      title={title}
    >
      {statInfo.icon}
    </span>
  );
}

type SuccessChanceValue = number | ((state: GameState) => number);

export function getSuccessPercent(
  successChance: SuccessChanceValue | undefined,
  gameState: GameState,
): number | null {
  if (successChance === undefined) {
    return null;
  }

  const rawChance =
    typeof successChance === "function"
      ? successChance(gameState)
      : successChance;

  return Math.round(Math.min(1, Math.max(0, rawChance)) * 100);
}

export function hasSuccessChanceTooltip(
  successChance: SuccessChanceValue | undefined,
  relevantStats?: RelevantStat[],
): boolean {
  return (
    successChance !== undefined &&
    successChance !== null &&
    (relevantStats?.length ?? 0) > 0
  );
}

interface SuccessChanceTooltipContentProps {
  gameState: GameState;
  successChance?: SuccessChanceValue;
  relevantStats?: RelevantStat[];
}

export function SuccessChanceTooltipContent({
  gameState,
  successChance,
  relevantStats = [],
}: SuccessChanceTooltipContentProps) {
  const { t } = useTranslation(["ui", "common"]);

  if (!hasSuccessChanceTooltip(successChance, relevantStats)) {
    return null;
  }

  const hasBookOfWar = !!gameState.books?.book_of_war;
  const percent = getSuccessPercent(successChance, gameState);

  return (
    <div className="text-xs whitespace-nowrap">
      {hasBookOfWar && percent !== null ? (
        <div>{t("ui:event.successChance", { percent })}</div>
      ) : (
        <div>{t("ui:event.successChanceLocked")}</div>
      )}
      {relevantStats.length > 0 && (
        <>
          <div className="mt-1">{t("ui:event.influencedBy")}</div>
          {relevantStats.map((stat) => (
            <div key={stat} className="flex items-center gap-1.5">
              <RelevantStatIcon stat={stat} />
              <span>{t(`common:stats.${stat.toLowerCase()}`)}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export function getEventChoiceSuccessPercent(
  choice: EventChoice,
  gameState: GameState,
): number | null {
  return getSuccessPercent(choice.success_chance, gameState);
}

export function hasEventChoiceSuccessTooltip(choice: EventChoice): boolean {
  return hasSuccessChanceTooltip(choice.success_chance, choice.relevant_stats);
}

interface EventChoiceSuccessTooltipContentProps {
  choice: EventChoice;
  gameState: GameState;
}

export function EventChoiceSuccessTooltipContent({
  choice,
  gameState,
}: EventChoiceSuccessTooltipContentProps) {
  return (
    <SuccessChanceTooltipContent
      gameState={gameState}
      successChance={choice.success_chance}
      relevantStats={choice.relevant_stats}
    />
  );
}
