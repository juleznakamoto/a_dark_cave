
import { Action } from "@shared/schema";

// Base relics for each cave exploration stage
const caveRelics = {
  exploreCave: [
    {
      key: "tarnished_amulet",
      probability: 0.075,
      logMessage: "In the shadows of the cave, something glints. You reach down and find a tarnished amulet, its surface worn but emanating an ancient power. When you wear it, an uncanny calm settles over you.",
    },
  ],
  ventureDeeper: [
    {
      key: "bloodstained_belt",
      probability: 0.05,
      logMessage: "Among the bones and debris, you discover a leather belt stained with dark, ancient blood. Despite its grim appearance, it radiates an aura of raw strength and power.",
    },
  ],
  descendFurther: [
    
  ],
  exploreRuins: [
  
  ],
  exploreTemple: [
    
  ],
  exploreCitadel: [],
};

// Helper function to get inherited relics with 10% probability bonus
function getInheritedRelics(actionId: string) {
  const stageOrder = ['exploreCave', 'ventureDeeper', 'descendFurther', 'exploreRuins', 'exploreTemple', 'exploreCitadel'];
  const currentIndex = stageOrder.indexOf(actionId);
  
  const inheritedRelics: any = {};
  
  // Add relics from all previous stages with 1% probability bonus
  for (let i = 0; i <= currentIndex; i++) {
    const stageId = stageOrder[i];
    const relics = caveRelics[stageId as keyof typeof caveRelics];
    
    relics.forEach(relic => {
      const adjustedProbability = i === currentIndex 
        ? relic.probability // Current stage keeps original probability
        : relic.probability + 0.01; // Previous stages get +1% bonus
      
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
      "resources.stone": { probability: 1, value: "random(2,4)" },
      "resources.coal": { probability: 0.25, value: "random(1,4)" },
      "resources.iron": { probability: 0.25, value: "random(1,4)" },
      "resources.bones": { probability: 0.25, value: "random(1,4)" },
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
      "buildings.lodge": 1,
    },
    cost: {
      "resources.torch": 10,
      "resources.food": 20,
    },
    effects: {
      "resources.torch": -10,
      "resources.food": -20,
      "resources.stone": { probability: 1, value: "random(4,7)" },
      "resources.coal": { probability: 0.3, value: "random(2,6)" },
      "resources.iron": { probability: 0.3, value: "random(2,6)" },
      "resources.bones": { probability: 0.3, value: "random(2,6)" },
      "resources.sulfur": { probability: 0.3, value: "random(2,4)" },
      ...getInheritedRelics("ventureDeeper"),
      "flags.venturedDeeper": true,
      "story.seen.venturedDeeper": true,
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
      "resources.food": 50,
    },
    effects: {
      "resources.food": -50,
      "resources.stone": { probability: 1, value: "random(6,10)" },
      "resources.iron": { probability: 0.35, value: "random(3,8)" },
      "resources.coal": { probability: 0.35, value: "random(3,8)" },
      "resources.obsidian": { probability: 0.1, value: "random(1,3)" },
      "resources.bones": { probability: 0.35, value: "random(3,8)" },
      "resources.sulfur": { probability: 0.35, value: "random(2,6)" },          "resources.silver": { probability: 0.1, value: "random(1,3)" },
      ...getInheritedRelics("descendFurther"),
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
      "resources.food": 100,
    },
    effects: {
      "resources.food": -100,
      "resources.stone": { probability: 1, value: "random(8,13)" },
      "resources.iron": { probability: 0.4, value: "random(4,10)" },
      "resources.coal": { probability: 0.4, value: "random(4,10)" },
      "resources.obsidian": { probability: 0.15, value: "random(2,4)" },
      "resources.adamant": { probability: 0.1, value: "random(1,3)" },
      "resources.bones": { probability: 0.4, value: "random(4,10)" },
      "resources.sulfur": { probability: 0.4, value: "random(3,8)" },
      "resources.silver": { probability: 0.15, value: "random(2,4)" },
      "resources.gold": { probability: 0.05, value: "random(1,3)" },
      "resources.bloodstone": { probability: 0.025, value: "random(1,2)" },
      ...getInheritedRelics("exploreRuins"),
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
      "resources.food": 150,
    },
    effects: {
      "resources.food": -150,
      "resources.stone": { probability: 1, value: "random(10,16)" },
      "resources.iron": { probability: 0.45, value: "random(5,12)" },
      "resources.coal": { probability: 0.45, value: "random(5,12)" },
      "resources.obsidian": { probability: 0.2, value: "random(3,5)" },
      "resources.adamant": { probability: 0.15, value: "random(2,4)" },
      "resources.bones": { probability: 0.45, value: "random(5,12)" },
      "resources.sulfur": { probability: 0.45, value: "random(3,8)" },
      "resources.silver": { probability: 0.25, value: "random(3,5)" },
      "resources.gold": { probability: 0.15, value: "random(2,4)" },
      "resources.bloodstone": { probability: 0.05, value: "random(1,2)" },
      "resources.frostglas": { probability: 0.025, value: "random(1,2)" },
      ...getInheritedRelics("exploreTemple"),
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
      "resources.food": 250,
    },
    effects: {
      "resources.food": -250,
      "resources.stone": { probability: 1, value: "random(12,19)" },
      "resources.iron": { probability: 0.5, value: "random(6,14)" },
      "resources.coal": { probability: 0.5, value: "random(6,14)" },
      "resources.obsidian": { probability: 0.25, value: "random(4,5)" },
      "resources.adamant": { probability: 0.2, value: "random(3,5)" },
      "resources.bones": { probability: 0.5, value: "random(6,14)" },
      "resources.sulfur": { probability: 0.5, value: "random(4,10)" },
      "resources.silver": { probability: 0.3, value: "random(4,6)" },
      "resources.gold": { probability: 0.2, value: "random(3,5)" },
      "resources.bloodstone": { probability: 0.075, value: "random(1,3)" },
      "resources.frostglas": { probability: 0.05, value: "random(1,3)" },
      ...getInheritedRelics("exploreCitadel"),
      "flags.exploredCitadel": true,
      "story.seen.exploredCitadel": true,
    },
    cooldown: 40,
  },

  
};
