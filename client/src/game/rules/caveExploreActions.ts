import { Action, GameState } from "@shared/schema";
import { ActionResult } from '@/game/actions';
import { gameActions, applyActionEffects } from '@/game/rules';

// Base relics for each cave exploration stage
const caveRelics = {
  exploreCave: [
    {
      key: "tarnished_amulet",
      probability: 0.01,
      logMessage:
        "In the shadows of the cave, something glints. You reach down and find a tarnished amulet, its surface worn but emanating an ancient power. When you wear it, an uncanny calm settles over you.",
    },
  ],
  ventureDeeper: [
    {
      key: "bloodstained_belt",
      probability: 0.005,
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
          : relic.probability + 0.005; // Previous stages get +0.5% bonus

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
    show_when: { },
    cost: {},
    effects: {
      "story.seen.fireLit": true,
    },
    cooldown: 1,
  },

  gatherWood: {
    id: "gatherWood",
    label: "Gather Wood",
    show_when: {
    },
    cost: {},
    effects: {
      "resources.wood": "random(3,9)",
      "story.seen.hasWood": true,
      "relics.old_trinket": {
        probability: 0.0005,
        value: true,
        condition: "!relics.old_trinket && buildings.cabin >= 1",
        logMessage:
          "While gathering wood, you find an old trinket with glowing amber liquid inside. Without hesitation, you drink the mysterious liquid. It burns as it goes down, but you feel stronger than before.",
      }
    },
    cooldown: 6,
  },

  exploreCave: {
    id: "exploreCave",
    label: "Explore Cave",
    show_when: {
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
      "resources.food": 1000,
    },
    effects: {
      "resources.gold": { probability: 1, value: "random(15,35)" },
      "resources.bloodstone": { probability: 1, value: "random(2,8)" },
      "resources.frostglas": { probability: 1, value: "random(1,6)" },
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
      "resources.food": 1000,
    },
    effects: {
      "resources.gold": { probability: 1, value: "random(20,30)" },
      "resources.bloodstone": { probability: 1, value: "random(3,6)" },
      "resources.frostglas": { probability: 1, value: "random(2,4)" },
      "resources.adamant": { probability: 1, value: "random(5,15)" },
      "flags.alchemistChamberExplored": true,
      "story.seen.alchemistChamberExplored": true,
    },
    cooldown: 1,
  },
};

// Action handlers
export function handleLightFire(state: GameState, result: ActionResult): ActionResult {
  result.stateUpdates.flags = { ...state.flags, gameStarted: true };
  result.stateUpdates.story = {
    ...state.story,
    seen: {
      ...state.story.seen,
      fireLit: true
    }
  };

  result.logEntries!.push({
    id: `fire-lit-${Date.now()}`,
    message: 'The fire crackles softly, casting dancing shadows on the cave walls. The warmth is comforting.',
    timestamp: Date.now(),
    type: 'system',
  });

  return result;
}

export function handleGatherWood(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('gatherWood', state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    // Remove logMessages from state updates as it's not part of the game state
    delete effectUpdates.logMessages;
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleExploreCave(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('exploreCave', state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    // Remove logMessages from state updates as it's not part of the game state
    delete effectUpdates.logMessages;
  }

  // Remove forge section from cave panel
  if (state.panels?.cave?.actions) {
    result.stateUpdates.panels = {
      ...state.panels,
      cave: {
        ...state.panels.cave,
        actions: state.panels.cave.actions.filter(action => action.id !== 'forgeSteel')
      }
    };
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleVentureDeeper(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('ventureDeeper', state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    // Remove logMessages from state updates as it's not part of the game state
    delete effectUpdates.logMessages;
  }

  // Add a special log message for venturing deeper
  if (!state.story.seen.venturedDeeper) {
    result.logEntries!.push({
      id: `venture-deeper-${Date.now()}`,
      message: 'The torchlight reveals deeper passages carved into the rock. The air grows colder as you descend, but the promise of greater treasures draws you forward.',
      timestamp: Date.now(),
      type: 'system',
    });
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleDescendFurther(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('descendFurther', state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    delete effectUpdates.logMessages;
  }

  // Add a special log message for descending further
  if (!state.story.seen.descendedFurther) {
    result.logEntries!.push({
      id: `descend-further-${Date.now()}`,
      message: 'With your lantern casting a steady glow, you descend into the deepest chambers. The walls shimmer with veins of precious metals and the air hums with ancient power.',
      timestamp: Date.now(),
      type: 'system',
    });
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleExploreRuins(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('exploreRuins', state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    delete effectUpdates.logMessages;
  }

  // Add a special log message for exploring ruins
  if (!state.story.seen.exploredRuins) {
    result.logEntries!.push({
      id: `explore-ruins-${Date.now()}`,
      message: 'Ancient ruins sprawl before you deep in the cave, their crumbling walls telling stories of a lost civilization. Your lantern reveals treasures hidden in the shadows of time.',
      timestamp: Date.now(),
      type: 'system',
    });
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleExploreTemple(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('exploreTemple', state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    delete effectUpdates.logMessages;
  }

  // Add a special log message for exploring temple
  if (!state.story.seen.exploredTemple) {
    result.logEntries!.push({
      id: `explore-temple-${Date.now()}`,
      message: 'A magnificent temple rises from the cavern floor overlooking the city ruins, its pillars reaching toward the darkness above. Sacred chambers hold relics of immense power and beauty.',
      timestamp: Date.now(),
      type: 'system',
    });
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleExploreCitadel(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('exploreCitadel', state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    delete effectUpdates.logMessages;
  }

  // Add a special log message for exploring citadel
  if (!state.story.seen.exploredCitadel) {
    result.logEntries!.push({
      id: `explore-citadel-${Date.now()}`,
      message: 'The ultimate depths reveal a vast citadel, its walls gleaming with otherworldly light. This is the heart of the ancient realm, where the greatest treasures await.',
      timestamp: Date.now(),
      type: 'system',
    });
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleLowChamber(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('lowChamber', state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    delete effectUpdates.logMessages;
  }

  result.logEntries!.push({
    id: `low-chamber-explored-${Date.now()}`,
    message: 'Using the reinforced rope, you descend into a previously inaccessible chamber deep within the cave. Ancient treasures glimmer in the torchlight, hidden for centuries in this forgotten place.',
    timestamp: Date.now(),
    type: 'system',
  });

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleAlchemistChamber(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('alchemistChamber', state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    delete effectUpdates.logMessages;
  }

  result.logEntries!.push({
    id: `alchemist-chamber-explored-${Date.now()}`,
    message: 'Following the alchemist\'s map, you find the hidden chamber sealed behind rock that moves like a door. Inside, the alchemist\'s greatest treasures and experiments await, preserved in death.',
    timestamp: Date.now(),
    type: 'system',
  });

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}