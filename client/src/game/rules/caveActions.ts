
import { Action } from "@shared/schema";

export const caveActions: Record<string, Action> = {
  exploreCave: {
    id: "exploreCave",
    label: "Explore Cave",
    show_when: {
      "flags.fireLit": true,
      "story.seen.actionBuildTorch": true,
      "buildings.lodge": 0,
    },
    cost: {
      "resources.torch": 5,
    },
    effects: {
      "resources.torch": -5,
      "resources.stone": "random(2,5)",
      "resources.coal": { probability: 0.25, value: "random(1,4)" },
      "resources.iron": { probability: 0.25, value: "random(1,4)" },
      "resources.bones": { probability: 0.2, value: "random(1,4)" },
      "relics.tarnished_amulet": {
        probability: 0.075,
        value: true,
        condition: "!relics.tarnished_amulet",
        logMessage:
          "In the shadows of the cave, something glints. You reach down and find a tarnished amulet, its surface worn but emanating an ancient power. When you wear it, an uncanny calm settles over you.",
      },
      "flags.caveExplored": true,
      "story.seen.hasStone": true,
    },
    cooldown: 20,
  },

  ventureDeeper: {
    id: "ventureDeeper",
    label: "Venture Deeper",
    show_when: {
      "buildings.lodge": 1,
    },
    cost: {
      "resources.torch": 10,
      "resources.food": 20,
    },
    effects: {
      "resources.torch": -10,
      "resources.food": -20,
      "resources.stone": "random(4,10)",
      "resources.coal": { probability: 0.6, value: "random(2,6)" },
      "resources.iron": { probability: 0.6, value: "random(2,6)" },
      "resources.sulfur": { probability: 0.4, value: "random(2,4)" },
      "resources.bones": { probability: 0.5, value: "random(2,6)" },
      "relics.tarnished_amulet": {
        probability: 0.1,
        value: true,
        condition: "!relics.tarnished_amulet",
        logMessage:
          "In the shadows of the cave, something glints. You reach down and find a tarnished amulet, its surface worn but emanating an ancient power. When you wear it, an uncanny calm settles over you.",
      },
      "relics.bloodstained_belt": {
        probability: 0.05,
        value: true,
        condition: "!relics.bloodstained_belt",
        logMessage:
          "Among the bones and debris, you discover a leather belt stained with dark, ancient blood. Despite its grim appearance, it radiates an aura of raw strength and power.",
      },
      "flags.venturedDeeper": true,
      "story.seen.venturedDeeper": true,
      "stats.ventureDeeper": 1,
    },
    cooldown: 15,
  },

  descendFurther: {
    id: "descendFurther",
    label: "Descend Further",
    show_when: {
      "tools.iron_lantern": true,
    },
    cost: {
      "resources.food": 30,
    },
    effects: {
      "resources.food": -30,
      "resources.stone": "random(6,12)",
      "resources.iron": { probability: 0.7, value: "random(3,8)" },
      "resources.coal": { probability: 0.7, value: "random(3,8)" },
      "resources.sulfur": { probability: 0.5, value: "random(2,6)" },
      "resources.bones": { probability: 0.6, value: "random(3,8)" },
      "flags.descendedFurther": true,
      "story.seen.descendedFurther": true,
    },
    cooldown: 20,
  },

  exploreRuins: {
    id: "exploreRuins",
    label: "Explore Ruins",
    show_when: {
      "tools.steel_lantern": true,
    },
    cost: {
      "resources.food": 40,
    },
    effects: {
      "resources.food": -40,
      "resources.stone": "random(8,15)",
      "resources.iron": { probability: 0.8, value: "random(4,10)" },
      "resources.silver": { probability: 0.4, value: "random(1,3)" },
      "resources.bones": { probability: 0.7, value: "random(4,10)" },
      "relics.wooden_figure": {
        probability: 0.08,
        value: true,
        condition: "!relics.wooden_figure",
        logMessage:
          "Among the ancient rubble, you discover a small wooden figure, carved with intricate symbols. It feels warm to the touch and seems to pulse with a faint energy.",
      },
      "flags.exploredRuins": true,
      "story.seen.exploredRuins": true,
    },
    cooldown: 25,
  },

  exploreTemple: {
    id: "exploreTemple",
    label: "Explore Temple",
    show_when: {
      "tools.obsidian_lantern": true,
    },
    cost: {
      "resources.food": 50,
    },
    effects: {
      "resources.food": -50,
      "resources.stone": "random(10,18)",
      "resources.silver": { probability: 0.6, value: "random(2,5)" },
      "resources.gold": { probability: 0.3, value: "random(1,3)" },
      "resources.moonstone": { probability: 0.15, value: "random(1,2)" },
      "resources.bones": { probability: 0.8, value: "random(5,12)" },
      "relics.blackened_mirror": {
        probability: 0.1,
        value: true,
        condition: "!relics.blackened_mirror",
        logMessage:
          "In the temple's inner sanctum, you find a mirror of polished obsidian. Its surface is darker than night, yet when you look into it, strange visions flicker across its depths.",
      },
      "flags.exploredTemple": true,
      "story.seen.exploredTemple": true,
    },
    cooldown: 30,
  },

  exploreCitadel: {
    id: "exploreCitadel",
    label: "Explore Citadel",
    show_when: {
      "tools.adamant_lantern": true,
    },
    cost: {
      "resources.food": 75,
    },
    effects: {
      "resources.food": -75,
      "resources.stone": "random(15,25)",
      "resources.silver": { probability: 0.8, value: "random(3,8)" },
      "resources.gold": { probability: 0.5, value: "random(2,6)" },
      "resources.moonstone": { probability: 0.3, value: "random(1,4)" },
      "resources.adamant": { probability: 0.2, value: "random(1,3)" },
      "resources.bones": { probability: 0.9, value: "random(8,15)" },
      "flags.exploredCitadel": true,
      "story.seen.exploredCitadel": true,
    },
    cooldown: 35,
  },

  mineIron: {
    id: "mineIron",
    label: "Mine Iron",
    show_when: {
      "tools.stone_pickaxe": true,
    },
    cost: {
      "resources.torch": 10,
      "resources.food": 5,
    },
    effects: {
      "resources.torch": -10,
      "resources.food": -5,
      "resources.iron": "random(2,5)",
      "story.seen.hasIron": true,
    },
    cooldown: 15,
  },

  mineCoal: {
    id: "mineCoal",
    label: "Mine Coal",
    show_when: {
      "tools.iron_pickaxe": true,
    },
    cost: {
      "resources.torch": 15,
      "resources.food": 10,
    },
    effects: {
      "resources.torch": -15,
      "resources.food": -10,
      "resources.coal": "random(3,6)",
      "story.seen.hasCoal": true,
    },
    cooldown: 15,
  },

  mineSulfur: {
    id: "mineSulfur",
    label: "Mine Sulfur",
    show_when: {
      "tools.iron_pickaxe": true,
    },
    cost: {
      "resources.torch": 20,
      "resources.food": 15,
    },
    effects: {
      "resources.torch": -20,
      "resources.food": -15,
      "resources.sulphur": "random(2,4)",
      "story.seen.hasSulfur": true,
    },
    cooldown: 15,
  },

  mineObsidian: {
    id: "mineObsidian",
    label: "Mine Obsidian",
    show_when: {
      "tools.steel_pickaxe": true,
    },
    cost: {
      "resources.torch": 50,
      "resources.food": 30,
    },
    effects: {
      "resources.torch": -50,
      "resources.food": -30,
      "resources.obsidian": "random(4,10)",
      "story.seen.hasObsidian": true,
    },
    cooldown: 15,
  },

  mineAdamant: {
    id: "mineAdamant",
    label: "Mine Adamant",
    show_when: {
      "tools.obsidian_pickaxe": true,
    },
    cost: {
      "resources.torch": 100,
      "resources.food": 50,
    },
    effects: {
      "resources.torch": -100,
      "resources.food": -50,
      "resources.adamant": "random(6,12)",
      "story.seen.hasAdamant": true,
    },
    cooldown: 20,
  },
};
