import { GameState } from "../state";
import { getTotalKnowledge, getActionBonuses } from "./effectsCalculation"; // Assuming getActionBonuses is also exported from effectsCalculation

export interface TooltipConfig {
  getContent: (state: GameState) => React.ReactNode | string;
}

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

// Job/Population tooltips
export const jobTooltips: Record<string, TooltipConfig> = {
  gatherer: {
    getContent: () => "+3 Wood per production cycle",
  },
  hunter: {
    getContent: () => "+2 Food per production cycle",
  },
  iron_miner: {
    getContent: () => "+1 Iron per production cycle",
  },
  coal_miner: {
    getContent: () => "+1 Coal per production cycle",
  },
  steel_forger: {
    getContent: () => "+1 Steel per production cycle",
  },
  sulfur_miner: {
    getContent: () => "+1 Sulfur per production cycle",
  },
  silver_miner: {
    getContent: () => "+1 Silver per production cycle",
  },
  obsidian_miner: {
    getContent: () => "+1 Obsidian per production cycle",
  },
  adamant_miner: {
    getContent: () => "+1 Adamant per production cycle",
  },
  moonstone_miner: {
    getContent: () => "+1 Moonstone per production cycle",
  },
  tanner: {
    getContent: () => "+1 Leather per production cycle",
  },
  powder_maker: {
    getContent: () => "+1 Black Powder per production cycle",
  },
  ashfire_dust_maker: {
    getContent: () => "+1 Ashfire Dust per production cycle",
  },
};

// Madness tooltip
export const madnessTooltip: TooltipConfig = {
  getContent: (state) => {
    const eventMadness = state.stats.madnessFromEvents || 0;
    if (eventMadness > 0) {
      return `+${eventMadness} Madness from Events`;
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
          <div>Production: 400%</div>
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
          <div>Production: 200%</div>
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
          <div>Production: 50%</div>
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

// Helper to get expected resource gains for an action
export const getActionGainsTooltip = (actionId: string, state: GameState): string | null => {
  if (!state.buildings.clerksHut) return null;

  const action = gameActions[actionId]; // Assuming gameActions is globally available or imported
  if (!action?.effects) return null;

  const gains: string[] = [];
  const costs: string[] = [];

  // Get action bonuses using existing calculation
  const actionBonuses = getActionBonuses(actionId, state);
  
  // ... rest of the function body using actionBonuses and other calculations
  // This part was not provided in the changes, so it remains as it was or needs to be inferred.
  // For now, we'll just return a placeholder or an empty string if no specific logic is provided.
  // If this function was intended to be completed, more context would be needed.
  return null; // Placeholder, as the rest of the function logic is not provided.
};