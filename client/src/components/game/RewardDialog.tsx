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
  madnessChange?: number;
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
  if (!data) return null;

  const { rewards, successLog } = data;
  const madnessChange = data.madnessChange || 0;
  const isMadnessDialog = madnessChange !== 0;

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
        if (stat === "madness") {
          return;
        }
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
                .madness-dialog-glow {
                  animation: madness-glow-pulse 2.5s ease-in-out infinite;
                }

              @keyframes reward-glow-pulse {
                0%, 100% {
                  box-shadow: 0 0 15px 5px rgba(234, 179, 8, 0.25);
                }
                50% {
                  box-shadow: 0 0 0px 0px rgba(234, 179, 8, 0.5);
                }
              }
              @keyframes madness-glow-pulse {
                0%, 100% {
                  box-shadow: 0 0 15px 5px rgba(124, 58, 237, 0.25);
                }
                50% {
                  box-shadow: 0 0 0px 0px rgba(124, 58, 237, 0.5);
                }
              }
              `}</style>
      <Dialog open={isOpen} onOpenChange={() => { }}>
        <DialogContent
          className={`w-[95vw] sm:max-w-sm z-[70] [&>button]:hidden border-2 shadow-2xl ${
            isMadnessDialog ? "border-violet-600" : "border-amber-600"
          }`}
        >
          <div
            className={`absolute inset-0 -z-10 pointer-events-none ${
              isMadnessDialog ? "madness-dialog-glow" : "reward-dialog-glow"
            }`}
          ></div>
          <DialogHeader>
            <div className="flex justify-center">
              <span
                className={`text-4xl ${
                  isMadnessDialog ? "text-violet-300/90" : "text-white"
                }`}
              >
                {isMadnessDialog ? "✺" : "⁂"}
              </span>
            </div>
            {successLog && (
              <div className="text-sm text-foreground text-center px-2 pb-3">
                {successLog}
              </div>
            )}
            <div className="my-3 h-px w-full bg-white/10" />
            <DialogTitle className="sr-only">
              {isMadnessDialog ? "Madness Event" : "Action Reward"}
            </DialogTitle>
          </DialogHeader>

          <div className="text-sm pb-2">{renderRewards()}</div>

          {madnessChange !== 0 && (
            <div className="pt-4 mt-1">
              <div className="my-3 h-px w-full bg-white/10" />
              <div className="text-sm text-center text-violet-300 mt-3">
                {madnessChange > 0 ? "+" : "-"} {Math.abs(madnessChange)} Madness
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <Button
              onClick={onClose}
              variant="outline"
              className="text-xs h-8"
              button_id="reward-dialog-continue"
            >
              Claim Rewards
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
