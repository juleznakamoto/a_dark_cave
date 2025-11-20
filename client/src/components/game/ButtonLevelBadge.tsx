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
  const buttonUpgrade = useGameStore(
    (state) => state.buttonUpgrades[upgradeKey],
  );
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
              <div className="flex justify-between gap-2">
                <span>Level:</span> <span>{info.level}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className=" ">Bonus:</span>
                <span>+{info.bonus}%</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Clicks:</span>
                <span>{info.clicks.toLocaleString()}</span>
              </div>
              {!info.isMaxLevel && info.nextLevel && (
                <>
                  <div className="border-t my-1.5 pt-1.5">
                    <div className="flex justify-between gap-2">
                      <span>Next Level:</span>
                      <span>{info.level + 1}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>Bonus</span>
                      <span>+{info.nextLevel.bonus}%</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>Clicks needed:</span>
                      <span>{info.nextLevel.clicksRequired}</span>
                    </div>
                  </div>
                </>
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
