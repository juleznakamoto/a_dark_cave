import { GameState } from "../state";
import { getTotalKnowledge, getActionBonuses } from "./effectsCalculation";
import { gameActions } from "./index";

export interface TooltipConfig {
  getContent: (state: GameState) => React.ReactNode | string;
}

// Helper to parse random range from effect value
function parseRandomRange(effectValue: string | number): { min: number; max: number } | null {
  if (typeof effectValue === 'string' && effectValue.startsWith('random(')) {
    const match = effectValue.match(/random\((\d+),(\d+)\)/);
    if (match) {
      return { min: parseInt(match[1]), max: parseInt(match[2]) };
    }
  }
  return null;
}

// Helper to get resource gains with bonuses for an action
function getResourceGainsWithBonuses(
  actionId: string,
  state: GameState
): Array<{ resource: string; min: number; max: number }> {
  const action = gameActions[actionId];
  if (!action?.effects) return [];

  const bonuses = getActionBonuses(actionId, state);
  const gains: Array<{ resource: string; min: number; max: number }> = [];

  Object.entries(action.effects).forEach(([path, value]) => {
    if (path.startsWith('resources.')) {
      const resource = path.split('.')[1];
      const range = parseRandomRange(value);
      
      if (range) {
        // Apply flat bonus
        const flatBonus = bonuses.resourceBonus[resource] || 0;
        
        // Apply multiplier
        const multiplier = bonuses.resourceMultiplier || 1;
        
        // Calculate final range
        let min = Math.floor((range.min + flatBonus) * multiplier);
        let max = Math.floor((range.max + flatBonus) * multiplier);
        
        gains.push({
          resource: resource.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          min,
          max
        });
      }
    }
  });

  return gains;
}

// Helper to get costs for an action
function getActionCosts(actionId: string, state: GameState): Array<{ resource: string; amount: number }> {
  const action = gameActions[actionId];
  if (!action?.cost) return [];

  const costs: Array<{ resource: string; amount: number }> = [];

  Object.entries(action.cost).forEach(([path, amount]) => {
    if (path.startsWith('resources.') && typeof amount === 'number') {
      const resource = path.split('.')[1];
      costs.push({
        resource: resource.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        amount
      });
    }
  });

  return costs;
}

// Dynamic tooltips for actions with resource gains
export function getActionResourceTooltip(actionId: string, showCosts: boolean = false): TooltipConfig {
  return {
    getContent: (state: GameState) => {
      // Only show after clerks hut is built
      if (!state.buildings.clerksHut || state.buildings.clerksHut < 1) {
        return null;
      }

      const gains = getResourceGainsWithBonuses(actionId, state);
      const costs = showCosts ? getActionCosts(actionId, state) : [];

      if (gains.length === 0 && costs.length === 0) {
        return null;
      }

      return (
        <>
          {gains.map((gain, idx) => (
            <div key={`gain-${idx}`}>
              +{gain.min}-{gain.max} {gain.resource}
            </div>
          ))}
          {costs.map((cost, idx) => (
            <div key={`cost-${idx}`}>
              -{cost.amount} {cost.resource}
            </div>
          ))}
        </>
      );
    }
  };
}

// Action button tooltips (for cost breakdowns)
export const actionTooltips: Record<string, TooltipConfig> = {
  // Mine actions (show gains then costs)
  mineStone: getActionResourceTooltip('mineStone', true),
  mineIron: getActionResourceTooltip('mineIron', true),
  mineCoal: getActionResourceTooltip('mineCoal', true),
  mineSulfur: getActionResourceTooltip('mineSulfur', true),
  mineObsidian: getActionResourceTooltip('mineObsidian', true),
  mineAdamant: getActionResourceTooltip('mineAdamant', true),
  
  // Gather/Chop Wood actions (gains only)
  gatherWood: getActionResourceTooltip('gatherWood', false),
  chopWood: getActionResourceTooltip('chopWood', false),
  
  // Hunt action (gains only)
  hunt: getActionResourceTooltip('hunt', false),
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
