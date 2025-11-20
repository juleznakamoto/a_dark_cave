import { GameState } from "@shared/schema";
import { getTotalKnowledge, getActionBonuses } from "./effectsCalculation";
import { gameActions } from "./index";
import { getTotalMadness } from "./effectsCalculation";
import { ACTION_TO_UPGRADE_KEY, getButtonUpgradeInfo } from "@/game/buttonUpgrades";

export interface TooltipConfig {
  getContent: (state: GameState) => React.ReactNode | string;
}

// Helper function to get resource gain range tooltip
export const getResourceGainTooltip = (
  actionId: string,
  state: GameState,
): React.ReactNode | null => {
  // Only show if clerks hut is built
  if (!state.buildings.clerksHut) {
    return null;
  }

  const action = gameActions[actionId];
  if (!action?.effects) return null;

  const bonuses = getActionBonuses(actionId, state);
  const gains: Array<{ resource: string; min: number; max: number }> = [];
  const costs: Array<{ resource: string; amount: number; hasEnough: boolean }> =
    [];

  // Handle sacrifice actions with dynamic costs and bonuses
  const isSacrificeAction =
    actionId === "boneTotems" || actionId === "leatherTotems";

  if (isSacrificeAction) {
    // Get dynamic cost
    const usageCountKey =
      actionId === "boneTotems"
        ? "boneTotemsUsageCount"
        : "leatherTotemsUsageCount";
    const usageCount = Number(state.story?.seen?.[usageCountKey]) || 0;
    const dynamicCost = Math.min(5 + usageCount, 25);

    const costResource =
      actionId === "boneTotems" ? "bone_totem" : "leather_totem";
    const hasEnough =
      (state.resources[costResource as keyof typeof state.resources] || 0) >=
      dynamicCost;
    costs.push({ resource: costResource, amount: dynamicCost, hasEnough });

    // Base gains from effects
    Object.entries(action.effects).forEach(([key, value]) => {
      if (key.startsWith("resources.")) {
        const resource = key.split(".")[1];

        if (typeof value === "string" && value.startsWith("random(")) {
          const match = value.match(/random\((\d+),(\d+)\)/);
          if (match) {
            let min = parseInt(match[1]);
            let max = parseInt(match[2]);

            // Apply fixed +1 bonus per usage, capped at 20 usages
            const cappedUsageCount = Math.min(usageCount, 20);
            min = min + cappedUsageCount;
            max = max + cappedUsageCount;

            // Apply item bonuses (like ebony ring 20% multiplier)
            if (bonuses.resourceMultiplier > 1) {
              min = Math.floor(min * bonuses.resourceMultiplier);
              max = Math.floor(max * bonuses.resourceMultiplier);
            }

            gains.push({ resource, min, max });
          }
        }
      }
    });
  } else {
    // Check if this is a cave exploration action
    const caveExploreActions = [
      "exploreCave",
      "ventureDeeper",
      "descendFurther",
      "exploreRuins",
      "exploreTemple",
      "exploreCitadel",
    ];
    const isCaveExploreAction = caveExploreActions.includes(actionId);

    // Parse effects for resource gains (normal actions)
    Object.entries(action.effects).forEach(([key, value]) => {
      if (key.startsWith("resources.")) {
        const resource = key.split(".")[1];

        if (typeof value === "string" && value.startsWith("random(")) {
          // Parse random(min,max) format
          const match = value.match(/random\((\d+),(\d+)\)/);
          if (match) {
            let min = parseInt(match[1]);
            let max = parseInt(match[2]);

            // Apply flat bonuses (includes both specific action bonuses and general mine bonuses)
            const flatBonus = bonuses.resourceBonus[resource] || 0;
            min += flatBonus;
            max += flatBonus;

            // Apply multipliers (this already includes both specific and general mine multipliers from getActionBonuses)
            if (bonuses.resourceMultiplier > 1) {
              min = Math.floor(min * bonuses.resourceMultiplier);
              max = Math.floor(max * bonuses.resourceMultiplier);
            }

            // Apply cave exploration multiplier for cave explore actions
            if (isCaveExploreAction && bonuses.caveExploreMultiplier > 1) {
              min = Math.floor(min * bonuses.caveExploreMultiplier);
              max = Math.floor(max * bonuses.caveExploreMultiplier);
            }

            gains.push({ resource, min, max });
          }
        } else if (typeof value === "number") {
          // Fixed value
          let amount = value;

          // Apply flat bonuses (includes both specific action bonuses and general mine bonuses)
          const flatBonus = bonuses.resourceBonus[resource] || 0;
          amount += flatBonus;

          // Apply multipliers (this already includes both specific and general mine multipliers from getActionBonuses)
          if (bonuses.resourceMultiplier > 1) {
            amount = Math.floor(amount * bonuses.resourceMultiplier);
          }

          // Apply cave exploration multiplier for cave explore actions
          if (isCaveExploreAction && bonuses.caveExploreMultiplier > 1) {
            amount = Math.floor(amount * bonuses.caveExploreMultiplier);
          }

          gains.push({ resource, min: amount, max: amount });
        }
      }
    });

    // Parse costs for mine actions
    if (action.cost) {
      Object.entries(action.cost).forEach(([key, value]) => {
        if (key.startsWith("resources.")) {
          const resource = key.split(".")[1];
          if (typeof value === "number") {
            const hasEnough =
              (state.resources[resource as keyof typeof state.resources] ||
                0) >= value;
            costs.push({ resource, amount: value, hasEnough });
          }
        }
      });
    }
  }

  if (gains.length === 0 && costs.length === 0) {
    return null;
  }

  const formatResourceName = (resource: string) => {
    return resource
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="text-xs">
      {gains.map((gain, index) => (
        <div key={`gain-${index}`}>
          {gain.min === gain.max
            ? `+${gain.min} ${formatResourceName(gain.resource)}`
            : `+${gain.min}-${gain.max} ${formatResourceName(gain.resource)}`}
        </div>
      ))}
      {gains.length > 0 && costs.length > 0 && (
        <div className="border-t border-border my-1" />
      )}
      {costs.map((cost, index) => (
        <div
          key={`cost-${index}`}
          className={cost.hasEnough ? "" : "text-muted-foreground"}
        >
          -{cost.amount} {formatResourceName(cost.resource)}
        </div>
      ))}
    </div>
  );
};

