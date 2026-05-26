import React from "react";
import { useTranslation } from "react-i18next";
import type { EventChoice } from "@/game/rules/events";
import type { GameState } from "@shared/schema";

const EVENT_STAT_ICONS: Record<string, { icon: string; color: string }> = {
  luck: { icon: "☆", color: "text-green-300/80" },
  strength: { icon: "⬡", color: "text-red-300/80" },
  knowledge: { icon: "✧", color: "text-blue-300/80" },
  madness: { icon: "✺", color: "text-violet-300/80" },
};

export function getEventChoiceSuccessPercent(
  choice: EventChoice,
  gameState: GameState,
): number | null {
  if (choice.success_chance === undefined) {
    return null;
  }

  const rawChance =
    typeof choice.success_chance === "function"
      ? choice.success_chance(gameState)
      : choice.success_chance;

  return Math.round(Math.min(1, Math.max(0, rawChance)) * 100);
}

export function hasEventChoiceSuccessTooltip(choice: EventChoice): boolean {
  return choice.success_chance !== undefined;
}

interface EventChoiceSuccessTooltipContentProps {
  choice: EventChoice;
  gameState: GameState;
}

export function EventChoiceSuccessTooltipContent({
  choice,
  gameState,
}: EventChoiceSuccessTooltipContentProps) {
  const { t } = useTranslation(["ui", "common"]);
  const hasBookOfWar = !!gameState.books?.book_of_war;
  const percent = getEventChoiceSuccessPercent(choice, gameState);
  const stats = choice.relevant_stats ?? [];

  return (
    <div className="text-xs whitespace-nowrap">
      {hasBookOfWar && percent !== null ? (
        <div>{t("ui:event.successChance", { percent })}</div>
      ) : (
        <div>{t("ui:event.successChanceLocked")}</div>
      )}
      {stats.length > 0 && (
        <>
          <div className="mt-1">{t("ui:event.influencedBy")}</div>
          {stats.map((stat) => {
            const statInfo = EVENT_STAT_ICONS[stat.toLowerCase()];
            if (!statInfo) return null;
            return (
              <div key={stat} className="flex items-center gap-1">
                <span className={`font-noto-symbols-2 ${statInfo.color}`}>
                  {statInfo.icon}
                </span>
                <span>{t(`common:stats.${stat.toLowerCase()}`)}</span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
