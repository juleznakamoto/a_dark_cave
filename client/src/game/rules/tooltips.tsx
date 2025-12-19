import { GameState } from "@shared/schema";
import {
  getTotalKnowledge,
  getActionBonuses,
  getTotalCraftingCostReduction,
  getTotalBuildingCostReduction,
} from "./effectsCalculation";
import { gameActions } from "./index";
import { getTotalMadness } from "./effectsCalculation";
import {
  CRUSHING_STRIKE_UPGRADES,
  BLOODFLAME_SPHERE_UPGRADES,
} from "./skillUpgrades";

const FOCUS_ELIGIBLE_ACTIONS = [
  "exploreCave",
  "ventureDeeper",
  "descendFurther",
  "exploreRuins",
  "exploreTemple",
  "exploreCitadel",
  "mineCoal",
  "mineIron",
  "mineSulfur",
  "mineObsidian",
  "mineAdamant",
  "mineMoonstone",
  "hunt",
  "chopWood",
];

export interface TooltipConfig {
  getContent: (state: GameState) => React.ReactNode | string;
}

// Helper function to calculate resource gains and costs (for tests and tooltips)
export const calculateResourceGains = (
  actionId: string,
  state: GameState,
): {
  gains: Array<{ resource: string; min: number; max: number }>;
  costs: Array<{ resource: string; amount: number; hasEnough: boolean }>;
} => {
  const action = gameActions[actionId];
  if (!action?.effects) return { gains: [], costs: [] };

  const bonuses = getActionBonuses(actionId, state);
  const gains: Array<{ resource: string; min: number; max: number }> = [];
  const costs: Array<{ resource: string; amount: number; hasEnough: boolean }> =
    [];

  // Check if this is a craft action to apply crafting discount
  const isCraftAction = actionId.startsWith("craft");
  const craftingDiscount = isCraftAction
    ? getTotalCraftingCostReduction(state)
    : 0;

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

            // Apply bonuses through centralized system (includes Bone Temple + items)
            const totalMultiplier = bonuses.resourceMultiplier;

            // Apply combined multiplier
            if (totalMultiplier > 1) {
              min = Math.floor(min * totalMultiplier);
              max = Math.floor(max * totalMultiplier);
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

            // Apply flat bonuses first
            const flatBonus = bonuses.resourceBonus[resource] || 0;
            min += flatBonus;
            max += flatBonus;

            // Apply all multipliers (resourceMultiplier already includes button upgrades from getActionBonuses)
            let totalMultiplier = bonuses.resourceMultiplier;

            // Apply cave exploration multiplier for cave explore actions (additive, not multiplicative)
            if (isCaveExploreAction) {
              totalMultiplier += (bonuses.caveExploreMultiplier || 1) - 1;
            }

            if (totalMultiplier > 1) {
              min = Math.floor(min * totalMultiplier);
              max = Math.floor(max * totalMultiplier);
            }

            // Apply focus multiplier for eligible actions (exclude sacrifice actions)
            if (
              FOCUS_ELIGIBLE_ACTIONS.includes(actionId) &&
              state.focusState?.isActive &&
              state.focusState.endTime > Date.now()
            ) {
              min = Math.floor(min * 2);
              max = Math.floor(max * 2);
            }

            gains.push({ resource, min, max });
          }
        } else if (typeof value === "number") {
          // Fixed value
          let amount = value;

          // Apply flat bonuses first
          const flatBonus = bonuses.resourceBonus[resource] || 0;
          amount += flatBonus;

          // Apply all multipliers (resourceMultiplier already includes button upgrades from getActionBonuses)
          let totalMultiplier = bonuses.resourceMultiplier;

          // Apply cave exploration multiplier for cave explore actions (additive, not multiplicative)
          if (isCaveExploreAction) {
            totalMultiplier += (bonuses.caveExploreMultiplier || 1) - 1;
          }

          if (totalMultiplier > 1) {
            amount = Math.floor(amount * totalMultiplier);
          }

          // Apply focus multiplier for eligible actions (exclude sacrifice actions)
          if (
            FOCUS_ELIGIBLE_ACTIONS.includes(actionId) &&
            state.focusState?.isActive &&
            state.focusState.endTime > Date.now()
          ) {
            amount = Math.floor(amount * 2);
          }

          gains.push({ resource, min: amount, max: amount });
        }
      }
    });

    // Parse costs for mine and craft actions
    if (action.cost) {
      Object.entries(action.cost).forEach(([key, value]) => {
        if (key.startsWith("resources.")) {
          const resource = key.split(".")[1];
          if (typeof value === "number") {
            // Apply crafting discount if applicable
            const finalCost = isCraftAction
              ? Math.ceil(value * (1 - craftingDiscount))
              : value;

            const hasEnough =
              (state.resources[resource as keyof typeof state.resources] || 0) >=
              finalCost;
            costs.push({ resource, amount: finalCost, hasEnough });
          }
        } else if (key.startsWith("relics.")) {
          const relic = key.split(".")[1];
          if (typeof value === "boolean" && value === true) {
            const hasEnough =
              state.relics[relic as keyof typeof state.relics] === true;
            costs.push({ resource: relic, amount: 1, hasEnough });
          }
        }
      });
    }
  }

  return { gains, costs };
};

