import { Action } from "@shared/schema";

// Base relics for each cave exploration stage
const caveRelics = {
  exploreCave: [
    {
      key: "tarnished_amulet",
      probability: 0.02,
      logMessage:
        "In the shadows of the cave, something glints. You reach down and find a tarnished amulet, its surface worn but emanating an ancient power. When you wear it, an uncanny calm settles over you.",
    },
  ],
  ventureDeeper: [
    {
      key: "bloodstained_belt",
      probability: 0.01,
      logMessage:
        "Among the bones and debris, you discover a leather belt stained with dark, ancient blood. Despite its grim appearance, it radiates an aura of raw strength and power.",
    },
  ],
  descendFurther: [],
  exploreRuins: [],
  exploreTemple: [],
  exploreCitadel: [],
};

// Helper function to get inherited relics with 10% probability bonus
function getInheritedRelics(actionId: string) {
  const stageOrder = [
    "exploreCave",
    "ventureDeeper",
    "descendFurther",
    "exploreRuins",
    "exploreTemple",
    "exploreCitadel",
  ];
  const currentIndex = stageOrder.indexOf(actionId);

  const inheritedRelics: any = {};

  // Add relics from all previous stages with 1% probability bonus
  for (let i = 0; i <= currentIndex; i++) {
    const stageId = stageOrder[i];
    const relics = caveRelics[stageId as keyof typeof caveRelics];

    relics.forEach((relic) => {
      const adjustedProbability =
        i === currentIndex
          ? relic.probability // Current stage keeps original probability
          : relic.probability + 0.005; // Previous stages get +1% bonus

      inheritedRelics[`relics.${relic.key}`] = {
        probability: Math.min(adjustedProbability, 1.0), // Cap at 100%
        value: true,
        condition: `!relics.${relic.key}`,
        logMessage: relic.logMessage,
      };
    });
  }

  return inheritedRelics;
}

