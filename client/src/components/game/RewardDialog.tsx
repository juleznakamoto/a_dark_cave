import React from "react";
import { GameState } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface RewardDialogData {
  rewards: {
    resources?: Partial<Record<keyof GameState["resources"], number>>;
    resourceLosses?: Partial<Record<keyof GameState["resources"], number>>;
    villagersLost?: number;
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
  variant?: "success" | "loss";
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

// Sort resource keys: gold first, silver second, then rest alphabetically
const sortResourceKeys = (keys: string[]) => {
  return [...keys].sort((a, b) => {
    if (a === "gold") return -1;
    if (b === "gold") return 1;
    if (a === "silver") return -1;
    if (b === "silver") return 1;
    return a.localeCompare(b);
  });
};

export default function RewardDialog({
  isOpen,
  data,
  onClose,
}: RewardDialogProps) {
  if (!data) return null;

  const { rewards, successLog, variant = "success" } = data;
  const isLossVariant = variant === "loss";
  // Helper to render a list of rewards (order: Stats, Fellowship, Items, Resources)
  const renderRewards = () => {
    const rewardItems: JSX.Element[] = [];

    // 1. Stats (first)
    if (rewards.stats && Object.keys(rewards.stats).length > 0) {
      Object.entries(rewards.stats).forEach(([stat, amount]) => {
        if (stat === "madness" || stat === "madnessFromEvents") {
          return;
        }
        rewardItems.push(
          <div key={`stat-${stat}`} className="text-sm text-foreground">
            +{amount} {formatName(stat)}
          </div>,
        );
      });
    }

    // 2. Fellowship
    if (rewards.fellowship && rewards.fellowship.length > 0) {
      rewards.fellowship.forEach((member) => {
        rewardItems.push(
          <div key={`fellowship-${member}`} className="text-sm text-foreground">
            {formatName(member)}
          </div>,
        );
      });
    }

    // 3. Items (tools, weapons, clothing, relics, blessings, books, schematics)
    if (rewards.tools && rewards.tools.length > 0) {
      rewards.tools.forEach((tool) => {
        rewardItems.push(
          <div key={`tool-${tool}`} className="text-sm text-foreground">
            {formatName(tool)}
          </div>,
        );
      });
    }
    if (rewards.weapons && rewards.weapons.length > 0) {
      rewards.weapons.forEach((weapon) => {
        rewardItems.push(
          <div key={`weapon-${weapon}`} className="text-sm text-foreground">
            {formatName(weapon)}
          </div>,
        );
      });
    }
    if (rewards.clothing && rewards.clothing.length > 0) {
      rewards.clothing.forEach((clothing) => {
        rewardItems.push(
          <div key={`clothing-${clothing}`} className="text-sm text-foreground">
            {formatName(clothing)}
          </div>,
        );
      });
    }
    if (rewards.relics && rewards.relics.length > 0) {
      rewards.relics.forEach((relic) => {
        rewardItems.push(
          <div key={`relic-${relic}`} className="text-sm text-foreground">
            {formatName(relic)}
          </div>,
        );
      });
    }
    if (rewards.blessings && rewards.blessings.length > 0) {
      rewards.blessings.forEach((blessing) => {
        rewardItems.push(
          <div key={`blessing-${blessing}`} className="text-sm text-foreground">
            {formatName(blessing)}
          </div>,
        );
      });
    }
    if (rewards.books && rewards.books.length > 0) {
      rewards.books.forEach((book) => {
        rewardItems.push(
          <div key={`book-${book}`} className="text-sm text-foreground">
            {formatName(book)}
          </div>,
        );
      });
    }
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

    // 4. Resources (gold first, silver second, then rest)
    if (rewards.resources && Object.keys(rewards.resources).length > 0) {
      const sortedKeys = sortResourceKeys(Object.keys(rewards.resources));
      sortedKeys.forEach((resource) => {
        const amount = rewards.resources![resource as keyof typeof rewards.resources];
        rewardItems.push(
          <div key={`resource-${resource}`} className="text-sm text-foreground">
            {amount} {formatName(resource)}
          </div>,
        );
      });
    }

    return <div className="space-y-2">{rewardItems}</div>;
  };

  const renderLosses = () => {
    const lossItems: JSX.Element[] = [];

    // Villagers lost always first
    if (typeof rewards.villagersLost === "number" && rewards.villagersLost > 0) {
      lossItems.push(
        <div key="villagers-lost" className="text-sm text-foreground">
          -{rewards.villagersLost} {rewards.villagersLost === 1 ? "Villager" : "Villagers"}
        </div>
      );
    }

    // Resource losses (gold first, silver second, then rest)
    if (rewards.resourceLosses && Object.keys(rewards.resourceLosses).length > 0) {
      const sortedKeys = sortResourceKeys(Object.keys(rewards.resourceLosses));
      sortedKeys.forEach((resource) => {
        const amount = rewards.resourceLosses![resource as keyof typeof rewards.resourceLosses];
        lossItems.push(
          <div key={`resource-loss-${resource}`} className="text-sm text-foreground">
            -{amount} {formatName(resource)}
          </div>
        );
      });
    }

    if (lossItems.length === 0) return null;
    return <div className="space-y-2">{lossItems}</div>;
  };

  const hasRewardItems =
    (!!rewards.resources && Object.keys(rewards.resources).length > 0) ||
    !!rewards.tools?.length ||
    !!rewards.weapons?.length ||
    !!rewards.clothing?.length ||
    !!rewards.relics?.length ||
    !!rewards.blessings?.length ||
    !!rewards.books?.length ||
    !!rewards.schematics?.length ||
    !!rewards.fellowship?.length ||
    (!!rewards.stats && Object.keys(rewards.stats).length > 0);
  const hasLosses =
    (typeof rewards.villagersLost === "number" && rewards.villagersLost > 0) ||
    (!!rewards.resourceLosses && Object.keys(rewards.resourceLosses).length > 0);

  return (
    <>
      <style>{`
        .reward-dialog-glow-success {
          animation: reward-glow-pulse-success 2.5s ease-in-out infinite;
        }
        .reward-dialog-glow-loss {
          animation: reward-glow-pulse-loss 2.5s ease-in-out infinite;
        }
        @keyframes reward-glow-pulse-success {
          0%, 100% {
            box-shadow: 0 0 15px 5px rgba(234, 179, 8, 0.25);
          }
          50% {
            box-shadow: 0 0 0px 0px rgba(234, 179, 8, 0.5);
          }
        }
        @keyframes reward-glow-pulse-loss {
          0%, 100% {
            box-shadow: 0 0 15px 5px rgba(146, 64, 14, 0.35);
          }
          50% {
            box-shadow: 0 0 0px 0px rgba(146, 64, 14, 0.6);
          }
        }
      `}</style>
      <Dialog open={isOpen} onOpenChange={() => { }}>
        <DialogContent
          className={`w-[95vw] sm:max-w-sm z-[70] [&>button]:hidden border-2 shadow-2xl ${
            isLossVariant ? "border-orange-800" : "border-amber-600"
          }`}
        >
          <div
            className={`absolute inset-0 -z-10 pointer-events-none ${
              isLossVariant ? "reward-dialog-glow-loss" : "reward-dialog-glow-success"
            }`}
          ></div>
          <DialogHeader>
            <div className="flex justify-center">
              <span className="text-4xl text-white">⁂</span>
            </div>
            {successLog && (
              <div className="text-sm text-foreground text-center px-2 pb-3">
                {successLog}
              </div>
            )}
            <div className="my-3 h-px w-full bg-white/10" />
            <DialogTitle className="sr-only">Action Reward</DialogTitle>
          </DialogHeader>

          <div className="text-sm pb-2 space-y-4">
            {hasRewardItems && (
              <div>{renderRewards()}</div>
            )}
            {hasLosses && (
              <div>{renderLosses()}</div>
            )}
          </div>

          <div className="flex justify-center">
            <Button
              onClick={onClose}
              variant="outline"
              className="text-xs h-8"
              button_id="reward-dialog-continue"
            >
              {isLossVariant ? "Continue" : "Claim Rewards"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
