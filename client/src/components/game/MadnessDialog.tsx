import React from "react";
import { GameState } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface MadnessDialogData {
  rewards?: {
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
  madnessChange: number;
}

interface MadnessDialogProps {
  isOpen: boolean;
  data: MadnessDialogData | null;
  onClose: () => void;
}

const formatName = (name: string) =>
  name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export default function MadnessDialog({ isOpen, data, onClose }: MadnessDialogProps) {
  if (!data || data.madnessChange === 0) return null;

  const { rewards, successLog, madnessChange } = data;

  const rewardItems: JSX.Element[] = [];

  if (rewards?.resources && Object.keys(rewards.resources).length > 0) {
    Object.entries(rewards.resources).forEach(([resource, amount]) => {
      rewardItems.push(
        <div key={`resource-${resource}`} className="text-sm text-foreground">
          {amount} {formatName(resource)}
        </div>,
      );
    });
  }

  if (rewards?.tools?.length) {
    rewards.tools.forEach((tool) => {
      rewardItems.push(
        <div key={`tool-${tool}`} className="text-sm text-foreground">
          {formatName(tool)}
        </div>,
      );
    });
  }

  if (rewards?.weapons?.length) {
    rewards.weapons.forEach((weapon) => {
      rewardItems.push(
        <div key={`weapon-${weapon}`} className="text-sm text-foreground">
          {formatName(weapon)}
        </div>,
      );
    });
  }

  if (rewards?.clothing?.length) {
    rewards.clothing.forEach((clothing) => {
      rewardItems.push(
        <div key={`clothing-${clothing}`} className="text-sm text-foreground">
          {formatName(clothing)}
        </div>,
      );
    });
  }

  if (rewards?.relics?.length) {
    rewards.relics.forEach((relic) => {
      rewardItems.push(
        <div key={`relic-${relic}`} className="text-sm text-foreground">
          {formatName(relic)}
        </div>,
      );
    });
  }

  if (rewards?.blessings?.length) {
    rewards.blessings.forEach((blessing) => {
      rewardItems.push(
        <div key={`blessing-${blessing}`} className="text-sm text-foreground">
          {formatName(blessing)}
        </div>,
      );
    });
  }

  if (rewards?.books?.length) {
    rewards.books.forEach((book) => {
      rewardItems.push(
        <div key={`book-${book}`} className="text-sm text-foreground">
          {formatName(book)}
        </div>,
      );
    });
  }

  if (rewards?.schematics?.length) {
    rewards.schematics.forEach((schematic) => {
      rewardItems.push(
        <div key={`schematic-${schematic}`} className="text-sm text-foreground">
          {formatName(schematic)}
        </div>,
      );
    });
  }

  if (rewards?.fellowship?.length) {
    rewards.fellowship.forEach((member) => {
      rewardItems.push(
        <div key={`fellowship-${member}`} className="text-sm text-foreground">
          {formatName(member)}
        </div>,
      );
    });
  }

  if (rewards?.stats && Object.keys(rewards.stats).length > 0) {
    Object.entries(rewards.stats).forEach(([stat, amount]) => {
      if (stat === "madness" || stat === "madnessFromEvents") return;
      rewardItems.push(
        <div key={`stat-${stat}`} className="text-sm text-foreground">
          +{amount} {formatName(stat)}
        </div>,
      );
    });
  }

  const hasRewardItems = rewardItems.length > 0;

  return (
    <>
      <style>{`
        .madness-dialog-glow {
          animation: madness-glow-pulse 2.5s ease-in-out infinite;
        }
        @keyframes madness-glow-pulse {
          0%, 100% { box-shadow: 0 0 15px 5px rgba(124, 58, 237, 0.25); }
          50% { box-shadow: 0 0 0px 0px rgba(124, 58, 237, 0.5); }
        }
      `}</style>
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent
          className={`w-[95vw] sm:max-w-sm z-[70] [&>button]:hidden border-2 border-violet-600 shadow-2xl ${hasRewardItems ? "gap-4" : "gap-2"}`}
        >
          <div className="absolute inset-0 -z-10 pointer-events-none madness-dialog-glow"></div>
          <DialogHeader>
            <div className="flex justify-center">
              <span className="text-4xl text-violet-300/90">✺</span>
            </div>
            {successLog && (
              <div className={`text-sm text-foreground text-center px-2 ${hasRewardItems ? "pb-3" : "pb-1"}`}>
                {successLog}
              </div>
            )}
            {hasRewardItems && <div className="my-3 h-px w-full bg-white/10" />}
            <DialogTitle className="sr-only">Madness Event</DialogTitle>
          </DialogHeader>

          {hasRewardItems && <div className="text-sm pb-2 space-y-2">{rewardItems}</div>}

          <div className={hasRewardItems ? "pt-2 mt-1" : "pt-0 mt-0"}>
            {hasRewardItems && <div className="my-3 h-px w-full bg-white/10" />}
            <div className={`text-sm mb-1 text-center text-violet-300 ${hasRewardItems ? "mt-3" : "mt-0"}`}>
              {madnessChange > 0 ? "+" : "-"} {Math.abs(madnessChange)} Madness
            </div>
          </div>

          <div className="flex justify-center">
            <Button onClick={onClose} variant="outline" className="text-xs h-8" button_id="madness-dialog-continue">
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