// Action button tooltips (for cost breakdowns)
export const actionTooltips: Record<string, TooltipConfig> = {
  // These are handled dynamically by getActionCostBreakdown
  // This file is for static/simple tooltips
};

// Building tooltips
export const buildingTooltips: Record<string, TooltipConfig> = {
  watchtower: {
    getContent: (state) => {
      const level = state.buildings.watchtower || 0;
      const defense = 10 + level * 5;
      const range = 20 + level * 10;
      return `Defense: ${defense}\nRange: ${range}`;
    },
  },
  palisades: {
    getContent: (state) => {
      const level = state.buildings.palisades || 0;
      const defense = 5 + level * 3;
      return `Defense: ${defense}`;
    },
  },
};

// Madness tooltip
export const madnessTooltip: TooltipConfig = {
  getContent: (state) => {
    const totalMadness = getTotalMadness(state);
    const itemMadness = totalMadness - (state.stats.madnessFromEvents || 0);
    const eventMadness = state.stats.madnessFromEvents || 0;
    if (totalMadness > 0) {
      return `${itemMadness} from Items/Buildings\n${eventMadness} from Events`;
    }
    return "";
  },
};

// Feast and Curse Tooltips
export const feastTooltip: TooltipConfig = {
  getContent: (state: GameState) => {
    const feastState = state.feastState;
    const greatFeastState = state.greatFeastState;
    const isGreatFeast =
      greatFeastState?.isActive && greatFeastState.endTime > Date.now();
    const isFeast = feastState?.isActive && feastState.endTime > Date.now();

    if (isGreatFeast) {
      const remainingMs = greatFeastState.endTime - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return (
        <>
          <div className="font-bold">Great Village Feast</div>
          <div>Production Bonus: 400%</div>
          <div>{remainingMinutes} min remaining</div>
        </>
      );
    }

    if (isFeast) {
      const remainingMs = feastState.endTime - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return (
        <>
          <div className="font-bold">Village Feast</div>
          <div>Production Bonus: 200%</div>
          <div>{remainingMinutes} min remaining</div>
        </>
      );
    }

    return null;
  },
};

