import React from "react";
import { GameState } from "@shared/schema";
import { formatNumber } from "@/lib/utils";
import {
  clothingEffects,
  bookEffects,
  fellowshipEffects,
} from "@/game/rules/effects";
import OutcomeDialog from "./OutcomeDialog";

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

const effectDisplayName = (
  id: string,
  kind: "relic" | "clothing" | "blessing" | "book" | "schematic" | "fellowship",
) => {
  if (kind === "book") return bookEffects[id]?.name ?? formatName(id);
  if (kind === "fellowship")
    return fellowshipEffects[id]?.name ?? formatName(id);
  return clothingEffects[id]?.name ?? formatName(id);
};

export default function MadnessDialog({ isOpen, data, onClose }: MadnessDialogProps) {
  if (!data || data.madnessChange === 0) return null;

  const { rewards, successLog, madnessChange } = data;

  const rewardItems: JSX.Element[] = [];
  if (rewards?.resources && Object.keys(rewards.resources).length > 0) {
    Object.entries(rewards.resources).forEach(([resource, amount]) => {
      rewardItems.push(
        <div key={`resource-${resource}`} className="text-sm text-foreground">
          {formatNumber(amount)} {formatName(resource)}
        </div>
      );
    });
  }
  if (rewards?.tools?.length) {
    rewards.tools.forEach((tool) => {
      rewardItems.push(
        <div key={`tool-${tool}`} className="text-sm text-foreground">
          {formatName(tool)}
        </div>
      );
    });
  }
  if (rewards?.weapons?.length) {
    rewards.weapons.forEach((weapon) => {
      rewardItems.push(
        <div key={`weapon-${weapon}`} className="text-sm text-foreground">
          {formatName(weapon)}
        </div>
      );
    });
  }
  if (rewards?.clothing?.length) {
    rewards.clothing.forEach((clothing) => {
      rewardItems.push(
        <div key={`clothing-${clothing}`} className="text-sm text-foreground">
          {effectDisplayName(clothing, "clothing")}
        </div>
      );
    });
  }
  if (rewards?.relics?.length) {
    rewards.relics.forEach((relic) => {
      rewardItems.push(
        <div key={`relic-${relic}`} className="text-sm text-foreground">
          {effectDisplayName(relic, "relic")}
        </div>
      );
    });
  }
  if (rewards?.blessings?.length) {
    rewards.blessings.forEach((blessing) => {
      rewardItems.push(
        <div key={`blessing-${blessing}`} className="text-sm text-foreground">
          {effectDisplayName(blessing, "blessing")}
        </div>
      );
    });
  }
  if (rewards?.books?.length) {
    rewards.books.forEach((book) => {
      rewardItems.push(
        <div key={`book-${book}`} className="text-sm text-foreground">
          {effectDisplayName(book, "book")}
        </div>
      );
    });
  }
  if (rewards?.schematics?.length) {
    rewards.schematics.forEach((schematic) => {
      rewardItems.push(
        <div key={`schematic-${schematic}`} className="text-sm text-foreground">
          {effectDisplayName(schematic, "schematic")}
        </div>
      );
    });
  }
  if (rewards?.fellowship?.length) {
    rewards.fellowship.forEach((member) => {
      rewardItems.push(
        <div key={`fellowship-${member}`} className="text-sm text-foreground">
          {effectDisplayName(member, "fellowship")}
        </div>
      );
    });
  }
  if (rewards?.stats && Object.keys(rewards.stats).length > 0) {
    Object.entries(rewards.stats).forEach(([stat, amount]) => {
      if (
        stat === "madness" ||
        stat === "madnessFromEvents" ||
        stat === "villagerDeathsLifetime"
      ) {
        return;
      }
      rewardItems.push(
        <div key={`stat-${stat}`} className="text-sm text-foreground">
          +{formatNumber(amount)} {formatName(stat)}
        </div>
      );
    });
  }

  const hasRewardItems = rewardItems.length > 0;

  const content = (
    <>
      {hasRewardItems && <div className="space-y-1">{rewardItems}</div>}
      <div className="text-sm text-center text-violet-300">
        {madnessChange > 0 ? "+" : "-"} {formatNumber(Math.abs(madnessChange))} Madness
      </div>
    </>
  );

  return (
    <OutcomeDialog
      isOpen={isOpen}
      onClose={onClose}
      icon={<span className="text-4xl text-violet-300/90">✺</span>}
      successLog={successLog}
      title="Madness Event"
      variant="madness"
      buttonText="Continue"
      buttonId="madness-dialog-continue"
    >
      {content}
    </OutcomeDialog>
  );
}
