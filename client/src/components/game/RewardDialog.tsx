import React from "react";
import { GameState } from "@shared/schema";
import OutcomeDialog from "./OutcomeDialog";

interface RewardDialogData {
  rewards: {
    resources?: Partial<Record<keyof GameState["resources"], number>>;
    resourceLosses?: Partial<Record<keyof GameState["resources"], number>>;
    villagersLost?: number;
    populationGained?: number;
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

const formatName = (name: string) =>
  name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const sortResourceKeys = (keys: string[]) =>
  [...keys].sort((a, b) => {
    if (a === "gold") return -1;
    if (b === "gold") return 1;
    if (a === "silver") return -1;
    if (b === "silver") return 1;
    return a.localeCompare(b);
  });

export default function RewardDialog({
  isOpen,
  data,
  onClose,
}: RewardDialogProps) {
  if (!data) return null;

  const { rewards, successLog, variant = "success" } = data;
  const isLossVariant = variant === "loss";

  const rewardItems: JSX.Element[] = [];
  if (rewards.stats && Object.keys(rewards.stats).length > 0) {
    Object.entries(rewards.stats).forEach(([stat, amount]) => {
      if (stat === "madness" || stat === "madnessFromEvents") return;
      rewardItems.push(
        <div key={`stat-${stat}`} className="text-sm text-foreground">
          +{amount} {formatName(stat)}
        </div>
      );
    });
  }
  if (typeof rewards.populationGained === "number" && rewards.populationGained > 0) {
    rewardItems.push(
      <div key="population-gained" className="text-sm text-foreground">
        +{rewards.populationGained} {rewards.populationGained === 1 ? "Villager" : "Villagers"}
      </div>
    );
  }
  if (rewards.fellowship?.length) {
    rewards.fellowship.forEach((member) => {
      rewardItems.push(
        <div key={`fellowship-${member}`} className="text-sm text-foreground">
          {formatName(member)}
        </div>
      );
    });
  }
  if (rewards.tools?.length) {
    rewards.tools.forEach((tool) => {
      rewardItems.push(
        <div key={`tool-${tool}`} className="text-sm text-foreground">
          {formatName(tool)}
        </div>
      );
    });
  }
  if (rewards.weapons?.length) {
    rewards.weapons.forEach((weapon) => {
      rewardItems.push(
        <div key={`weapon-${weapon}`} className="text-sm text-foreground">
          {formatName(weapon)}
        </div>
      );
    });
  }
  if (rewards.clothing?.length) {
    rewards.clothing.forEach((clothing) => {
      rewardItems.push(
        <div key={`clothing-${clothing}`} className="text-sm text-foreground">
          {formatName(clothing)}
        </div>
      );
    });
  }
  if (rewards.relics?.length) {
    rewards.relics.forEach((relic) => {
      rewardItems.push(
        <div key={`relic-${relic}`} className="text-sm text-foreground">
          {formatName(relic)}
        </div>
      );
    });
  }
  if (rewards.blessings?.length) {
    rewards.blessings.forEach((blessing) => {
      rewardItems.push(
        <div key={`blessing-${blessing}`} className="text-sm text-foreground">
          {formatName(blessing)}
        </div>
      );
    });
  }
  if (rewards.books?.length) {
    rewards.books.forEach((book) => {
      rewardItems.push(
        <div key={`book-${book}`} className="text-sm text-foreground">
          {formatName(book)}
        </div>
      );
    });
  }
  if (rewards.schematics?.length) {
    rewards.schematics.forEach((schematic) => {
      rewardItems.push(
        <div key={`schematic-${schematic}`} className="text-sm text-foreground">
          {formatName(schematic)}
        </div>
      );
    });
  }
  if (rewards.resources && Object.keys(rewards.resources).length > 0) {
    sortResourceKeys(Object.keys(rewards.resources)).forEach((resource) => {
      const amount = rewards.resources![resource as keyof typeof rewards.resources];
      rewardItems.push(
        <div key={`resource-${resource}`} className="text-sm text-foreground">
          {amount} {formatName(resource)}
        </div>
      );
    });
  }

  const lossItems: JSX.Element[] = [];
  if (typeof rewards.villagersLost === "number" && rewards.villagersLost > 0) {
    lossItems.push(
      <div key="villagers-lost" className="text-sm text-foreground">
        -{rewards.villagersLost} {rewards.villagersLost === 1 ? "Villager" : "Villagers"}
      </div>
    );
  }
  if (rewards.resourceLosses && Object.keys(rewards.resourceLosses).length > 0) {
    sortResourceKeys(Object.keys(rewards.resourceLosses)).forEach((resource) => {
      const amount = rewards.resourceLosses![resource as keyof typeof rewards.resourceLosses];
      lossItems.push(
        <div key={`resource-loss-${resource}`} className="text-sm text-foreground">
          -{amount} {formatName(resource)}
        </div>
      );
    });
  }

  const hasRewardItems = rewardItems.length > 0;
  const hasLosses = lossItems.length > 0;

  const content = (
    <>
      {hasRewardItems && <div className="space-y-1">{rewardItems}</div>}
      {hasLosses && <div className="space-y-1">{lossItems}</div>}
    </>
  );

  return (
    <OutcomeDialog
      isOpen={isOpen}
      onClose={onClose}
      icon={<span className="text-4xl text-white">⁂</span>}
      successLog={successLog}
      title="Action Reward"
      variant={isLossVariant ? "loss" : "success"}
      buttonText={isLossVariant ? "Continue" : "Claim Rewards"}
      buttonId="reward-dialog-continue"
    >
      {content}
    </OutcomeDialog>
  );
}
