import { useState } from "react";
import { UpgradeKey, getButtonUpgradeInfo } from "@/game/buttonUpgrades";
import { useGameStore } from "@/game/state";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ButtonLevelBadgeProps {
  upgradeKey: UpgradeKey;
}

export function ButtonLevelBadge({ upgradeKey }: ButtonLevelBadgeProps) {
  const buttonUpgrade = useGameStore((state) => state.buttonUpgrades[upgradeKey]);
  const [isOpen, setIsOpen] = useState(false);

  if (!buttonUpgrade || buttonUpgrade.level === 0) {
    return null;
  }

  const info = getButtonUpgradeInfo(upgradeKey, buttonUpgrade);

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
            className="absolute -top-[7px] right-[-7px] flex items-center justify-center w-4 h-4 bg-gradient-to-br from-gray-800 to-gray-900 dark:from-amber-400 rounded-full text-[10px] font-medium shadow-lg border border-gray-400 cursor-help z-50"
            style={{ overflow: 'visible' }}
            data-testid={`level-badge-${upgradeKey}`}
          >
            {info.level}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="max-w-xs bg-gray-900 dark:bg-gray-800 text-white dark:text-gray-100 border-gray-700 dark:border-gray-600"
          data-testid={`level-tooltip-${upgradeKey}`}
        >
          <div className="space-y-1.5">
            <div className="font-bold text-amber-400 dark:text-amber-300">
              {info.upgradeName}
            </div>
            <div className="text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-gray-400 dark:text-gray-500">Level:</span>
                <span className="font-semibold">
                  {info.level} - {info.label}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400 dark:text-gray-500">Bonus:</span>
                <span className="text-green-400 dark:text-green-300 font-semibold">
                  +{info.bonus}%
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400 dark:text-gray-500">Clicks:</span>
                <span>{info.clicks.toLocaleString()}</span>
              </div>
              {!info.isMaxLevel && info.nextLevel && (
                <>
                  <div className="border-t border-gray-700 dark:border-gray-600 my-1.5 pt-1.5">
                    <div className="text-gray-400 dark:text-gray-500 text-xs mb-1">
                      Next Level:
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400 dark:text-gray-500 text-xs">
                        {info.nextLevel.label}
                      </span>
                      <span className="text-green-400 dark:text-green-300 text-xs">
                        +{info.nextLevel.bonus}%
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400 dark:text-gray-500 text-xs">
                        Clicks needed:
                      </span>
                      <span className="text-xs">{info.clicksNeeded}</span>
                    </div>
                  </div>
                </>
              )}
              {info.isMaxLevel && (
                <div className="text-amber-400 dark:text-amber-300 text-xs font-semibold mt-1 pt-1 border-t border-gray-700 dark:border-gray-600">
                  MAX LEVEL
                </div>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