export const caveExploreActions: Record<string, Action> = {
  lightFire: {
    id: "lightFire",
    label: "Light Fire",
    show_when: { "flags.fireLit": false },
    cost: {},
    effects: {
      "flags.fireLit": true,
      "story.seen.fireLit": true,
    },
    cooldown: 1,
  },

  gatherWood: {
    id: "gatherWood",
    label: "Gather Wood",
    show_when: {
      "flags.fireLit": true,
    },
    cost: {},
    effects: {
      "resources.wood": "random(3,5)",
      "story.seen.hasWood": true,
      "relics.old_trinket": {
        probability: 0.0005,
        value: true,
        condition: "!relics.old_trinket && buildings.cabin >= 1",
        logMessage:
          "While gathering wood, you find an old trinket with glowing amber liquid inside. Without hesitation, you drink the mysterious liquid. It burns as it goes down, but you feel stronger than before. (+5 Strength)",
      },
      "stats.strength": {
        probability: 0.0005,
        value: 5,
        condition: "!relics.old_trinket && buildings.cabin >= 1",
      },
    },
    cooldown: 5,
  },

  exploreCave: {
    id: "exploreCave",
    label: "Explore Cave",
    show_when: {
      "flags.fireLit": true,
      "story.seen.actionBuildTorch": true,
      "buildings.blacksmith": 0,
    },
    cost: {
      "resources.torch": 5,
    },
    effects: {
      "resources.torch": -5,
      "resources.wood": { probability: 0.5, value: "random(2,5)" },
      "resources.stone": { probability: 1, value: "random(2,5)" },
      "resources.coal": { probability: 0.3, value: "random(2,5)" },
      "resources.iron": { probability: 0.3, value: "random(2,5)" },
      "resources.bones": { probability: 0.3, value: "random(2,5)" },
      ...getInheritedRelics("exploreCave"),
      "flags.caveExplored": true,
      "story.seen.hasStone": true,
    },
    cooldown: 10,
  },

  ventureDeeper: {
    id: "ventureDeeper",
    label: "Venture Deeper",
    show_when: {
      "buildings.blacksmith": 1,
      "tools.iron_lantern": false,
    },
    cost: {
      "resources.torch": 10,
      "resources.food": 20,
    },
    effects: {
      "resources.torch": -10,
      "resources.food": -20,
      "resources.stone": { probability: 1, value: "random(4,8)" },
      "resources.coal": { probability: 0.35, value: "random(4,8)" },
      "resources.iron": { probability: 0.35, value: "random(4,8)" },
      "resources.bones": { probability: 0.35, value: "random(4,8)" },
      "resources.sulfur": { probability: 0.35, value: "random(4,8)" },
      ...getInheritedRelics("ventureDeeper"),
      "flags.venturedDeeper": true,
      "story.seen.venturedDeeper": true,
    },
    cooldown: 20,
  },

  descendFurther: {
    id: "descendFurther",
    label: "Descend Further",
    show_when: {
      "tools.iron_lantern": true,
      "tools.steel_lantern": false,
    },
    cost: {
      "resources.food": 100,
    },
    effects: {
      "resources.food": -100,
      "resources.stone": { probability: 1, value: "random(6,11)" },
      "resources.iron": { probability: 0.4, value: "random(6,11)" },
      "resources.coal": { probability: 0.4, value: "random(6,11)" },
      "resources.obsidian": { probability: 0.15, value: "random(1,3)" },
      "resources.bones": { probability: 0.4, value: "random(6,11)" },
      "resources.sulfur": { probability: 0.4, value: "random(6,11)" },
      "resources.silver": { probability: 0.15, value: "random(1,3)" },
      ...getInheritedRelics("descendFurther"),
      "flags.descendedFurther": true,
      "story.seen.descendedFurther": true,
    },
    cooldown: 30,
  },

  exploreRuins: {
    id: "exploreRuins",
    label: "Explore Ruins",
    show_when: {
      "tools.steel_lantern": true,
      "tools.obsidian_lantern": false,
    },
    cost: {
      "resources.food": 250,
    },
    effects: {
      "resources.food": -250,
      "resources.stone": { probability: 1, value: "random(8,14)" },
      "resources.iron": { probability: 0.45, value: "random(8,14)" },
      "resources.coal": { probability: 0.45, value: "random(8,14)" },
      "resources.obsidian": { probability: 0.2, value: "random(2,4)" },
      "resources.adamant": { probability: 0.1, value: "random(1,3)" },
      "resources.bones": { probability: 0.45, value: "random(8,14)" },
      "resources.sulfur": { probability: 0.45, value: "random(8,14)" },
      "resources.silver": { probability: 0.2, value: "random(2,4)" },
      "resources.gold": { probability: 0.05, value: "random(1,3)" },
      "resources.bloodstone": { probability: 0.025, value: "random(1,2)" },
      ...getInheritedRelics("exploreRuins"),
      "flags.exploredRuins": true,
      "story.seen.exploredRuins": true,
    },
    cooldown: 60,
  },

  exploreTemple: {
    id: "exploreTemple",
    label: "Explore Temple",
    show_when: {
      "tools.obsidian_lantern": true,
      "tools.adamant_lantern": false
    },
    cost: {
      "resources.food": 500,
    },
    effects: {
      "resources.food": -500,
      "resources.stone": { probability: 1, value: "random(10,17)" },
      "resources.iron": { probability: 0.5, value: "random(10,17)" },
      "resources.coal": { probability: 0.5, value: "random(10,17" },
      "resources.obsidian": { probability: 0.25, value: "random(3,5)" },
      "resources.adamant": { probability: 0.15, value: "random(2,4)" },
      "resources.bones": { probability: 0.5, value: "random(10,17)" },
      "resources.sulfur": { probability: 0.5, value: "random(10,17)" },
      "resources.silver": { probability: 0.3, value: "random(3,5)" },
      "resources.gold": { probability: 0.15, value: "random(2,4)" },
      "resources.bloodstone": { probability: 0.05, value: "random(1,2)" },
      "resources.frostglas": { probability: 0.025, value: "random(1,2)" },
      ...getInheritedRelics("exploreTemple"),
      "flags.exploredTemple": true,
      "story.seen.exploredTemple": true,
    },
    cooldown: 90,
  },

  exploreCitadel: {
    id: "exploreCitadel",
    label: "Explore Citadel",
    show_when: {
      "tools.adamant_lantern": true,
    },
    cost: {
      "resources.food": 1000,
    },
    effects: {
      "resources.food": -1000,
      "resources.stone": { probability: 1, value: "random(12,20)" },
      "resources.iron": { probability: 0.55, value: "random(12,20)" },
      "resources.coal": { probability: 0.55, value: "random(12,20)" },
      "resources.obsidian": { probability: 0.3, value: "random(4,5)" },
      "resources.adamant": { probability: 0.2, value: "random(3,5)" },
      "resources.bones": { probability: 0.55, value: "random(12,20)" },
      "resources.sulfur": { probability: 0.55, value: "random(12,20)" },
      "resources.silver": { probability: 0.4, value: "random(4,6)" },
      "resources.gold": { probability: 0.2, value: "random(3,5)" },
      "resources.bloodstone": { probability: 0.075, value: "random(1,3)" },
      "resources.frostglas": { probability: 0.05, value: "random(1,3)" },
      ...getInheritedRelics("exploreCitadel"),
      "flags.exploredCitadel": true,
      "story.seen.exploredCitadel": true,
    },
    cooldown: 120,
  },

  lowChamber: {
    id: "lowChamber",
    label: "Low Chamber",
    show_when: {
      "tools.reinforced_rope": true,
      "flags.lowChamberExplored": false,
    },
    cost: {
      "resources.food": 500,
      "resources.torch": 20,
    },
    effects: {
      "resources.food": -500,
      "resources.torch": -20,
      "resources.gold": { probability: 0.8, value: "random(15,25)" },
      "resources.bloodstone": { probability: 0.3, value: "random(2,4)" },
      "resources.frostglas": { probability: 0.2, value: "random(1,3)" },
      "flags.lowChamberExplored": true,
      "story.seen.lowChamberExplored": true,
    },
    cooldown: 1,
  },

  alchemistChamber: {
    id: "alchemistChamber",
    label: "Alchemist Chamber",
    show_when: {
      "tools.alchemist_map": true,
      "flags.alchemistChamberExplored": false,
    },
    cost: {
      "resources.food": 750,
    },
    effects: {
      "resources.food": -750,
      "resources.gold": { probability: 1, value: "random(20,30)" },
      "resources.bloodstone": { probability: 0.5, value: "random(3,5)" },
      "resources.frostglas": { probability: 0.4, value: "random(2,4)" },
      "resources.adamant": { probability: 0.3, value: "random(5,8)" },
      "flags.alchemistChamberExplored": true,
      "story.seen.alchemistChamberExplored": true,
    },
    cooldown: 1,
  },
};
