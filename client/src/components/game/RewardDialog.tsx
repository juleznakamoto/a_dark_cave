import React, { useEffect, useRef } from "react";
import { GameState } from "@shared/schema";
import { formatNumber, capitalizeWords } from "@/lib/utils";
import { clothingEffects } from "@/game/rules/effects";
import {
  getEffectName,
  getResourceName,
  getStatName,
} from "@/i18n/resolveGameText";
import { useTranslation } from "react-i18next";
import { resolveOutcomeLogMessage } from "@/i18n/logDisplay";
import OutcomeDialog, {
  OUTCOME_DIALOG_REWARD_STYLE_ICON_CLASS,
} from "./OutcomeDialog";

/** Same center symbol + shockwave as Profile → “Rewards tasks” shortcut (exclusive promo track). */
function SocialPromoTasksOutcomeIcon() {
  const ringRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;
    ring.classList.add("exclusive-promo-shockwave-ring--ping-once");
  }, []);

  return (
    <span className="relative flex h-full w-full items-center justify-center overflow-visible">
      <span
        ref={ringRef}
        className="exclusive-promo-shockwave-ring"
        aria-hidden
        onAnimationEnd={(e) => {
          e.currentTarget.classList.remove(
            "exclusive-promo-shockwave-ring--ping-once",
          );
        }}
      />
      <span
        className="relative z-[1] text-[26px] leading-none select-none text-lime-500"
        aria-hidden
      >
        ⯫
      </span>
    </span>
  );
}

interface RewardDialogData {
  rewards: {
    resources?: Partial<Record<keyof GameState["resources"], number>>;
    resourceLosses?: Partial<Record<keyof GameState["resources"], number>>;
    villagersLost?: number;
    populationGained?: number;
    tools?: (keyof GameState["tools"])[];
    weapons?: (keyof GameState["weapons"])[];
    clothing?: (keyof GameState["clothing"])[];
    clothingLost?: (keyof GameState["clothing"])[];
    relics?: (keyof GameState["relics"])[];
    relicsLost?: (keyof GameState["relics"])[];
    blessings?: (keyof GameState["blessings"])[];
    books?: (keyof GameState["books"])[];
    schematics?: (keyof GameState["schematics"])[];
    fellowship?: (keyof GameState["fellowship"])[];
    stats?: Partial<GameState["stats"]>;
  };
  successLog?: string;
  variant?: "success" | "loss";
  /** Dialog heading; omit for generic action rewards (e.g. cave actions). */
  title?: string;
  /** When set, show a madness delta line (same copy as MadnessDialog). */
  madnessChange?: number;
}

interface RewardDialogProps {
  isOpen: boolean;
  data: RewardDialogData | null;
  onClose: () => void;
}

