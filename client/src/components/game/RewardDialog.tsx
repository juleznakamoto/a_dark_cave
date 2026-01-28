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
  title?: string;
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

  const { title = "Rewards", rewards } = data;

  // Helper to render a list of rewards
  const renderRewards = () => {
    const sections: JSX.Element[] = [];

    // Resources
    if (rewards.resources && Object.keys(rewards.resources).length > 0) {
      sections.push(
        <div key="resources" className="space-y-1">
          <div className="text-sm font-medium text-foreground mb-2">Resources</div>
          {Object.entries(rewards.resources).map(([resource, amount]) => (
            <div key={resource} className="text-sm text-green-400">
              +{amount} {formatName(resource)}
            </div>
          ))}
        </div>
      );
    }

    // Tools
    if (rewards.tools && rewards.tools.length > 0) {
      sections.push(
        <div key="tools" className="space-y-1">
          <div className="text-sm font-medium text-foreground mb-2">Tools</div>
          {rewards.tools.map((tool) => (
            <div key={tool} className="text-sm text-blue-400">
              {formatName(tool)} (tool)
            </div>
          ))}
        </div>
      );
    }

    // Weapons
    if (rewards.weapons && rewards.weapons.length > 0) {
      sections.push(
        <div key="weapons" className="space-y-1">
          <div className="text-sm font-medium text-foreground mb-2">Weapons</div>
          {rewards.weapons.map((weapon) => (
            <div key={weapon} className="text-sm text-red-400">
              {formatName(weapon)} (weapon)
            </div>
          ))}
        </div>
      );
    }

    // Clothing
    if (rewards.clothing && rewards.clothing.length > 0) {
      sections.push(
        <div key="clothing" className="space-y-1">
          <div className="text-sm font-medium text-foreground mb-2">Clothing</div>
          {rewards.clothing.map((clothing) => (
            <div key={clothing} className="text-sm text-purple-400">
              {formatName(clothing)} (clothing)
            </div>
          ))}
        </div>
      );
    }

    // Relics
    if (rewards.relics && rewards.relics.length > 0) {
      sections.push(
        <div key="relics" className="space-y-1">
          <div className="text-sm font-medium text-foreground mb-2">Relics</div>
          {rewards.relics.map((relic) => (
            <div key={relic} className="text-sm text-amber-400">
              {formatName(relic)} (relic)
            </div>
          ))}
        </div>
      );
    }

    // Blessings
    if (rewards.blessings && rewards.blessings.length > 0) {
      sections.push(
        <div key="blessings" className="space-y-1">
          <div className="text-sm font-medium text-foreground mb-2">Blessings</div>
          {rewards.blessings.map((blessing) => (
            <div key={blessing} className="text-sm text-cyan-400">
              {formatName(blessing)} (blessing)
            </div>
          ))}
        </div>
      );
    }

    // Books
    if (rewards.books && rewards.books.length > 0) {
      sections.push(
        <div key="books" className="space-y-1">
          <div className="text-sm font-medium text-foreground mb-2">Books</div>
          {rewards.books.map((book) => (
            <div key={book} className="text-sm text-indigo-400">
              {formatName(book)} (book)
            </div>
          ))}
        </div>
      );
    }

    // Schematics
    if (rewards.schematics && rewards.schematics.length > 0) {
      sections.push(
        <div key="schematics" className="space-y-1">
          <div className="text-sm font-medium text-foreground mb-2">Schematics</div>
          {rewards.schematics.map((schematic) => (
            <div key={schematic} className="text-sm text-orange-400">
              {formatName(schematic)} (schematic)
            </div>
          ))}
        </div>
      );
    }

    // Fellowship
    if (rewards.fellowship && rewards.fellowship.length > 0) {
      sections.push(
        <div key="fellowship" className="space-y-1">
          <div className="text-sm font-medium text-foreground mb-2">Fellowship</div>
          {rewards.fellowship.map((member) => (
            <div key={member} className="text-sm text-teal-400">
              {formatName(member)} (companion)
            </div>
          ))}
        </div>
      );
    }

    // Stats
    if (rewards.stats && Object.keys(rewards.stats).length > 0) {
      sections.push(
        <div key="stats" className="space-y-1">
          <div className="text-sm font-medium text-foreground mb-2">Stats</div>
          {Object.entries(rewards.stats).map(([stat, amount]) => (
            <div key={stat} className="text-sm text-yellow-400">
              +{amount} {formatName(stat)}
            </div>
          ))}
        </div>
      );
    }

    return sections;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => { }}>
      <DialogContent className="w-[95vw] sm:max-w-md z-[70] [&>button]:hidden">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="bg-white/10 border border-white/30 rounded-lg px-4 py-2">
              <span className="text-2xl text-white">⁂</span>
            </div>
          </div>
          <DialogTitle className="text-lg font-semibold">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400 mt-2">
            You have received the following rewards:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {renderRewards()}
        </div>

        <DialogFooter>
          <Button
            onClick={onClose}
            className="w-full"
            button_id="reward-dialog-continue"
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}