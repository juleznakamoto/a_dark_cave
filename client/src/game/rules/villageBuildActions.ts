import { Action, GameState } from "@shared/schema";
import { ActionResult } from '@/game/actions';
import { logger } from "@/lib/logger";

// Utility function to get the next building level
export const getNextBuildingLevel = (actionId: string, state: GameState): number => {
  if (!actionId.startsWith("build")) return 1;

  // Remove "build" prefix and lowercase first character
  let buildingKey = actionId.slice(5);
  buildingKey = buildingKey.charAt(0).toLowerCase() + buildingKey.slice(1);

  return (state.buildings[buildingKey as keyof GameState["buildings"]] || 0) + 1;
};

export const villageBuildActions: Record<string, Action> = {
  buildWoodenHut: {
    id: "buildWoodenHut",
    label: "Wooden Hut",
    description: "Simple wooden hut providing basic shelter",
    tooltipEffects: (state: GameState) => {
      const count = state.buildings.woodenHut || 0;
      const totalPopulation = count * 2;
      return count > 0
        ? [`+${totalPopulation} Max Population`]
        : ["+2 Max Population"];
    },
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
        "buildings.woodenHut": 5,
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
        "resources.wood": 250,
      },
      4: {
        "resources.wood": 500,
      },
      5: {
        "resources.wood": 1000,
      },
      6: {
        "resources.wood": 1500,
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
    cooldown: 90,
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
    cooldown: 15,
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
        "story.seen.hasBlacksmith": true,
      },
    },
    cooldown: 5,
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
    cooldown: 30,
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
    cooldown: 30,
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
    cooldown: 30,
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
    cooldown: 30,
  },

  buildFoundry: {
    id: "buildFoundry",
    label: "Foundry",
    description: "Specialized building for forging steel",
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
    cooldown: 20,
  },

  buildPrimeFoundry: {
    id: "buildPrimeFoundry",
    label: "Prime Foundry",
    description: "Advanced foundry with improved steel production",
    tooltipEffects: ["Unlocks Steel Forgers", "Steel Forger: +1 Steel"],
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
        "story.seen.hasPrimeFoundry": true,
      },
    },
    productionEffects: {
      steel_forger: {
        steel: 2,
      },
    },
    cooldown: 40,
  },

  buildMasterworkFoundry: {
    id: "buildMasterworkFoundry",
    label: "Masterwork Foundry",
    description: "Masterwork foundry with superior steel production",
    tooltipEffects: ["Unlocks Steel Forgers", "Steel Forger: +2 Steel"],
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
        "story.seen.hasMasterworkFoundry": true,
      },
    },
    productionEffects: {
      steel_forger: {
        steel: 1,
      },
    },
    cooldown: 60,
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
        "story.seen.hasGreatCabin": true,
      },
    },
    productionEffects: {
      hunter: {
        food: 5,
        fur: 1,
        bones: 1,
      },
    },
    cooldown: 30,
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
        "story.seen.hasTimberMill": true,
      },
    },
    productionEffects: {
      gatherer: {
        wood: 5,
      },
    },
    cooldown: 30,
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
        "story.seen.hasQuarry": true,
      },
    },
    productionEffects: {
      gatherer: {
        stone: 5,
      },
    },
    cooldown: 30,
  },

  buildClerksHut: {
    id: "buildClerksHut",
    label: "Clerk's Hut",
    description: "Hut where clerks track resources of the village",
    tooltipEffects: ["+2 Knowledge", "Resource tracking"],
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
        "story.seen.hasClerksHut": true,
      },
    },
    statsEffects: {
      knowledge: 2,
    },
    cooldown: 30,
  },

  buildScriptorium: {
    id: "buildScriptorium",
    label: "Scriptorium",
    description:
      "Library of knowledge providing detailed tracking of resources",
    tooltipEffects: ["+5 Knowledge", "Improved resource tracking"],
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
        "story.seen.hasScriptorium": true,
      },
    },
    statsEffects: {
      knowledge: 5,
    },
    cooldown: 40,
  },

  buildInkwardenAcademy: {
    id: "buildInkwardenAcademy",
    label: "Inkwarden Academy",
    description:
      "Grand academy of scholars providing supreme knowledge and resource tracking",
    tooltipEffects: ["+10 Knowledge", "Greatly improved resource tracking"],
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
        "story.seen.hasInkwardenAcademy": true,
      },
    },
    statsEffects: {
      knowledge: 10,
    },
    cooldown: 60,
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
        "story.seen.hasTannery": true,
      },
    },
    cooldown: 20,
  },

  buildMasterTannery: {
    id: "buildMasterTannery",
    label: "Master Tannery",
    description: "Advanced tannery improving leather production",
    tooltipEffects: ["Unlocks Tanners", "Tanner: +1 Leather"],
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
        "resources.steel": 1000,
      },
    },
    effects: {
      1: {
        "buildings.masterTannery": 1,
        "story.seen.hasMasterTannery": true,
      },
    },
    productionEffects: {
      tanner: {
        leather: 1,
      },
    },
    cooldown: 40,
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
        "story.seen.hasAltar": true,
      },
    },
    statsEffects: {
      madness: -2,
    },
    cooldown: 5,
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
        "story.seen.hasShrine": true,
      },
    },
    statsEffects: {
      madness: -5,
    },
    cooldown: 40,
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
        "story.seen.hasTemple": true,
      },
    },
    statsEffects: {
      madness: -8,
    },
    cooldown: 60,
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
        "story.seen.hasSanctum": true,
      },
    },
    statsEffects: {
      madness: -12,
    },
    cooldown: 80,
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
        "story.seen.hasAlchemistHall": true,
        "story.seen.powderMakerUnlocked": true,
      },
    },
    cooldown: 30,
  },

  buildTradePost: {
    id: "buildTradePost",
    label: "Trade Post",
    description: "Trading post attracting merchants selling goods",
    tooltipEffects: ["Higher Trade Amounts", "+1 Trade at Travelling Merchant"],
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
        "story.seen.hasTradePost": true,
      },
    },
    cooldown: 40,
  },

  buildGrandBazaar: {
    id: "buildGrandBazaar",
    label: "Grand Bazaar",
    description: "Sprawling marketplace attracting more merchants",
    tooltipEffects: ["Higher Trade Amounts", "+2 Trades at Travelling Merchant"],
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
        "story.seen.hasGrandBazaar": true,
      },
    },
    cooldown: 30,
  },

  buildMerchantsGuild: {
    id: "buildMerchantsGuild",
    label: "Merchants Guild",
    description: "Powerful guild bringing the best trades and merchants",
    tooltipEffects: ["Higher Trade Amounts", "+3 Trades at Travelling Merchant"],
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
        "story.seen.hasMerchantsGuild": true,
      },
    },
    cooldown: 40,
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
        "story.seen.hasBastion": true,
      },
    },
    cooldown: 60,
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
        "story.seen.hasWatchtower": true,
      },
      2: {
        "buildings.watchtower": 1,
        "story.seen.hasGuardTower": true,
      },
      3: {
        "buildings.watchtower": 1,
        "story.seen.hasFortifiedTower": true,
      },
      4: {
        "buildings.watchtower": 1,
        "story.seen.hasCannonTower": true,
      },
    },
    cooldown: 60,
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
        "story.seen.hasWoodenPalisades": true,
      },
      2: {
        "buildings.palisades": 1,
        "story.seen.hasFortifiedPalisades": true,
      },
      3: {
        "buildings.palisades": 1,
        "story.seen.hasStoneWall": true,
      },
      4: {
        "buildings.palisades": 1,
        "story.seen.hasReinforcedWall": true,
      },
    },
    cooldown: 50,
  },

  buildStoneHut: {
    id: "buildStoneHut",
    label: "Stone Hut",
    description: "Durable stone dwelling providing superior shelter",
    tooltipEffects: (state: GameState) => {
      const count = state.buildings.stoneHut || 0;
      const totalPopulation = count * 4;
      return count > 0
        ? [`+${totalPopulation} Max Population`]
        : ["+4 Max Population"];
    },
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
        "resources.stone": 1500,
      },
      3: {
        "resources.stone": 2000,
      },
      4: {
        "resources.stone": 2500,
      },
      5: {
        "resources.stone": 3000,
      },
      6: {
        "resources.stone": 4000,
      },
      7: {
        "resources.stone": 5000,
      },
      8: {
        "resources.stone": 6000,
      },
      9: {
        "resources.stone": 7000,
      },
      10: {
        "resources.stone": 8000,
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
    cooldown: 120,
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
        "story.seen.hasFortifiedMoat": true,
      },
    },
    cooldown: 60,
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
    cooldown: 120,
  },

  buildLonghouse: {
    id: "buildLonghouse",
    label: "Longhouse",
    description: "Massive nordic communal hall housing many villagers",
    tooltipEffects: (state: GameState) => {
      const count = state.buildings.longhouse || 0;
      const totalPopulation = count * 8;
      return count > 0
        ? [`+${totalPopulation} Max Population`]
        : ["+8 Max Population"];
    },
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
      },
      2: {
        "resources.wood": 12500,
        "resources.stone": 7500,
      },
      3: {
        "resources.wood": 15000,
        "resources.stone": 10000,
      },
      4: {
        "resources.wood": 17500,
        "resources.stone": 12500,
      },
      5: {
        "resources.wood": 20000,
        "resources.stone": 15000,
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
    cooldown: 120,
  },

  buildGrandBlacksmith: {
    id: "buildGrandBlacksmith",
    label: "Grand Blacksmith",
    description: "Advanced blacksmith capable of creating the finest products",
    tooltipEffects: ["Unlocks Advanced Crafting", "10 % Craft Discount"],
    building: true,
    show_when: {
      1: {
        "buildings.blacksmith": 1,
        "story.seen.wizardFrostglassSword": true,
        "buildings.grandBlacksmith": 0,
      },
    },
    cost: {
      1: {
        "resources.stone": 10000,
        "resources.wood": 5000,
        "resources.steel": 2500,
        "resources.adamant": 500,
      },
    },
    effects: {
      1: {
        "buildings.grandBlacksmith": 1,
        "story.seen.hasGrandBlacksmith": true,
      },
    },
    craftingCostReduction: 0.1,
    cooldown: 120,
  },

  buildFurTents: {
    id: "buildFurTents",
    label: "Fur Tents",
    description: "Small camp of fur tents housing several families",
    tooltipEffects: ["+10 Max Population"],
    building: true,
    // No show_when - cannot be built directly, obtained through events/other means
    cost: {},
    effects: {},
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
        "story.seen.hasTraps": true,
      },
    },
    cooldown: 30,
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
        "story.seen.hasBlackMonolith": true,
      },
    },
    statsEffects: {
      madness: -5,
    },
    cooldown: 60,
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
        "stats.madness": -40,
        "buildings.blackMonolith": 0,
      },
    },
    cooldown: 60,
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
        "story.seen.hasBoneTemple": true,
      },
    },
    statsEffects: {
      madness: -10,
    },
    cooldown: 120,
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
        "buildings.woodenHut": 4,
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
        "buildings.darkEstate": 1,
      },
    },
    cooldown: 60,
  },

  buildSupplyHut: {
    id: "buildSupplyHut",
    label: "Supply Hut",
    description: "Small hut for storing resources",
    tooltipEffects: ["Resource Limit: 1,000"],
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 2,
        "buildings.storage": 0,
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
        "story.seen.hasStorage": true,
      },
    },
    cooldown: 30,
  },

  buildStorehouse: {
    id: "buildStorehouse",
    label: "Storehouse",
    description: "Expanded storage facility for more resources",
    tooltipEffects: ["Resource Limit: 5,000", "5% Crafting Discount"],
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 3,
        "buildings.storage": 1,
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
        "story.seen.hasStorehouse": true,
      },
    },
    craftingCostReduction: 0.05,
    cooldown: 30,
  },

  buildFortifiedStorehouse: {
    id: "buildFortifiedStorehouse",
    label: "Fortified Storehouse",
    description: "Reinforced storage building with enhanced capacity",
    tooltipEffects: ["Resource Limit: 10,000", "5% Crafting Discount", "5% Building Discount"],
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 6,
        "buildings.storage": 2,
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
        "story.seen.hasFortifiedStorehouse": true,
      },
    },
    craftingCostReduction: 0.05,
    buildingCostReduction: 0.05,
    cooldown: 30,
  },

  buildVillageWarehouse: {
    id: "buildVillageWarehouse",
    label: "Village Warehouse",
    description: "Large warehouse capable of storing vast quantities",
    tooltipEffects: ["Resource Limit: 25,000", "5% Crafting Discount", "5% Building Discount"],
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 8,
        "buildings.storage": 3,
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
        "story.seen.hasVillageWarehouse": true,
      },
    },
    craftingCostReduction: 0.05,
    buildingCostReduction: 0.05,
    cooldown: 30,
  },

  buildGrandRepository: {
    id: "buildGrandRepository",
    label: "Grand Repository",
    description: "Massive repository with exceptional storage capacity",
    tooltipEffects: ["Resource Limit: 50,000", "10% Crafting Discount", "5% Building Discount"],
    building: true,
    show_when: {
      1: {
        "buildings.stoneHut": 2,
        "buildings.storage": 4,
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
        "story.seen.hasGrandRepository": true,
      },
    },
    craftingCostReduction: 0.1,
    buildingCostReduction: 0.05,
    cooldown: 30,
  },

  buildCityVault: {
    id: "buildCityVault",
    label: "City Vault",
    description: "Supreme vault capable of storing immense resources",
    tooltipEffects: ["Resource Limit: 100,000", "10% Crafting Discount", "10% Building Discount"],
    building: true,
    show_when: {
      1: {
        "buildings.stoneHut": 6,
        "buildings.storage": 5,
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
        "buildings.cityVault": 1,
        "story.seen.hasCityVault": true,
      },
    },
    craftingCostReduction: 0.1,
    buildingCostReduction: 0.1,
    cooldown: 30,
  },
};