import { Action, GameState } from "@shared/schema";
import { getBoneyardBurialMadnessReduction } from "./boneyardMadness";

/**
 * Stranger-approach bonus per completed building level, by `GameState.buildings` key.
 * effectsCalculation applies `count * bonus`; tooltips must use these same values.
 */
const VILLAGE_BUILDING_STRANGER_APPROACH_BONUS = {
  woodenHut: 0.01,
  stoneHut: 0.075,
  longhouse: 0.005,
  furTents: 0.005,
} as const;

function formatStackedStrangerApproachPercent(
  count: number,
  bonus: number,
): string {
  const pct = count * bonus * 100;
  return Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
}

// Utility function to get the next building level
export const getNextBuildingLevel = (
  actionId: string,
  state: GameState,
): number => {
  if (!actionId.startsWith("build")) return 1;

  // Remove "build" prefix and lowercase first character
  let buildingKey = actionId.slice(5);
  buildingKey = buildingKey.charAt(0).toLowerCase() + buildingKey.slice(1);

  return (
    (state.buildings[buildingKey as keyof GameState["buildings"]] || 0) + 1
  );
};

export const villageBuildActions: Record<string, Action> = {
  buildWoodenHut: {
    id: "buildWoodenHut",
    label: "Wooden Hut",
    description: "Simple wooden hut providing basic shelter",
    tooltipEffects: (state: GameState) => {
      const count = state.buildings.woodenHut || 0;
      const totalPopulation = count * 2;
      const effects =
        count > 0
          ? [`+${totalPopulation} Max Population`]
          : ["+2 Max Population"];
      if (count > 0) {
        effects.push(
          `+${formatStackedStrangerApproachPercent(count, VILLAGE_BUILDING_STRANGER_APPROACH_BONUS.woodenHut)}% New Villager Chance`,
        );
      }
      return effects;
    },
    strangerApproachBonus:
      VILLAGE_BUILDING_STRANGER_APPROACH_BONUS.woodenHut,
    building: true,
    show_when: {
      1: {
        "flags.villageUnlocked": true,
      },
      2: {
        "buildings.woodenHut": 1,
      },
      3: {
        "buildings.blacksmith": 1,
      },
      4: {
        "buildings.shallowPit": 1,
      },
      5: {
        "buildings.foundry": 1,
      },
      6: {
        "buildings.darkEstate": 1,
      },
      7: {
        "buildings.woodenHut": 6,
      },
      8: {
        "buildings.altar": 1,
      },
      9: {
        "buildings.woodenHut": 8,
      },
      10: {
        "buildings.woodenHut": 9,
      },
    },
    cost: {
      1: {
        "resources.wood": 50,
      },
      2: {
        "resources.wood": 100,
      },
      3: {
        "resources.wood": 150,
      },
      4: {
        "resources.wood": 250,
      },
      5: {
        "resources.wood": 500,
      },
      6: {
        "resources.wood": 1000,
      },
      7: {
        "resources.wood": 2000,
      },
      8: {
        "resources.wood": 3000,
      },
      9: {
        "resources.wood": 4000,
      },
      10: {
        "resources.wood": 5000,
      },
    },
    effects: {
      1: {
        "buildings.woodenHut": 1,
      },
      2: {
        "buildings.woodenHut": 1,
      },
      3: {
        "buildings.woodenHut": 1,
      },
      4: {
        "buildings.woodenHut": 1,
      },
      5: {
        "buildings.woodenHut": 1,
      },
      6: {
        "buildings.woodenHut": 1,
      },
      7: {
        "buildings.woodenHut": 1,
      },
      8: {
        "buildings.woodenHut": 1,
      },
      9: {
        "buildings.woodenHut": 1,
      },
      10: {
        "buildings.woodenHut": 1,
      },
    },
    executionTime: 15,
    cooldown: 0,
  },

  buildCabin: {
    id: "buildCabin",
    label: "Cabin",
    description: "Basic hunting cabin with tools for hunters",
    tooltipEffects: ["Unlocks Hunters"],
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 1,
        "buildings.cabin": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 150,
        "resources.stone": 50,
      },
    },
    effects: {
      1: {
        "buildings.cabin": 1,
      },
    },
    executionTime: 30,
    cooldown: 0,
  },

  buildBlacksmith: {
    id: "buildBlacksmith",
    label: "Blacksmith",
    description: "Blacksmith with basic tools for crafting",
    tooltipEffects: ["Unlocks Crafting"],
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 1,
        "tools.stone_axe": true,
        "tools.stone_pickaxe": true,
        "buildings.blacksmith": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 150,
        "resources.stone": 100,
        "resources.iron": 50,
      },
    },
    effects: {
      1: {
        "buildings.blacksmith": 1,
      },
    },
    executionTime: 30,
    cooldown: 0,
  },

  buildAdvancedBlacksmith: {
    id: "buildAdvancedBlacksmith",
    label: "Advanced Blacksmith",
    description: "Improved blacksmith with better tools and techniques",
    tooltipEffects: ["Unlocks Schematic Crafting", "2.5 % Craft Discount"],
    building: true,
    show_when: {
      1: {
        "buildings.stoneHut": 1,
        "buildings.blacksmith": 1,
        "buildings.advancedBlacksmith": 0,
      },
    },
    cost: {
      1: {
        "resources.stone": 7500,
        "resources.wood": 2500,
        "resources.steel": 1000,
      },
    },
    effects: {
      1: {
        "buildings.advancedBlacksmith": 1,
      },
    },
    craftingCostReduction: 0.025,
    executionTime: 60,
    cooldown: 0,
  },

  buildGrandBlacksmith: {
    id: "buildGrandBlacksmith",
    label: "Grand Blacksmith",
    description: "Advanced blacksmith capable of creating the finest products",
    tooltipEffects: [
      "Unlocks Schematic Crafting",
      "Unlocks Blacksteel Crafting",
      "5 % Craft Discount",
    ],
    building: true,
    show_when: {
      1: {
        "buildings.stoneHut": 5,
        "buildings.advancedBlacksmith": 1,
        "buildings.grandBlacksmith": 0,
      },
    },
    cost: {
      1: {
        "resources.stone": 10000,
        "resources.wood": 7500,
        "resources.steel": 2500,
        "resources.adamant": 500,
      },
    },
    effects: {
      1: {
        "buildings.grandBlacksmith": 1,
      },
    },
    craftingCostReduction: 0.05,
    executionTime: 120,
    cooldown: 0,
  },

  buildShallowPit: {
    id: "buildShallowPit",
    label: "Shallow Pit",
    description: "Small mining pit allowing extraction of minerals",
    tooltipEffects: ["Unlocks Iron Miners", "Unlocks Coal Miners"],
    building: true,
    show_when: {
      1: {
        "tools.iron_pickaxe": true,
        "buildings.shallowPit": 0,
        "buildings.deepeningPit": 0,
        "buildings.deepPit": 0,
        "buildings.bottomlessPit": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 500,
        "resources.stone": 500,
      },
    },
    effects: {
      1: {
        "buildings.shallowPit": 1,
      },
    },
    executionTime: 30,
    cooldown: 0,
  },

  buildDeepeningPit: {
    id: "buildDeepeningPit",
    label: "Deepening Pit",
    description: "Deeper pit reaching further earth resources",
    tooltipEffects: [
      "Unlocks Iron Miners",
      "Unlocks Coal Miners",
      "Unlocks Sulfur Miners",
    ],
    building: true,
    show_when: {
      1: {
        "tools.steel_pickaxe": true,
        "buildings.shallowPit": 1,
        "buildings.deepeningPit": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 1000,
        "resources.stone": 1000,
        "resources.iron": 250,
      },
    },
    effects: {
      1: {
        "buildings.deepeningPit": 1,
      },
    },
    executionTime: 45,
    cooldown: 0,
  },

  buildDeepPit: {
    id: "buildDeepPit",
    label: "Deep Pit",
    description: "Very deep pit exposing valuable mineral veins",
    tooltipEffects: [
      "Unlocks Iron Miners",
      "Unlocks Coal Miners",
      "Unlocks Sulfur Miners",
      "Unlocks Obsidian Miners",
    ],
    building: true,
    show_when: {
      1: {
        "tools.obsidian_pickaxe": true,
        "buildings.deepeningPit": 1,
        "buildings.deepPit": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 2500,
        "resources.stone": 2500,
        "resources.steel": 500,
      },
    },
    effects: {
      1: {
        "buildings.deepPit": 1,
      },
    },
    executionTime: 60,
    cooldown: 0,
  },

  buildBottomlessPit: {
    id: "buildBottomlessPit",
    label: "Bottomless Pit",
    description: "Extremely deep pit reaching the rarest materials",
    tooltipEffects: [
      "Unlocks Iron Miners",
      "Unlocks Coal Miners",
      "Unlocks Sulfur Miners",
      "Unlocks Obsidian Miners",
      "Unlocks Adamant Miners",
      "Unlocks Moonstone Miners",
    ],
    building: true,
    show_when: {
      1: {
        "tools.adamant_pickaxe": true,
        "buildings.deepPit": 1,
        "buildings.bottomlessPit": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 5000,
        "resources.stone": 5000,
        "resources.steel": 1000,
      },
    },
    effects: {
      1: {
        "buildings.bottomlessPit": 1,
      },
    },
    executionTime: 75,
    cooldown: 0,
  },

  buildFoundry: {
    id: "buildFoundry",
    label: "Foundry",
    description: "Specialized building for steel production",
    tooltipEffects: ["Unlocks Steel Forgers"],
    building: true,
    show_when: {
      1: {
        "buildings.shallowPit": 1,
        "buildings.foundry": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 500,
        "resources.stone": 500,
        "resources.iron": 100,
      },
    },
    effects: {
      1: {
        "buildings.foundry": 1,
      },
    },
    executionTime: 30,
    cooldown: 0,
  },

  buildPrimeFoundry: {
    id: "buildPrimeFoundry",
    label: "Prime Foundry",
    description: "Advanced foundry with improved steel production",
    tooltipEffects: (state: GameState) => {
      const bonusSteel = state.BTP === 1 ? 2 : 1;
      return ["Unlocks Steel Forgers", `Steel Forger: +${bonusSteel} Steel`];
    },
    building: true,
    show_when: {
      1: {
        "buildings.foundry": 1,
        "buildings.deepPit": 1,
        "buildings.primeFoundry": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 5000,
        "resources.stone": 2500,
        "resources.steel": 1000,
      },
    },
    effects: {
      1: {
        "buildings.primeFoundry": 1,
      },
    },
    productionEffects: (state: GameState) => {
      return {
        steel_forger: {
          steel: 1 + state.BTP,
        },
      };
    },
    executionTime: 60,
    cooldown: 0,
  },

  buildMasterworkFoundry: {
    id: "buildMasterworkFoundry",
    label: "Masterwork Foundry",
    description: "Foundry with superior steel production",
    tooltipEffects: (state: GameState) => {
      const bonusSteel = state.BTP === 1 ? 3 : 2;
      return [
        "Unlocks Steel Forgers",
        "Unlocks Blacksteel Forgers",
        `Steel Forger: +${bonusSteel} Steel`,
      ];
    },
    building: true,
    show_when: {
      1: {
        "buildings.primeFoundry": 1,
        "buildings.bottomlessPit": 1,
        "buildings.masterworkFoundry": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 10000,
        "resources.stone": 5000,
        "resources.steel": 2500,
      },
    },
    effects: {
      1: {
        "buildings.masterworkFoundry": 1,
      },
    },
    productionEffects: (state: GameState) => {
      return {
        steel_forger: {
          steel: 2 + state.BTP,
        },
      };
    },
    executionTime: 90,
    cooldown: 0,
  },

  buildGreatCabin: {
    id: "buildGreatCabin",
    label: "Great Cabin",
    description: "Expanded hunting lodge increasing hunter output",
    tooltipEffects: [
      "Unlocks Hunters",
      "Hunter: +5 Food",
      `Hunter: +1 Fur`,
      `Hunter: +1 Bones`,
    ],
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 7,
        "buildings.cabin": 1,
        "buildings.greatCabin": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 5000,
        "resources.stone": 2500,
      },
    },
    effects: {
      1: {
        "buildings.greatCabin": 1,
      },
    },
    productionEffects: {
      hunter: {
        food: 5,
        fur: 1,
        bones: 1,
      },
    },
    executionTime: 60,
    cooldown: 0,
  },

  buildGrandHunterLodge: {
    id: "buildGrandHunterLodge",
    label: "Grand Hunter Lodge",
    description: "Supreme hunting lodge for master hunters",
    tooltipEffects: [
      "Unlocks Hunters",
      "Hunter: +10 Food",
      "Hunter: +2 Fur",
      "Hunter: +2 Bones",
    ],
    building: true,
    show_when: {
      1: {
        "buildings.stoneHut": 5,
        "buildings.greatCabin": 1,
        "buildings.grandHunterLodge": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 10000,
        "resources.stone": 5000,
        "resources.bones": 5000,
      },
    },
    effects: {
      1: {
        "buildings.grandHunterLodge": 1,
      },
    },
    productionEffects: {
      hunter: {
        food: 10,
        fur: 2,
        bones: 2,
      },
    },
    executionTime: 90,
    cooldown: 0,
  },

  buildTimberMill: {
    id: "buildTimberMill",
    label: "Timber Mill",
    description: "Mill helping processes wood more efficiently",
    tooltipEffects: ["Gatherer: +5 Wood"],
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 8,
        "buildings.timberMill": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 5000,
        "resources.stone": 2500,
        "resources.iron": 1000,
      },
    },
    effects: {
      1: {
        "buildings.timberMill": 1,
      },
    },
    productionEffects: {
      gatherer: {
        wood: 5,
      },
    },
    executionTime: 45,
    cooldown: 0,
  },

  buildQuarry: {
    id: "buildQuarry",
    label: "Quarry",
    description: "Stone quarry increasing gatherer stone output",
    tooltipEffects: ["Gatherer: +5 Stone"],
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 8,
        "buildings.quarry": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 5000,
        "resources.stone": 2500,
      },
    },
    effects: {
      1: {
        "buildings.quarry": 1,
      },
    },
    productionEffects: {
      gatherer: {
        stone: 5,
      },
    },
    executionTime: 45,
    cooldown: 0,
  },

  buildClerksHut: {
    id: "buildClerksHut",
    label: "Clerk's Hut",
    description: "Hut where clerks track resources of the village",
    tooltipEffects: ["+2 Knowledge", "Resource change hints"],
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 4,
        "buildings.clerksHut": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 750,
        "resources.stone": 500,
      },
    },
    effects: {
      1: {
        "buildings.clerksHut": 1,
      },
    },
    statsEffects: {
      knowledge: 2,
    },
    executionTime: 30,
    cooldown: 0,
  },

  buildScriptorium: {
    id: "buildScriptorium",
    label: "Scriptorium",
    description:
      "Library of knowledge providing detailed tracking of resources",
    tooltipEffects: ["+5 Knowledge", "Improved resource change hints"],
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 7,
        "buildings.clerksHut": 1,
        "buildings.scriptorium": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 5000,
        "resources.stone": 2500,
      },
    },
    effects: {
      1: {
        "buildings.scriptorium": 1,
      },
    },
    statsEffects: {
      knowledge: 5,
    },
    executionTime: 60,
    cooldown: 0,
  },

  buildInkwardenAcademy: {
    id: "buildInkwardenAcademy",
    label: "Inkwarden Academy",
    description:
      "Grand academy of scholars providing supreme knowledge and resource tracking",
    tooltipEffects: ["+10 Knowledge", "Improved resource change hints", "Resource highlighting"],
    building: true,
    show_when: {
      1: {
        "buildings.stoneHut": 3,
        "buildings.scriptorium": 1,
        "buildings.inkwardenAcademy": 0,
      },
    },
    cost: {
      1: {
        "resources.stone": 10000,
        "resources.steel": 2500,
        "resources.adamant": 2500,
      },
    },
    effects: {
      1: {
        "buildings.inkwardenAcademy": 1,
      },
    },
    statsEffects: {
      knowledge: 10,
    },
    executionTime: 90,
    cooldown: 0,
  },

  buildTannery: {
    id: "buildTannery",
    label: "Tannery",
    description: "Workshop where furs are processed into leather",
    tooltipEffects: ["Unlocks Tanners"],
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 6,
        "buildings.tannery": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 500,
        "resources.stone": 500,
      },
    },
    effects: {
      1: {
        "buildings.tannery": 1,
      },
    },
    executionTime: 30,
    cooldown: 0,
  },

  buildMasterTannery: {
    id: "buildMasterTannery",
    label: "Master Tannery",
    description: "Advanced tannery improving leather production",
    tooltipEffects: (state: GameState) => {
      const bonusLeather = state.BTP === 1 ? 2 : 1;
      return ["Unlocks Tanners", `Tanner: +${bonusLeather} Leather`];
    },
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 10,
        "buildings.tannery": 1,
        "buildings.masterTannery": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 5000,
        "resources.stone": 2500,
        "resources.iron": 2500,
      },
    },
    effects: {
      1: {
        "buildings.masterTannery": 1,
      },
    },
    productionEffects: (state: GameState) => {
      return {
        tanner: {
          leather: 1 + state.BTP,
        },
      };
    },
    executionTime: 60,
    cooldown: 0,
  },

  buildHighTannery: {
    id: "buildHighTannery",
    label: "High Tannery",
    description: "Supreme tannery for expert leather craftsmen",
    tooltipEffects: (state: GameState) => {
      const bonusLeather = state.BTP === 1 ? 3 : 2;
      return ["Unlocks Tanners", `Tanner: +${bonusLeather} Leather`];
    },
    building: true,
    show_when: {
      1: {
        "buildings.stoneHut": 5,
        "buildings.masterTannery": 1,
        "buildings.highTannery": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 10000,
        "resources.stone": 5000,
        "resources.steel": 2500,
      },
    },
    effects: {
      1: {
        "buildings.highTannery": 1,
      },
    },
    productionEffects: (state: GameState) => {
      return {
        tanner: {
          leather: 2 + state.BTP,
        },
      };
    },
    executionTime: 90,
    cooldown: 0,
  },

  buildAltar: {
    id: "buildAltar",
    label: "Altar",
    description: "Sacred place of worship and sacrificing",
    tooltipEffects: ["-2 Madness"],
    building: true,
    show_when: {
      1: {
        "flags.forestUnlocked": true,
        "buildings.woodenHut": 5,
        "tools.steel_axe": true,
      },
    },
    cost: {
      1: {
        "resources.wood": 1000,
        "resources.stone": 1000,
        "resources.bones": 1000,
        "resources.silver": 100,
      },
    },
    effects: {
      1: {
        "buildings.altar": 1,
      },
    },
    statsEffects: {
      madness: -2,
    },
    executionTime: 30,
    cooldown: 0,
  },

  buildChitinPlating: {
    id: "buildChitinPlating",
    label: "Chitin Plating",
    description: "Fortifications are reinforced with impenetrable chitin plates",
    tooltipEffects: ["+10 Defense"],
    building: true,
    show_when: {
      1: {
        "relics.chitin_plates": true,
        "buildings.watchtower": 1,
        "buildings.palisades": 1,
        "buildings.chitinPlating": 0,
      },
    },
    cost: {
      1: {
        "resources.steel": 500,
        "relics.chitin_plates": true,
      },
    },
    effects: {
      1: {
        "buildings.chitinPlating": 1,
      },
    },
    executionTime: 45,
    cooldown: 0,
  },

  buildCoinhouse: {
    id: "buildCoinhouse",
    label: "Coinhouse",
    description: "Modest financial building allowing to make small investments",
    tooltipEffects: ["Unlocks Investments"],
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 8,
        "buildings.coinhouse": 0,
      },
    },
    cost: {
      1: {
        "resources.stone": 1000,
        "resources.wood": 500,
        "resources.gold": 50,
      },
    },
    effects: {
      1: {
        "buildings.coinhouse": 1,
      },
    },
    executionTime: 30,
    cooldown: 0,
  },

  buildBank: {
    id: "buildBank",
    label: "Bank",
    description: "Financial building allowing to make larger investments",
    tooltipEffects: [
      "Unlocks Investments",
      "Invest up to 500 Gold",
      "+1% Lucky Chance",
    ],
    building: true,
    show_when: {
      1: {
        "buildings.coinhouse": 1,
        "buildings.stoneHut": 3,
        "buildings.bank": 0,
      },
    },
    cost: {
      1: {
        "resources.stone": 5000,
        "resources.iron": 2500,
        "resources.gold": 250,
      },
    },
    effects: {
      1: {
        "buildings.bank": 1,
      },
    },
    executionTime: 60,
    cooldown: 0,
  },

  buildTreasury: {
    id: "buildTreasury",
    label: "Treasury",
    description: "Big financial building allowing to make very large investments",
    tooltipEffects: [
      "Unlocks Investments",
      "Invest up to 1000 Gold",
      "+2% Lucky Chance",
    ],
    building: true,
    show_when: {
      1: {
        "buildings.bank": 1,
        "buildings.stoneHut": 8,
        "buildings.treasury": 0,
      },
    },
    cost: {
      1: {
        "resources.stone": 10000,
        "resources.steel": 5000,
        "resources.gold": 500,
      },
    },
    effects: {
      1: {
        "buildings.treasury": 1,
      },
    },
    executionTime: 90,
    cooldown: 0,
  },

  buildShrine: {
    id: "buildShrine",
    label: "Shrine",
    description: "Holy shrine providing greater protection against madness",
    tooltipEffects: ["-5 Madness"],
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 9,
        "buildings.altar": 1,
        "buildings.shrine": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 5000,
        "resources.stone": 2500,
        "resources.obsidian": 250,
        "resources.gold": 100,
      },
    },
    effects: {
      1: {
        "buildings.shrine": 1,
      },
    },
    statsEffects: {
      madness: -5,
    },
    executionTime: 45,
    cooldown: 0,
  },

  buildTemple: {
    id: "buildTemple",
    label: "Temple",
    description: "Grand temple offering strong resistance to madness",
    tooltipEffects: ["-8 Madness"],
    building: true,
    show_when: {
      1: {
        "buildings.stoneHut": 3,
        "buildings.shrine": 1,
        "buildings.temple": 0,
      },
    },
    cost: {
      1: {
        "resources.stone": 7500,
        "resources.obsidian": 1000,
        "resources.gold": 250,
      },
    },
    effects: {
      1: {
        "buildings.temple": 1,
      },
    },
    statsEffects: {
      madness: -8,
    },
    executionTime: 60,
    cooldown: 0,
  },

  buildSanctum: {
    id: "buildSanctum",
    label: "Sanctum",
    description:
      "Divine sanctum providing the greatest protection against the darkness",
    tooltipEffects: ["-12 Madness"],
    building: true,
    show_when: {
      1: {
        "buildings.stoneHut": 6,
        "buildings.temple": 1,
        "buildings.sanctum": 0,
      },
    },
    cost: {
      1: {
        "resources.stone": 10000,
        "resources.adamant": 500,
        "resources.moonstone": 100,
        "resources.gold": 500,
      },
    },
    effects: {
      1: {
        "buildings.sanctum": 1,
      },
    },
    statsEffects: {
      madness: -12,
    },
    executionTime: 90,
    cooldown: 0,
  },

  buildAlchemistHall: {
    id: "buildAlchemistHall",
    label: "Alchemist's Hall",
    description: "Hall where the alchemist creates powders and explosives",
    tooltipEffects: ["Unlocks Powder Makers"],
    building: true,
    show_when: {
      1: {
        "buildings.stoneHut": 4,
        "buildings.alchemistHall": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 5000,
        "resources.stone": 5000,
        "resources.steel": 1000,
      },
    },
    effects: {
      1: {
        "buildings.alchemistHall": 1,
      },
    },
    executionTime: 90,
    cooldown: 0,
  },

  buildTradePost: {
    id: "buildTradePost",
    label: "Trade Post",
    description: "Trading post attracting merchants selling goods",
    tooltipEffects: ["Higher Trade Amounts", "+1 Trade at Travelling Merchant", "Unlocks Call Merchant"],
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 4,
        "buildings.tradePost": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 500,
        "resources.stone": 500,
      },
    },
    effects: {
      1: {
        "buildings.tradePost": 1,
      },
    },
    executionTime: 30,
    cooldown: 0,
  },

  buildGrandBazaar: {
    id: "buildGrandBazaar",
    label: "Grand Bazaar",
    description: "Sprawling marketplace attracting more merchants",
    tooltipEffects: [
      "Higher Trade Amounts",
      "+2 Trades at Travelling Merchant",
    ],
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 8,
        "buildings.tradePost": 1,
        "buildings.grandBazaar": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 1500,
        "resources.stone": 1000,
      },
    },
    effects: {
      1: {
        "buildings.grandBazaar": 1,
      },
    },
    executionTime: 45,
    cooldown: 0,
  },

  buildMerchantsGuild: {
    id: "buildMerchantsGuild",
    label: "Merchants Guild",
    description: "Powerful guild bringing the best trades and merchants",
    tooltipEffects: [
      "Higher Trade Amounts",
      "+3 Trades at Travelling Merchant",
    ],
    building: true,
    show_when: {
      1: {
        "buildings.stoneHut": 1,
        "buildings.grandBazaar": 1,
        "buildings.merchantsGuild": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 2500,
        "resources.stone": 2500,
      },
    },
    effects: {
      1: {
        "buildings.merchantsGuild": 1,
      },
    },
    executionTime: 60,
    cooldown: 0,
  },

  buildBastion: {
    id: "buildBastion",
    label: "Bastion",
    description: "Massive fortification serving as the last line of defense",
    tooltipEffects: ["+20 Defense", "+10 Attack", "+50 Integrity"],
    building: true,
    show_when: {
      1: {
        "story.seen.portalBlasted": true,
        "buildings.bastion": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 2500,
        "resources.stone": 5000,
        "resources.steel": 2500,
      },
    },
    effects: {
      1: {
        "buildings.bastion": 1,
      },
    },
    executionTime: 90,
    cooldown: 0,
  },

  buildWatchtower: {
    id: "buildWatchtower",
    label: "Watchtower",
    description: "Tall tower providing early warning of threats",
    tooltipEffects: ["+15 Defense", "+20 Attack", "+30 Integrity"],
    building: true,
    show_when: {
      1: {
        "buildings.bastion": 1,
        "buildings.watchtower": 0,
      },
      2: {
        "buildings.watchtower": 1,
      },
      3: {
        "buildings.watchtower": 2,
      },
      4: {
        "buildings.watchtower": 3,
      },
    },
    cost: {
      1: {
        "resources.wood": 5000,
        "resources.stone": 2500,
        "resources.iron": 1000,
      },
      2: {
        "resources.wood": 7500,
        "resources.stone": 5000,
        "resources.steel": 1000,
        "resources.iron": 2500,
      },
      3: {
        "resources.wood": 10000,
        "resources.stone": 7500,
        "resources.steel": 1500,
        "resources.obsidian": 500,
      },
      4: {
        "resources.wood": 15000,
        "resources.stone": 10000,
        "resources.steel": 2500,
        "resources.obsidian": 1000,
        "resources.adamant": 500,
      },
    },
    effects: {
      1: {
        "buildings.watchtower": 1,
      },
      2: {
        "buildings.watchtower": 1,
      },
      3: {
        "buildings.watchtower": 1,
      },
      4: {
        "buildings.watchtower": 1,
      },
    },
    executionTime: 60,
    cooldown: 0,
  },

  buildPalisades: {
    id: "buildPalisades",
    label: "Palisades",
    description: "Defensive walls protecting the settlement",
    tooltipEffects: ["+10 Defense", "+20 Integrity"],
    building: true,
    show_when: {
      1: {
        "story.seen.portalBlasted": true,
        "buildings.bastion": 1,
        "buildings.palisades": 0,
      },
      2: {
        "buildings.palisades": 1,
      },
      3: {
        "buildings.palisades": 2,
      },
      4: {
        "buildings.palisades": 3,
      },
    },
    cost: {
      1: {
        "resources.wood": 10000,
      },
      2: {
        "resources.wood": 7500,
        "resources.iron": 2500,
      },
      3: {
        "resources.stone": 7500,
        "resources.iron": 2500,
      },
      4: {
        "resources.stone": 7500,
        "resources.steel": 2500,
      },
    },
    effects: {
      1: {
        "buildings.palisades": 1,
      },
      2: {
        "buildings.palisades": 1,
      },
      3: {
        "buildings.palisades": 1,
      },
      4: {
        "buildings.palisades": 1,
      },
    },
    executionTime: 60,
    cooldown: 0,
  },

  buildStoneHut: {
    id: "buildStoneHut",
    label: "Stone Hut",
    description: "Durable stone dwelling providing superior shelter",
    tooltipEffects: (state: GameState) => {
      const count = state.buildings.stoneHut || 0;
      const totalPopulation = count * 4;
      const effects =
        count > 0
          ? [`+${totalPopulation} Max Population`]
          : ["+4 Max Population"];
      if (count > 0) {
        effects.push(
          `+${formatStackedStrangerApproachPercent(count, VILLAGE_BUILDING_STRANGER_APPROACH_BONUS.stoneHut)}% New Villager Chance`,
        );
      }
      return effects;
    },
    strangerApproachBonus: VILLAGE_BUILDING_STRANGER_APPROACH_BONUS.stoneHut,
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 10,
        "buildings.stoneHut": 0,
      },
      2: {
        "buildings.stoneHut": 1,
      },
      3: {
        "buildings.tradePost": 1,
        "buildings.stoneHut": 2,
      },
      4: {
        "buildings.stoneHut": 3,
      },
      5: {
        "buildings.alchemistHall": 1,
        "buildings.stoneHut": 4,
      },
      6: {
        "buildings.stoneHut": 5,
      },
      7: {
        "buildings.shrine": 1,
        "buildings.stoneHut": 6,
      },
      8: {
        "buildings.stoneHut": 7,
      },
      9: {
        "buildings.stoneHut": 8,
      },
      10: {
        "buildings.stoneHut": 9,
      },
    },
    cost: {
      1: {
        "resources.stone": 1000,
      },
      2: {
        "resources.stone": 2000,
      },
      3: {
        "resources.stone": 3000,
      },
      4: {
        "resources.stone": 4000,
      },
      5: {
        "resources.stone": 5000,
      },
      6: {
        "resources.stone": 6000,
      },
      7: {
        "resources.stone": 7000,
      },
      8: {
        "resources.stone": 8000,
      },
      9: {
        "resources.stone": 9000,
      },
      10: {
        "resources.stone": 10000,
      },
    },
    effects: {
      1: {
        "buildings.stoneHut": 1,
      },
      2: {
        "buildings.stoneHut": 1,
      },
      3: {
        "buildings.stoneHut": 1,
      },
      4: {
        "buildings.stoneHut": 1,
      },
      5: {
        "buildings.stoneHut": 1,
      },
      6: {
        "buildings.stoneHut": 1,
      },
      7: {
        "buildings.stoneHut": 1,
      },
      8: {
        "buildings.stoneHut": 1,
      },
      9: {
        "buildings.stoneHut": 1,
      },
      10: {
        "buildings.stoneHut": 1,
      },
    },
    executionTime: 90,
    cooldown: 0,
  },

  buildFortifiedMoat: {
    id: "buildFortifiedMoat",
    label: "Fortified Moat",
    description: "Defensive moat slowing and weakening attackers",
    tooltipEffects: ["+5 Defense"],
    building: true,
    show_when: {
      1: {
        "buildings.bastion": 1,
        "buildings.fortifiedMoat": 0,
      },
    },
    cost: {
      1: {
        "resources.stone": 5000,
      },
    },
    effects: {
      1: {
        "buildings.fortifiedMoat": 1,
      },
    },
    executionTime: 60,
    cooldown: 0,
  },

  buildWizardTower: {
    id: "buildWizardTower",
    label: "Wizard Tower",
    description: "Mystical tower where the wizard conducts arcane research",
    tooltipEffects: ["Unlocks Wizard Story"],
    building: true,
    show_when: {
      1: {
        "buildings.bastion": 1,
        "buildings.wizardTower": 0,
        "story.seen.wizardArrives": true,
      },
    },
    cost: {
      1: {
        "resources.wood": 7500,
        "resources.stone": 5000,
        "resources.steel": 2500,
        "resources.adamant": 2500,
      },
    },
    effects: {
      1: {
        "buildings.wizardTower": 1,
      },
    },
    executionTime: 120,
    cooldown: 0,
  },

  buildLonghouse: {
    id: "buildLonghouse",
    label: "Longhouse",
    description: "Massive nordic communal hall housing many villagers",
    tooltipEffects: (state: GameState) => {
      const count = state.buildings.longhouse || 0;
      const totalPopulation = count * 8;
      const effects =
        count > 0
          ? [`+${totalPopulation} Max Population`]
          : ["+8 Max Population"];
      if (count > 0) {
        effects.push(
          `+${formatStackedStrangerApproachPercent(count, VILLAGE_BUILDING_STRANGER_APPROACH_BONUS.longhouse)}% New Villager Chance`,
        );
      }
      return effects;
    },
    strangerApproachBonus: VILLAGE_BUILDING_STRANGER_APPROACH_BONUS.longhouse,
    building: true,
    show_when: {
      1: {
        "story.seen.longhouseUnlocked": true,
        "buildings.longhouse": 0,
      },
      2: {
        "buildings.longhouse": 1,
      },
      3: {
        "buildings.longhouse": 2,
      },
      4: {
        "buildings.longhouse": 3,
      },
      5: {
        "buildings.longhouse": 4,
      },
    },
    cost: {
      1: {
        "resources.wood": 10000,
        "resources.stone": 5000,
        "resources.fur": 5000,
      },
      2: {
        "resources.wood": 12500,
        "resources.stone": 7500,
        "resources.fur": 7500,
      },
      3: {
        "resources.wood": 15000,
        "resources.stone": 10000,
        "resources.fur": 10000,
      },
      4: {
        "resources.wood": 17500,
        "resources.stone": 12500,
        "resources.fur": 12500,
      },
      5: {
        "resources.wood": 20000,
        "resources.stone": 15000,
        "resources.fur": 15000,
      },
    },
    effects: {
      1: {
        "buildings.longhouse": 1,
      },
      2: {
        "buildings.longhouse": 1,
      },
      3: {
        "buildings.longhouse": 1,
      },
      4: {
        "buildings.longhouse": 1,
      },
      5: {
        "buildings.longhouse": 1,
      },
    },
    executionTime: 120,
    cooldown: 0,
  },

  buildFurTents: {
    id: "buildFurTents",
    label: "Fur Tent",
    description: "Warm fur shelter used by the wandering tribe",
    tooltipEffects: (state: GameState) => {
      const count = state.buildings.furTents || 0;
      const totalPopulation = count * 4;
      const effects =
        count > 0
          ? [`+${totalPopulation} Max Population`]
          : ["+4 Max Population"];
      if (count > 0) {
        effects.push(
          `+${formatStackedStrangerApproachPercent(count, VILLAGE_BUILDING_STRANGER_APPROACH_BONUS.furTents)}% New Villager Chance`,
        );
      }
      return effects;
    },
    strangerApproachBonus: VILLAGE_BUILDING_STRANGER_APPROACH_BONUS.furTents,
    building: true,
    show_when: {
      1: {
        "story.seen.furTentsUnlocked": true,
      },
      2: {
        "buildings.furTents": 1,
      },
      3: {
        "buildings.furTents": 2,
      },
      4: {
        "buildings.furTents": 3,
      },
      5: {
        "buildings.furTents": 4,
      },
    },
    cost: {
      1: {
        "resources.fur": 2500,
      },
      2: {
        "resources.fur": 5000,
      },
      3: {
        "resources.fur": 7500,
      },
      4: {
        "resources.fur": 10000,
      },
      5: {
        "resources.fur": 15000,
      },
    },
    effects: {
      1: {
        "buildings.furTents": 1,
      },
      2: {
        "buildings.furTents": 1,
      },
      3: {
        "buildings.furTents": 1,
      },
      4: {
        "buildings.furTents": 1,
      },
      5: {
        "buildings.furTents": 1,
      },
    },
    executionTime: 75,
    cooldown: 0,
  },

  buildTraps: {
    id: "buildTraps",
    label: "Traps",
    description: "Traps around the village weakening all attackers",
    tooltipEffects: [
      "+10% chance to win against attacking foes and less villagers killed",
    ],
    building: true,
    show_when: {
      1: {
        "story.seen.firstWolfAttack": true,
        "buildings.traps": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 750,
        "resources.iron": 250,
      },
    },
    effects: {
      1: {
        "buildings.traps": 1,
      },
    },
    executionTime: 30,
    cooldown: 0,
  },

  buildImprovedTraps: {
    id: "buildImprovedTraps",
    label: "Improved Traps",
    description: "Upgraded perimeter traps with stronger mechanisms and better coverage",
    tooltipEffects: [
      "+20% chance to win against attacking foes and fewer villagers killed",
    ],
    building: true,
    show_when: {
      1: {
        "buildings.traps": 1,
        "buildings.woodenHut": 6,
        "buildings.improvedTraps": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 2500,
        "resources.steel": 1000,
      },
    },
    effects: {
      1: {
        "buildings.improvedTraps": 1,
        "buildings.traps": 1,
      },
    },
    executionTime: 60,
    cooldown: 0,
  },

  buildBlackMonolith: {
    id: "buildBlackMonolith",
    label: "Black Monolith",
    description: "Dark monument built for living sacrifices",
    tooltipEffects: (state: GameState) => {
      const animalSacrificeLevel =
        Number(state.story?.seen?.animalsSacrificeLevel) || 0;
      const humanSacrificeLevel =
        Number(state.story?.seen?.humansSacrificeLevel) || 0;
      const animalBonusMadnessReduction = Math.min(animalSacrificeLevel, 10);
      const humanBonusMadnessReduction = Math.min(humanSacrificeLevel * 2, 20);

      const effects = ["-5 Madness"];

      if (animalBonusMadnessReduction > 0) {
        effects.push(
          `-${animalBonusMadnessReduction} Madness from Animal sacrifices`,
        );
      } else {
        effects.push("-1 Madness per Animal sacrifice (max -10)");
      }

      if (humanBonusMadnessReduction > 0) {
        effects.push(
          `-${humanBonusMadnessReduction} Madness from Human sacrifices`,
        );
      } else if (state.flags?.humanSacrificeUnlocked) {
        effects.push("-2 Madness per Human sacrifice (max -20)");
      }

      return effects;
    },
    building: true,
    show_when: {
      1: {
        "flags.monolithUnlocked": true,
        "buildings.blackMonolith": 0,
      },
    },
    cost: {
      1: {
        "resources.stone": 2500,
        "resources.adamant": 500,
      },
    },
    effects: {
      1: {
        "buildings.blackMonolith": 1,
      },
    },
    statsEffects: {
      madness: -5,
    },
    executionTime: 90,
    cooldown: 0,
  },

  buildPillarOfClarity: {
    id: "buildPillarOfClarity",
    label: "Pillar of Clarity",
    description: "Pure white obelisk that cleanses darkness from minds",
    tooltipEffects: ["-40 Madness"],
    building: true,
    show_when: {
      1: {
        "buildings.pillarOfClarity": 0,
        "story.seen.pillarOfClarityUnlocked": true,
      },
    },
    cost: {
      1: {
        "resources.moonstone": 500,
      },
    },
    effects: {
      1: {
        "buildings.pillarOfClarity": 1,
        "buildings.blackMonolith": 0,
      },
    },
    statsEffects: {
      madness: -40,
    },
    executionTime: 90,
    cooldown: 0,
  },

  buildBoneyard: {
    id: "buildBoneyard",
    label: "Boneyard",
    description:
      "Ground where the dead are laid to rest, easing the villager's grief.",
    tooltipEffects: (state: GameState) => {
      const reduction = getBoneyardBurialMadnessReduction(state);
      const current =
        reduction === 0 ? "0" : String(Math.abs(reduction));
      return [
        "Up to -10 Madness",
        "-1 Madness per 50 villagers lost since built",
        `Current: -${current} Madness`,
      ];
    },
    building: true,
    show_when: {
      1: {
        "story.seen.boneyardUnlocked": true,
        "buildings.boneyard": 0,
      },
    },
    cost: {
      1: {
        "resources.stone": 10000,
        "resources.bones": 5000,
      },
    },
    effects: {
      1: {
        "buildings.boneyard": 1,
        "story.seen.boneyardDeathBaseline": (state: GameState) =>
          state.stats.villagerDeathsLifetime ?? 0,
      },
    },
    executionTime: 60,
    cooldown: 0,
  },

  buildBoneTemple: {
    id: "buildBoneTemple",
    label: "Bone Temple",
    description: "Monstrous structure built of bones, honoring the old gods",
    tooltipEffects: (state: GameState) => {
      const animalSacrificeLevel =
        Number(state.story?.seen?.animalsSacrificeLevel) || 0;
      const humanSacrificeLevel =
        Number(state.story?.seen?.humansSacrificeLevel) || 0;
      const animalBonusMadnessReduction = Math.min(animalSacrificeLevel, 10);
      const humanBonusMadnessReduction = Math.min(humanSacrificeLevel * 2, 20);

      const effects = ["-10 Madness"];

      if (animalBonusMadnessReduction > 0) {
        effects.push(
          `-${animalBonusMadnessReduction} Madness from Animal sacrifices`,
        );
      } else {
        effects.push("-1 Madness per Animal sacrifice (max -10)");
      }

      if (humanBonusMadnessReduction > 0) {
        effects.push(
          `-${humanBonusMadnessReduction} Madness from Human sacrifices`,
        );
      } else if (state.flags?.humanSacrificeUnlocked) {
        effects.push("-2 Madness per Human sacrifice (max -20)");
      }
      effects.push("Totem Sacrifices: +25% Bonus");
      return effects;
    },
    actionBonuses: {
      boneTotems: {
        resourceMultiplier: 1.25,
      },
      leatherTotems: {
        resourceMultiplier: 1.25,
      },
    },
    building: true,
    show_when: {
      1: {
        "buildings.blackMonolith": 1,
        "buildings.boneTemple": 0,
        "story.seen.boneTempleUnlocked": true,
      },
    },
    cost: {
      1: {
        "resources.bones": 25000,
      },
    },
    effects: {
      1: {
        "buildings.boneTemple": 1,
      },
    },
    statsEffects: {
      madness: -10,
    },
    executionTime: 120,
    cooldown: 0,
  },

  buildPaleCross: {
    id: "buildPaleCross",
    label: "Pale Cross",
    description:
      "Towering monument of bleached bones amplifying bone totem sacrifices.",
    tooltipEffects: [
      "+5 Madness",
    ],
    building: true,
    show_when: {
      1: {
        "story.seen.paleCrossUnlocked": true,
        "buildings.paleCross": 0,
        "buildings.consecratedPaleCross": 0,
      },
    },
    cost: {
      1: {
        "resources.bones": 15000,
      },
    },
    effects: {
      1: {
        "buildings.paleCross": 1,
      },
    },
    statsEffects: {
      madness: 5,
    },
    executionTime: 90,
    cooldown: 0,
  },

  buildConsecratedPaleCross: {
    id: "buildConsecratedPaleCross",
    label: "Consecrated Pale Cross",
    description:
      "Towering monument of bleached bones geatly amplifying bone totem sacrifices.",
    tooltipEffects: [
      "+10 Madness",
      "Bone Totem Sacrifice Bonus: 50-100 Gold",
    ],
    building: true,
    show_when: {
      1: {
        "buildings.consecratedPaleCross": 0,
      },
    },
    cost: {
      1: {},
    },
    effects: {
      1: {
        "buildings.consecratedPaleCross": 1,
      },
    },
    statsEffects: {
      madness: 10,
    },
    executionTime: 1,
    cooldown: 0,
  },

  buildDarkEstate: {
    id: "buildDarkEstate",
    label: "Dark Estate",
    description: "Secluded estate providing refuge from the world",
    tooltipEffects: ["Unlocks Estate Tab"],
    building: true,
    show_when: {
      1: {
        "buildings.darkEstate": 0,
        "buildings.woodenHut": 3,
      },
    },
    cost: {
      1: {
        "resources.wood": 500,
        "resources.stone": 500,
      },
    },
    effects: {
      1: {
        "buildings.darkEstate": 1,
      },
    },
    executionTime: 45,
    cooldown: 0,
  },

  buildSupplyHut: {
    id: "buildSupplyHut",
    label: "Supply Hut",
    description: "Small hut for storing resources",
    tooltipEffects: ["Resource Limit: 1.000"],
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 2,
        "buildings.supplyHut": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 250,
      },
    },
    effects: {
      1: {
        "buildings.supplyHut": 1,
      },
    },
    executionTime: 30,
    cooldown: 0,
  },

  buildStorehouse: {
    id: "buildStorehouse",
    label: "Storehouse",
    description: "Expanded storage facility for more resources",
    tooltipEffects: ["Resource Limit: 2.500"],
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 3,
        "buildings.supplyHut": 1,
        "buildings.storehouse": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 500,
        "resources.stone": 500,
      },
    },
    effects: {
      1: {
        "buildings.storehouse": 1,
      },
    },
    executionTime: 45,
    cooldown: 0,
  },

  buildFortifiedStorehouse: {
    id: "buildFortifiedStorehouse",
    label: "Fortified Storehouse",
    description: "Reinforced storage building with enhanced capacity",
    tooltipEffects: ["Resource Limit: 5,000", "2.5% Craft Discount"],
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 6,
        "buildings.storehouse": 1,
        "buildings.fortifiedStorehouse": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 2500,
        "resources.stone": 2500,
      },
    },
    effects: {
      1: {
        "buildings.fortifiedStorehouse": 1,
      },
    },
    craftingCostReduction: 0.025,
    executionTime: 60,
    cooldown: 0,
  },

  buildVillageWarehouse: {
    id: "buildVillageWarehouse",
    label: "Village Warehouse",
    description: "Large warehouse capable of storing vast quantities",
    tooltipEffects: [
      "Resource Limit: 10.000",
      "2.5% Craft Discount",
      "2.5% Build Discount",
    ],
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 8,
        "buildings.fortifiedStorehouse": 1,
        "buildings.villageWarehouse": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 5000,
        "resources.stone": 5000,
        "resources.steel": 500,
      },
    },
    effects: {
      1: {
        "buildings.villageWarehouse": 1,
      },
    },
    craftingCostReduction: 0.025,
    buildingCostReduction: 0.025,
    executionTime: 75,
    cooldown: 0,
  },

  buildGrandRepository: {
    id: "buildGrandRepository",
    label: "Grand Repository",
    description: "Massive repository with exceptional storage capacity",
    tooltipEffects: [
      "Resource Limit: 25.000",
      "5% Craft Discount",
      "2.5% Build Discount",
    ],
    building: true,
    show_when: {
      1: {
        "buildings.stoneHut": 2,
        "buildings.villageWarehouse": 1,
        "buildings.grandRepository": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 5000,
        "resources.stone": 10000,
        "resources.steel": 1000,
      },
    },
    effects: {
      1: {
        "buildings.grandRepository": 1,
      },
    },
    craftingCostReduction: 0.05,
    buildingCostReduction: 0.025,
    executionTime: 90,
    cooldown: 0,
  },

  buildGreatVault: {
    id: "buildGreatVault",
    label: "Great Vault",
    description: "Supreme vault capable of storing immense resources",
    tooltipEffects: [
      "Resource Limit: 50.000",
      "5% Craft Discount",
      "5% Build Discount",
    ],
    building: true,
    show_when: {
      1: {
        "buildings.stoneHut": 6,
        "buildings.grandRepository": 1,
        "buildings.greatVault": 0,
      },
    },
    cost: {
      1: {
        "resources.stone": 15000,
        "resources.steel": 1500,
      },
    },
    effects: {
      1: {
        "buildings.greatVault": 1,
      },
    },
    craftingCostReduction: 0.05,
    buildingCostReduction: 0.05,
    executionTime: 120,
    cooldown: 0,
  },
  buildHeartfire: {
    id: "buildHeartfire",
    label: "Heartfire",
    description: "Sacred fire offering comfort and a sense of protection",
    tooltipEffects: ["Unlocks Feed Fire action"],
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 4,
        "buildings.heartfire": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 1000,
        "resources.stone": 1000,
      },
    },
    effects: {
      1: {
        "buildings.heartfire": 1,
      },
    },
    executionTime: 30,
    cooldown: 0,
  },
};
