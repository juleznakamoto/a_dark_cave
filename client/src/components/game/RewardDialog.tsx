import React from "react";
import { GameState } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface RewardDialogData {
  rewards: {
    resources?: Partial<Record<keyof GameState["resources"], number>>;
    tools?: (keyof GameState["tools"])[];
    weapons?: (keyof GameState["weapons"])[];
    clothing?: (keyof GameState["clothing"])[];
    relics?: (keyof GameState["relics"])[];
    blessings?: (keyof GameState["blessings"])[];
    books?: (keyof GameState["books"])[];
    schematics?: (keyof GameState["schematics"])[];
    fellowship?: (keyof GameState["fellowship"])[];
    stats?: Partial<GameState["stats"]>;
  };
  successLog?: string;
}

interface RewardDialogProps {
  isOpen: boolean;
  data: RewardDialogData | null;
  onClose: () => void;
}

// Helper function to format resource/item names (snake_case to Title Case)
const formatName = (name: string) => {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function RewardDialog({
  isOpen,
  data,
  onClose,
}: RewardDialogProps) {
  console.log("[REWARD DIALOG COMPONENT] Render called", {
    isOpen,
    hasData: !!data,
    data: data ? JSON.stringify(data, null, 2) : null,
  });

  if (!data) {
    console.log("[REWARD DIALOG COMPONENT] No data, returning null");
    return null;
  }

  const { rewards, successLog } = data;
  console.log("[REWARD DIALOG COMPONENT] Extracted values", {
    hasRewards: !!rewards,
    rewardsKeys: rewards ? Object.keys(rewards) : [],
    successLog,
    successLogType: typeof successLog,
    successLogLength: successLog ? successLog.length : 0,
  });

  // Helper to render a list of rewards
  const renderRewards = () => {
    const rewardItems: JSX.Element[] = [];

    // Resources
    if (rewards.resources && Object.keys(rewards.resources).length > 0) {
      Object.entries(rewards.resources).forEach(([resource, amount]) => {
        rewardItems.push(
          <div key={`resource-${resource}`} className="text-sm text-foreground">
            {amount} {formatName(resource)}
          </div>,
        );
      });
    }

    // Tools
    if (rewards.tools && rewards.tools.length > 0) {
      rewards.tools.forEach((tool) => {
        rewardItems.push(
          <div key={`tool-${tool}`} className="text-sm text-foreground">
            {formatName(tool)}
          </div>,
        );
      });
    }

    // Weapons
    if (rewards.weapons && rewards.weapons.length > 0) {
      rewards.weapons.forEach((weapon) => {
        rewardItems.push(
          <div key={`weapon-${weapon}`} className="text-sm text-foreground">
            {formatName(weapon)}
          </div>,
        );
      });
    }

    // Clothing
    if (rewards.clothing && rewards.clothing.length > 0) {
      rewards.clothing.forEach((clothing) => {
        rewardItems.push(
          <div key={`clothing-${clothing}`} className="text-sm text-foreground">
            {formatName(clothing)}
          </div>,
        );
      });
    }

    // Relics
    if (rewards.relics && rewards.relics.length > 0) {
      rewards.relics.forEach((relic) => {
        rewardItems.push(
          <div key={`relic-${relic}`} className="text-sm text-foreground">
            {formatName(relic)}
          </div>,
        );
      });
    }

    // Blessings
    if (rewards.blessings && rewards.blessings.length > 0) {
      rewards.blessings.forEach((blessing) => {
        rewardItems.push(
          <div key={`blessing-${blessing}`} className="text-sm text-foreground">
            {formatName(blessing)}
          </div>,
        );
      });
    }

    // Books
    if (rewards.books && rewards.books.length > 0) {
      rewards.books.forEach((book) => {
        rewardItems.push(
          <div key={`book-${book}`} className="text-sm text-foreground">
            {formatName(book)}
          </div>,
        );
      });
    }

    // Schematics
    if (rewards.schematics && rewards.schematics.length > 0) {
      rewards.schematics.forEach((schematic) => {
        rewardItems.push(
          <div
            key={`schematic-${schematic}`}
            className="text-sm text-foreground"
          >
            {formatName(schematic)}
          </div>,
        );
      });
    }

    // Fellowship
    if (rewards.fellowship && rewards.fellowship.length > 0) {
      rewards.fellowship.forEach((member) => {
        rewardItems.push(
          <div key={`fellowship-${member}`} className="text-sm text-foreground">
            {formatName(member)}
          </div>,
        );
      });
    }

    // Stats
    if (rewards.stats && Object.keys(rewards.stats).length > 0) {
      Object.entries(rewards.stats).forEach(([stat, amount]) => {
        rewardItems.push(
          <div key={`stat-${stat}`} className="text-sm text-foreground">
            +{amount} {formatName(stat)}
          </div>,
        );
      });
    }

    return <div className="space-y-2">{rewardItems}</div>;
  };

  return (
    <>
      <style>{`
                .reward-dialog-glow {
                  animation: reward-glow-pulse 2.5s ease-in-out infinite;
                }

                @keyframes reward-glow-pulse {
                  0%, 100% {
                    box-shadow: 0 0 15px 4px rgba(239, 68, 68, 0.25);
                  }
                  50% {
                    box-shadow: 0 0 5px 1px rgba(239, 68, 68, 0.5);
                  }
                }
              `}</style>
      <Dialog open={isOpen} onOpenChange={() => { }}>
        <DialogContent className="w-[95vw] sm:max-w-sm z-[70] [&>button]:hidden border-2 border-red-800 shadow-2xl">
          <div className="absolute inset-0 -z-10 reward-dialog-glow pointer-events-none"></div>
          <DialogHeader>
            <div className="flex justify-center mb-3">
              <span className="text-4xl text-white">⁂</span>
            </div>
            {successLog && (
              <div className="text-sm text-foreground text-center mb-3 px-2">
                {(() => {
                  console.log("[REWARD DIALOG COMPONENT] Rendering successLog:", successLog);
                  return successLog;
                })()}
              </div>
            )}
            {!successLog && (
              <div style={{ display: 'none' }}>
                {console.log("[REWARD DIALOG COMPONENT] successLog is falsy, not rendering")}
              </div>
            )}
            <DialogTitle className="sr-only">You received</DialogTitle>
            <DialogDescription className="text-sm text-gray-400 text-center">
              You received
            </DialogDescription>
          </DialogHeader>

          <div className="pb-2">{renderRewards()}</div>

          <DialogFooter>
            <Button
              onClick={onClose}
              className="w-full"
              button_id="reward-dialog-continue"
            >
              Claim Rewards
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
