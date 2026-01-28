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

  const { rewards } = data;

  // Helper to render a list of rewards
  const renderRewards = () => {
    const rewardItems: JSX.Element[] = [];

    // Resources
    if (rewards.resources && Object.keys(rewards.resources).length > 0) {
      Object.entries(rewards.resources).forEach(([resource, amount]) => {
        rewardItems.push(
          <div key={`resource-${resource}`} className="text-sm text-foreground">
            {amount} {formatName(resource)}
          </div>
        );
      });
    }

    // Tools
    if (rewards.tools && rewards.tools.length > 0) {
      rewards.tools.forEach((tool) => {
        rewardItems.push(
          <div key={`tool-${tool}`} className="text-sm text-foreground">
            {formatName(tool)}
          </div>
        );
      });
    }

    // Weapons
    if (rewards.weapons && rewards.weapons.length > 0) {
      rewards.weapons.forEach((weapon) => {
        rewardItems.push(
          <div key={`weapon-${weapon}`} className="text-sm text-foreground">
            {formatName(weapon)}
          </div>
        );
      });
    }

    // Clothing
    if (rewards.clothing && rewards.clothing.length > 0) {
      rewards.clothing.forEach((clothing) => {
        rewardItems.push(
          <div key={`clothing-${clothing}`} className="text-sm text-foreground">
            {formatName(clothing)}
          </div>
        );
      });
    }

    // Relics
    if (rewards.relics && rewards.relics.length > 0) {
      rewards.relics.forEach((relic) => {
        rewardItems.push(
          <div key={`relic-${relic}`} className="text-sm text-foreground">
            {formatName(relic)}
          </div>
        );
      });
    }

    // Blessings
    if (rewards.blessings && rewards.blessings.length > 0) {
      rewards.blessings.forEach((blessing) => {
        rewardItems.push(
          <div key={`blessing-${blessing}`} className="text-sm text-foreground">
            {formatName(blessing)}
          </div>
        );
      });
    }

    // Books
    if (rewards.books && rewards.books.length > 0) {
      rewards.books.forEach((book) => {
        rewardItems.push(
          <div key={`book-${book}`} className="text-sm text-foreground">
            {formatName(book)}
          </div>
        );
      });
    }

    // Schematics
    if (rewards.schematics && rewards.schematics.length > 0) {
      rewards.schematics.forEach((schematic) => {
        rewardItems.push(
          <div key={`schematic-${schematic}`} className="text-sm text-foreground">
            {formatName(schematic)}
          </div>
        );
      });
    }

    // Fellowship
    if (rewards.fellowship && rewards.fellowship.length > 0) {
      rewards.fellowship.forEach((member) => {
        rewardItems.push(
          <div key={`fellowship-${member}`} className="text-sm text-foreground">
            {formatName(member)}
          </div>
        );
      });
    }

    // Stats
    if (rewards.stats && Object.keys(rewards.stats).length > 0) {
      Object.entries(rewards.stats).forEach(([stat, amount]) => {
        rewardItems.push(
          <div key={`stat-${stat}`} className="text-sm text-foreground">
            +{amount} {formatName(stat)}
          </div>
        );
      });
    }

    return (
      <div className="space-y-2">
        {rewardItems}
      </div>
    );
  };

  return (
    <>
      <style>{`
        .reward-badge {
          position: relative;
          width: 20vmin;
          height: 20vmin;
          background: linear-gradient(135deg, #1e1e24 10%, #050505 60%);
          display: flex;
          align-items: center;
          justify-content: center;
          user-select: none;
          animation: gradient-shift 5s ease-in-out infinite;
          background-size: 200% 200%;
        }

        .reward-badge-content {
          display: inline-block;
          vertical-align: baseline;
          user-select: none;
          font-size: 5vmin;
          color: white;
          background-image: linear-gradient(to right, #626262, #fff);
          -webkit-text-fill-color: transparent;
          -webkit-background-clip: text;
          font-weight: bold;
        }

        .reward-badge::before,
        .reward-badge::after {
          --size: 5px;
          content: "";
          position: absolute;
          top: calc(var(--size) / -2);
          left: calc(var(--size) / -2);
          width: calc(100% + var(--size));
          height: calc(100% + var(--size));
          background: radial-gradient(circle at 0 0, #ef4444, transparent),
            radial-gradient(circle at 100% 0, #ef4444, transparent),
            radial-gradient(circle at 0 100%, #ef4444, transparent),
            radial-gradient(circle at 100% 100%, #ef4444, transparent);
        }

        .reward-badge::after {
          --size: 2px;
          z-index: -1;
        }

        .reward-badge::before {
          --size: 10px;
          z-index: -2;
          filter: blur(2vmin);
          animation: blur-animation 3s ease-in-out alternate infinite;
        }

        @keyframes blur-animation {
          to {
            filter: blur(3vmin);
            transform: scale(1.05);
          }
        }

        @keyframes gradient-shift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
      <Dialog open={isOpen} onOpenChange={() => { }}>
        <DialogContent className="w-[95vw] sm:max-w-sm z-[70] [&>button]:hidden">
          <DialogHeader>
            <div className="flex justify-center mb-3">
              <div className="reward-badge">
                <div className="reward-badge-content">
                  <span className="text-2xl text-white">⁂</span>
                </div>
              </div>
            </div>
            <DialogTitle className="sr-only">You received</DialogTitle>
            <DialogDescription className="text-sm text-gray-400 text-center">
              You received
            </DialogDescription>
          </DialogHeader>

          <div className="pb-2">
            {renderRewards()}
          </div>

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