// Helper function to get resource gain range tooltip
export const getResourceGainTooltip = (
  actionId: string,
  state: GameState,
): React.ReactNode | null => {
  // Only show if clerks hut is built
  if (!state.buildings.clerksHut) {
    return null;
  }

  const { gains, costs } = calculateResourceGains(actionId, state);

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

export const frostfallTooltip: TooltipConfig = {
  getContent: (state: GameState) => {
    const frostfallState = state.frostfallState;
    const isFrostfall =
      frostfallState?.isActive && frostfallState.endTime > Date.now();

    if (isFrostfall) {
      const remainingMs = frostfallState.endTime - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return (
        <>
          <div className="font-bold">Frostfall</div>
          <div>Production Bonus: -25%</div>
          <div>{remainingMinutes} min remaining</div>
        </>
      );
    }

    return null;
  },
};

export const fogTooltip: TooltipConfig = {
  getContent: (state: GameState) => {
    const fogState = state.fogState;
    const isFog = fogState?.isActive && fogState.endTime > Date.now();

    if (isFog) {
      const remainingMs = fogState.endTime - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return (
        <>
          <div className="font-bold">Choking Fog</div>
          <div>Production Bonus: -50%</div>
          <div>{remainingMinutes} min remaining</div>
        </>
      );
    }

    return null;
  },
};

export const focusTooltip: TooltipConfig = {
  getContent: (state: GameState) => {
    const focusState = state.focusState;
    const isFocusActive =
      focusState?.isActive && focusState.endTime > Date.now();

    if (isFocusActive) {
      const remainingMs = focusState.endTime - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return (
        <>
          <div className="font-bold">Focus</div>
          <div>Action Bonus: 2x</div>
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
  void_bomb: {
    getContent: (state) => {
      const knowledge = getTotalKnowledge(state) || 0;
      const baseDamage = 40;
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
  crushing_strike: {
    getContent: (state) => {
      const level = state.combatSkills.crushingStrikeLevel ?? 0;
      const config = CRUSHING_STRIKE_UPGRADES[level];
      return `Damage: ${config.damage}\nStun Duration: ${config.stunRounds} round${config.stunRounds > 1 ? "s" : ""}`;
    },
  },
  bloodflame_sphere: {
    getContent: (state) => {
      const level = state.combatSkills.bloodflameSphereLevel ?? 0;
      const config = BLOODFLAME_SPHERE_UPGRADES[level];
      return `Damage: ${config.damage}\nBurn: ${config.burnDamage}×${config.burnRounds} round${config.burnRounds > 1 ? "s" : ""}\nHealth Cost: ${config.healthCost}`;
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

// Helper function to extract resource name and amount from text
function parseResourceText(text: string): { resource: string; amount: number } | null {
  // Match patterns like "250 gold", "+10 Food", "-5 wood"
  const match = text.match(/[+-]?\s*(\d+)\s+([a-zA-Z_\s]+)/);
  if (match) {
    const amount = parseInt(match[1]);
    const resource = match[2].trim().toLowerCase().replace(/\s+/g, '_');
    return { resource, amount };
  }
  return null;
}

// Helper function to get current amount of a resource from game state
export const getCurrentResourceAmount = {
  getContent: (text: string | undefined, gameState: GameState): string => {
    if (!text) return "";

    const parsed = parseResourceText(text);
    if (!parsed) return "";

    const { resource } = parsed;
    const currentAmount = gameState.resources[resource as keyof typeof gameState.resources] || 0;
    
    return `Current: ${currentAmount} ${capitalizeWords(resource)}`;
  }
};

// Helper function to get current amounts for merchant (shows both buy and pay resources)
export const getMerchantCurrentAmounts = {
  getContent: (labelText: string | undefined, costText: string | undefined, gameState: GameState): string => {
    const amounts: string[] = [];

    // Parse the resource being bought (from label, e.g., "+10 Food")
    if (labelText) {
      const buyParsed = parseResourceText(labelText);
      if (buyParsed) {
        const currentAmount = gameState.resources[buyParsed.resource as keyof typeof gameState.resources] || 0;
        amounts.push(`${capitalizeWords(buyParsed.resource)}: ${currentAmount}`);
      }
    }

    // Parse the resource being paid (from cost, e.g., "250 gold")
    if (costText) {
      const payParsed = parseResourceText(costText);
      if (payParsed) {
        // Avoid duplicates if buy and pay are the same resource
        if (!labelText || parseResourceText(labelText)?.resource !== payParsed.resource) {
          const currentAmount = gameState.resources[payParsed.resource as keyof typeof gameState.resources] || 0;
          amounts.push(`${capitalizeWords(payParsed.resource)}: ${currentAmount}`);
        }
      }
    }

    return amounts.length > 0 ? [...amounts] : "";
  }
};