export const curseTooltip: TooltipConfig = {
  getContent: (state: GameState) => {
    const curseState = state.curseState;
    const isCursed = curseState?.isActive && curseState.endTime > Date.now();

    if (isCursed) {
      const remainingMs = curseState.endTime - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return (
        <>
          <div className="font-bold">Witch&apos;s Curse</div>
          <div>Production Bonus: -50%</div>
          <div>{remainingMinutes} min remaining</div>
        </>
      );
    }

    return null;
  },
};

export const miningBoostTooltip: TooltipConfig = {
  getContent: (state: GameState) => {
    const miningBoostState = state.miningBoostState;
    const isBoosted =
      miningBoostState?.isActive && miningBoostState.endTime > Date.now();

    if (isBoosted) {
      const remainingMs = miningBoostState.endTime - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return (
        <>
          <div className="font-bold">Mining Boost</div>
          <div>Mining Production: 200%</div>
          <div>{remainingMinutes} min remaining</div>
        </>
      );
    }

    return null;
  },
};

// Combat item tooltips
export const combatItemTooltips: Record<string, TooltipConfig> = {
  ember_bomb: {
    getContent: (state) => {
      const knowledge = getTotalKnowledge(state) || 0;
      const baseDamage = 10;
      const knowledgeBonus = Math.floor(knowledge / 5);
      return `Base Damage: ${baseDamage}\n${knowledge >= 5 ? `Knowledge Bonus: +${knowledgeBonus}\n` : ""}Total Damage: ${baseDamage + knowledgeBonus}`;
    },
  },
  ashfire_bomb: {
    getContent: (state) => {
      const knowledge = getTotalKnowledge(state) || 0;
      const baseDamage = 25;
      const knowledgeBonus = Math.floor(knowledge / 5);
      return `Base Damage: ${baseDamage}\n${knowledge >= 5 ? `Knowledge Bonus: +${knowledgeBonus}\n` : ""}Total Damage: ${baseDamage + knowledgeBonus}`;
    },
  },
  poison_arrows: {
    getContent: (state) => {
      const knowledge = getTotalKnowledge(state) || 0;
      const baseDamage = 15;
      const knowledgeBonus = Math.floor(knowledge / 5);
      return `Base Damage: ${baseDamage} per round for 3 rounds\n${knowledge >= 5 ? `Knowledge Bonus: +${knowledgeBonus}\n` : ""}Total Damage: ${baseDamage + knowledgeBonus} per round`;
    },
  },
};

// Event choice cost tooltip - formats cost string
export const eventChoiceCostTooltip = {
  getContent: (cost: string | Record<string, number> | undefined): string => {
    if (!cost) return "";

    // Handle string cost (e.g., "5 gold")
    if (typeof cost === "string") {
      const parts = cost.split(" ");
      if (parts.length >= 2) {
        const amount = parts[0];
        const resource = parts.slice(1).join(" ");
        return `-${amount} ${capitalizeWords(resource)}`;
      }
      return `-${cost}`;
    }

    // Handle object cost
    return Object.entries(cost)
      .map(([resource, amount]) => `-${amount} ${capitalizeWords(resource)}`)
      .join("\n");
  },
};

// Helper function to capitalize the first letter of each word in a string
// Assuming this function is defined elsewhere and available in scope.
// If not, it would need to be added. For example:
function capitalizeWords(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
