
import { GameState } from "../state";

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
    }
  },
  palisades: {
    getContent: (state) => {
      const level = state.buildings.palisades || 0;
      const defense = 5 + level * 3;
      return `Defense: ${defense}`;
    }
  },
};

// Job/Population tooltips
export const jobTooltips: Record<string, TooltipConfig> = {
  gatherer: {
    getContent: () => "+3 Wood per production cycle"
  },
  hunter: {
    getContent: () => "+2 Food per production cycle"
  },
  iron_miner: {
    getContent: () => "+1 Iron per production cycle"
  },
  coal_miner: {
    getContent: () => "+1 Coal per production cycle"
  },
  steel_forger: {
    getContent: () => "+1 Steel per production cycle"
  },
  sulfur_miner: {
    getContent: () => "+1 Sulfur per production cycle"
  },
  silver_miner: {
    getContent: () => "+1 Silver per production cycle"
  },
  obsidian_miner: {
    getContent: () => "+1 Obsidian per production cycle"
  },
  adamant_miner: {
    getContent: () => "+1 Adamant per production cycle"
  },
  moonstone_miner: {
    getContent: () => "+1 Moonstone per production cycle"
  },
  tanner: {
    getContent: () => "+1 Leather per production cycle"
  },
  powder_maker: {
    getContent: () => "+1 Black Powder per production cycle"
  },
  ashfire_dust_maker: {
    getContent: () => "+1 Ashfire Dust per production cycle"
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
  }
};

// Feast progress tooltip
export const feastTooltip: TooltipConfig = {
  getContent: () => {
    return "Village Feast\n+100% Production Bonus";
  }
};

// Combat item tooltips
export const combatItemTooltips: Record<string, TooltipConfig> = {
  ember_bomb: {
    getContent: (state) => {
      const knowledge = state.stats.knowledge || 0;
      const baseDamage = 10;
      const knowledgeBonus = Math.floor(knowledge / 5);
      return `Base Damage: ${baseDamage}\n${knowledge >= 5 ? `Knowledge Bonus: +${knowledgeBonus}\n` : ''}Total Damage: ${baseDamage + knowledgeBonus}`;
    }
  },
  ashfire_bomb: {
    getContent: (state) => {
      const knowledge = state.stats.knowledge || 0;
      const baseDamage = 25;
      const knowledgeBonus = Math.floor(knowledge / 5);
      return `Base Damage: ${baseDamage}\n${knowledge >= 5 ? `Knowledge Bonus: +${knowledgeBonus}\n` : ''}Total Damage: ${baseDamage + knowledgeBonus}`;
    }
  },
  poison_arrows: {
    getContent: (state) => {
      const knowledge = state.stats.knowledge || 0;
      const baseDamage = 15;
      const knowledgeBonus = Math.floor(knowledge / 5);
      return `Base Damage: ${baseDamage} per round for 3 rounds\n${knowledge >= 5 ? `Knowledge Bonus: +${knowledgeBonus}\n` : ''}Total Damage: ${baseDamage + knowledgeBonus} per round`;
    }
  }
};
