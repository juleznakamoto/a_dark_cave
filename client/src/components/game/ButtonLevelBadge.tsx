import React from "react";
import { UpgradeKey, getButtonUpgradeInfo, getMasteryClickRate, getUpgradeLevelsForKey } from "@/game/buttonUpgrades";
import { getCraftProduceAmount } from "@/game/craftUpgradeUtils";
import { useGameStore } from "@/game/state";
import { useDerivedGameState } from "@/game/useGameStoreWithoutTickClock";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { ActionTooltipSeparator } from "@/game/rules/actionTooltipLayout";
import {
  TOOLTIP_MUTED_CLASS,
  TOOLTIP_STACK_CLASS,
  TOOLTIP_TITLE_CLASS,
} from "@/game/tooltipMetrics";
import { CircularProgress } from "@/components/ui/circular-progress";
import { useUiTranslation } from "@/i18n/useUiTranslation";

interface ButtonLevelBadgeProps {
  upgradeKey: UpgradeKey;
}

const CRAFT_UPGRADE_KEYS: UpgradeKey[] = ["craftTorches", "craftBoneTotems", "craftLeatherTotems"];

export function ButtonLevelBadge({ upgradeKey }: ButtonLevelBadgeProps) {
  const { t } = useUiTranslation();
  const buttonUpgrade = useGameStore(
    (state) => state.buttonUpgrades[upgradeKey],
  );
  const hasBook = useGameStore((state) => state.books?.book_of_ascension);
  const masteryRate = useGameStore(getMasteryClickRate);
  const produceAmount = useDerivedGameState((s) =>
    getCraftProduceAmount(upgradeKey, s),
  );

  if (!hasBook) {
    return null;
  }

  const upgrade = buttonUpgrade ?? { clicks: 0, level: 0 };
  const info = getButtonUpgradeInfo(upgradeKey, upgrade);
  const isCraftUpgrade = CRAFT_UPGRADE_KEYS.includes(upgradeKey);

  // Calculate progress within current level range
  const upgradeLevels = getUpgradeLevelsForKey(upgradeKey);
  const currentLevelStart = upgradeLevels[info.level]?.clicksRequired || 0;
  const nextLevelTarget = info.nextLevel?.clicksRequired || 0;
  const clicksInCurrentLevel = info.clicks * masteryRate - currentLevelStart;
  const clicksNeededForLevel = nextLevelTarget - currentLevelStart;
  const progressPercent = clicksNeededForLevel > 0 ? (clicksInCurrentLevel / clicksNeededForLevel) * 100 : 0;

  const tooltip = (
    <div className={TOOLTIP_STACK_CLASS} data-testid={`level-tooltip-${upgradeKey}`}>
      <div className="">
        {!info.isMaxLevel && info.nextLevel ? (
          <>
            <div className="flex items-center gap-2">
              <div className="pt-1 relative">
                <CircularProgress
                  value={progressPercent}
                  size={24}
                  strokeWidth={2}
                />
                <div className="absolute mb-[0px] inset-0 flex items-center justify-center text-xs font-medium">
                  {info.level}
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <div>
                  {t("badges.bonus")}{" "}
                  <span className={TOOLTIP_TITLE_CLASS}>
                    {isCraftUpgrade && produceAmount !== undefined
                      ? t("badges.craftMultiplier", {
                        amount: produceAmount,
                      })
                      : t("badges.bonusPercent", {
                        percent: info.bonus,
                      })}
                  </span>
                </div>
                <div>
                  {t("badges.nextBonus")}{" "}
                  <span className={TOOLTIP_TITLE_CLASS}>
                    {isCraftUpgrade && produceAmount !== undefined && info.nextLevel
                      ? t("badges.craftMultiplier", {
                        amount: Math.floor(
                          1 * (1 + (info.nextLevel.bonus || 0) / 100),
                        ),
                      })
                      : t("badges.bonusPercent", {
                        percent: info.nextLevel.bonus,
                      })}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between gap-1">
              <span>{t("badges.bonus")}</span>
              <span>
                {isCraftUpgrade && produceAmount !== undefined
                  ? t("badges.craftMultiplier", { amount: produceAmount })
                  : t("badges.bonusPercent", { percent: info.bonus })}
              </span>
            </div>
            {isCraftUpgrade && info.isMaxLevel && (
              <div className={TOOLTIP_MUTED_CLASS}>
                {t("badges.executionTimeReduction")}
              </div>
            )}
          </div>
        )}
        {info.isMaxLevel && (
          <>
            <ActionTooltipSeparator />
            <div>{t("badges.maxLevel")}</div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <TooltipWrapper
      tooltip={tooltip}
      tooltipId={`level-badge-${upgradeKey}`}
      disabled
      side="right"
      tooltipTriggerAsChild
      className="button-level-badge game-corner-badge-digit z-[20] flex items-center justify-center bg-red-950 rounded-full cursor-default hover:bg-red-900 transition-colors duration-300 ease-in-out"
    >
      <div
        className="flex h-full w-full items-center justify-center"
        data-testid={`level-badge-${upgradeKey}`}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {info.isMaxLevel ? "★" : info.level}
      </div>
    </TooltipWrapper>
  );
}