const effectDisplayName = (
  id: string,
  kind: "relic" | "clothing" | "blessing" | "book" | "schematic" | "fellowship",
) => {
  const fallback = capitalizeWords(id);
  if (kind === "book") return getEffectName("books", id, fallback);
  if (kind === "fellowship") return getEffectName("fellowship", id, fallback);
  // Relic/blessing names live in effects.clothing (see SidePanel, itemTooltips).
  if (kind === "relic") {
    return getEffectName(
      "clothing",
      id,
      clothingEffects[id]?.name || fallback,
    );
  }
  if (kind === "blessing") {
    return getEffectName(
      "clothing",
      id,
      clothingEffects[id]?.name || fallback,
    );
  }
  if (kind === "schematic") return fallback;
  return getEffectName(
    "clothing",
    id,
    clothingEffects[id]?.name || fallback,
  );
};

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
  const { t } = useTranslation(["ui", "common"]);
  if (!data) return null;

  const { rewards, successLog, variant = "success", title, madnessChange } = data;
  const isLossVariant = variant === "loss";

  const rewardItems: JSX.Element[] = [];
  if (rewards.stats && Object.keys(rewards.stats).length > 0) {
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
          +{formatNumber(amount)} {getStatName(stat, capitalizeWords(stat))}
        </div>
      );
    });
  }
  if (typeof rewards.populationGained === "number" && rewards.populationGained > 0) {
    rewardItems.push(
      <div key="population-gained" className="text-sm text-foreground">
        +{t("common:population.villager", {
          count: rewards.populationGained,
        })}
      </div>
    );
  }
  if (rewards.fellowship?.length) {
    rewards.fellowship.forEach((member) => {
      rewardItems.push(
        <div key={`fellowship-${member}`} className="text-sm text-foreground">
          {effectDisplayName(member, "fellowship")}
        </div>
      );
    });
  }
  if (rewards.tools?.length) {
    rewards.tools.forEach((tool) => {
      rewardItems.push(
        <div key={`tool-${tool}`} className="text-sm text-foreground">
          {getEffectName("tools", tool, capitalizeWords(tool))}
        </div>
      );
    });
  }
  if (rewards.weapons?.length) {
    rewards.weapons.forEach((weapon) => {
      rewardItems.push(
        <div key={`weapon-${weapon}`} className="text-sm text-foreground">
          {getEffectName("weapons", weapon, capitalizeWords(weapon))}
        </div>
      );
    });
  }
  if (rewards.clothing?.length) {
    rewards.clothing.forEach((clothing) => {
      rewardItems.push(
        <div key={`clothing-${clothing}`} className="text-sm text-foreground">
          {effectDisplayName(clothing, "clothing")}
        </div>
      );
    });
  }
  if (rewards.relics?.length) {
    rewards.relics.forEach((relic) => {
      rewardItems.push(
        <div key={`relic-${relic}`} className="text-sm text-foreground">
          {effectDisplayName(relic, "relic")}
        </div>
      );
    });
  }
  if (rewards.blessings?.length) {
    rewards.blessings.forEach((blessing) => {
      rewardItems.push(
        <div key={`blessing-${blessing}`} className="text-sm text-foreground">
          {effectDisplayName(blessing, "blessing")}
        </div>
      );
    });
  }
  if (rewards.books?.length) {
    rewards.books.forEach((book) => {
      rewardItems.push(
        <div key={`book-${book}`} className="text-sm text-foreground">
          {effectDisplayName(book, "book")}
        </div>
      );
    });
  }
  if (rewards.schematics?.length) {
    rewards.schematics.forEach((schematic) => {
      rewardItems.push(
        <div key={`schematic-${schematic}`} className="text-sm text-foreground">
          {effectDisplayName(schematic, "schematic")}
        </div>
      );
    });
  }
  if (rewards.resources && Object.keys(rewards.resources).length > 0) {
    sortResourceKeys(Object.keys(rewards.resources)).forEach((resource) => {
      const amount = rewards.resources![resource as keyof typeof rewards.resources];
      rewardItems.push(
        <div key={`resource-${resource}`} className="text-sm text-foreground">
          +{formatNumber(amount!)} {getResourceName(resource, capitalizeWords(resource))}
        </div>
      );
    });
  }

  const lossItems: JSX.Element[] = [];
  if (typeof rewards.villagersLost === "number" && rewards.villagersLost > 0) {
    lossItems.push(
      <div key="villagers-lost" className="text-sm text-foreground">
        -{t("common:population.villager", { count: rewards.villagersLost })}
      </div>
    );
  }
  if (rewards.resourceLosses && Object.keys(rewards.resourceLosses).length > 0) {
    sortResourceKeys(Object.keys(rewards.resourceLosses)).forEach((resource) => {
      const amount = rewards.resourceLosses![resource as keyof typeof rewards.resourceLosses];
      lossItems.push(
        <div key={`resource-loss-${resource}`} className="text-sm text-foreground">
          -{formatNumber(amount!)} {getResourceName(resource, capitalizeWords(resource))}
        </div>
      );
    });
  }
  if (rewards.relicsLost?.length) {
    rewards.relicsLost.forEach((relic) => {
      lossItems.push(
        <div key={`relic-lost-${relic}`} className="text-sm text-foreground">
          -{getEffectName(
            "clothing",
            relic,
            clothingEffects[relic]?.name || capitalizeWords(relic),
          )}
        </div>
      );
    });
  }
  if (rewards.clothingLost?.length) {
    rewards.clothingLost.forEach((clothing) => {
      lossItems.push(
        <div key={`clothing-lost-${clothing}`} className="text-sm text-foreground">
          -{getEffectName("clothing", clothing, capitalizeWords(clothing))}
        </div>
      );
    });
  }

  const hasRewardItems = rewardItems.length > 0;
  const hasLosses = lossItems.length > 0;
  const hasMadnessChange =
    typeof madnessChange === "number" && madnessChange !== 0;
  const useSocialPromoIcon =
    variant === "success" &&
    Boolean(rewards.clothing?.includes("gifted_ring"));

  const content = (
    <>
      {hasRewardItems && <div className="space-y-1">{rewardItems}</div>}
      {hasLosses && <div className="space-y-1">{lossItems}</div>}
      {hasMadnessChange && (
        <div className="text-sm text-violet-300">
          {t("ui:madness.change", {
            sign: madnessChange! > 0 ? "+" : "-",
            amount: formatNumber(Math.abs(madnessChange!)),
          })}
        </div>
      )}
    </>
  );

  return (
    <OutcomeDialog
      isOpen={isOpen}
      onClose={onClose}
      icon={
        useSocialPromoIcon ? (
          <SocialPromoTasksOutcomeIcon />
        ) : (
          <span className={OUTCOME_DIALOG_REWARD_STYLE_ICON_CLASS} aria-hidden>
            ⁂
          </span>
        )
      }
      successLog={resolveOutcomeLogMessage(successLog)}
      title={title?.trim() ? title : t("ui:reward.actionReward")}
      variant={isLossVariant ? "loss" : "success"}
      buttonText={
        isLossVariant ? t("common:buttons.continue") : t("ui:reward.claimRewards")
      }
      buttonId="reward-dialog-continue"
    >
      {content}
    </OutcomeDialog>
  );
}
