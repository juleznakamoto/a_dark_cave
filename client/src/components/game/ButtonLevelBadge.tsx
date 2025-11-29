import React, { useState } from "react";
import { UpgradeKey, getButtonUpgradeInfo, getUpgradeLevelsForKey } from "@/game/buttonUpgrades";
import { useGameStore } from "@/game/state";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CircularProgress } from "@/components/ui/circular-progress";

interface ButtonLevelBadgeProps {
  upgradeKey: UpgradeKey;
}

export function ButtonLevelBadge({ upgradeKey }: ButtonLevelBadgeProps) {
  const buttonUpgrade = useGameStore(
    (state) => state.buttonUpgrades[upgradeKey],
  );
  const hasBook = useGameStore((state) => state.books?.book_of_ascension);
  const [isOpen, setIsOpen] = useState(false);

  if (!hasBook || !buttonUpgrade || buttonUpgrade.level === 0) {
    return null;
  }

  const info = getButtonUpgradeInfo(upgradeKey, buttonUpgrade);

  // Calculate progress within current level range
  const upgradeLevels = getUpgradeLevelsForKey(upgradeKey);
  const currentLevelStart = upgradeLevels[info.level]?.clicksRequired || 0;
  const nextLevelTarget = info.nextLevel?.clicksRequired || 0;
  const clicksInCurrentLevel = info.clicks - currentLevelStart;
  const clicksNeededForLevel = nextLevelTarget - currentLevelStart;
  const progressPercent = clicksNeededForLevel > 0 ? (clicksInCurrentLevel / clicksNeededForLevel) * 100 : 0;

  return (
    <TooltipProvider>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger
          asChild
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
        >
          <div
            className="absolute -top-[7px] right-[-7px] flex items-center justify-center w-4 h-4 bg-red-950 rounded-full text-[10px] font-medium cursor-pointer z-1 hover:bg-red-900 transition-colors duration-300 ease-in-out"
            data-testid={`level-badge-${upgradeKey}`}
          >
            {info.isMaxLevel ? '★' : info.level}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="max-w-xs bg-popover text-white border text-xs"
          data-testid={`level-tooltip-${upgradeKey}`}
        >
          <div className="space-y-1.5">
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
                      <div className="text-xs">
                        Bonus: <span className="font-medium">+{info.bonus}%</span>
                      </div>
                      <div className="text-xs">
                        Next bonus: <span className="font-medium">+{info.nextLevel.bonus}%</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex justify-between gap-1">
                  <span>Bonus:</span>
                  <span>+{info.bonus}%</span>
                </div>
              )}
              {info.isMaxLevel && (
                <div className="mt-1 pt-1 border-t ">max level</div>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}