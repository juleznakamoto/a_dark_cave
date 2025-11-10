import { Action, GameState } from "@shared/schema";
import { ActionResult } from "@/game/actions";
import { applyActionEffects } from "@/game/rules";
import { getTotalLuck } from "@/game/rules/effectsCalculation";

// Helper function to apply luck bonuses to cave exploration probability effects
function applyCaveExplorationLuckBonus(
  state: GameState,
  actionId: string,
  effectUpdates: any,
): void {
  const luck = getTotalLuck(state);
  const luckBonus = luck * 0.01; // 1% per luck point

  // Skip if no luck
  if (luck <= 0) return;

  // Define which resources can benefit from luck in cave exploration
  const caveResources = [
    "wood",
    "stone",
    "coal",
    "iron",
    "bones",
    "sulfur",
    "silver",
    "gold",
    "obsidian",
    "adamant",
    "moonstone",
  ];

  // Apply luck bonus to probability-based resource effects
  if (effectUpdates.resources) {
    Object.keys(effectUpdates.resources).forEach((resource) => {
      if (caveResources.includes(resource)) {
        const totalAmount = effectUpdates.resources[resource] || 0;
        const existingAmount = state.resources[resource] || 0;
        const actuallyAddedAmount = totalAmount - existingAmount;

        if (actuallyAddedAmount > 0) {
          // Calculate luck bonus based only on the newly added resources
          const luckBonusAmount = Math.floor(actuallyAddedAmount * luckBonus);
          if (luckBonusAmount > 0) {
            effectUpdates.resources[resource] = totalAmount + luckBonusAmount;
          }
        }
      }
    });
  }
}

// Base items (relics and clothing) for each cave exploration stage
const caveItems = {
  exploreCave: [],
  ventureDeeper: [
    {
      key: "tarnished_amulet",
      probability: 0.02,
      logMessage:
        "In the cave's shadows, something glints. You find a tarnished amulet.",
      category: "clothing",
    },
    {
      key: "bloodstained_belt",
      probability: 0.02,
      logMessage:
        "In the cave you find a leather belt stained with ancient blood.",
      category: "clothing",
    },
  ],
  descendFurther: [
    {
      key: "bone_dice",
      probability: 0.02,
      isChoice: true,
      eventId: "boneDiceChoice",
      category: "relics",
    },
  ],
  exploreRuins: [
    {
      key: "ring_of_drowned",
      probability: 0.03,
      isChoice: true,
      eventId: "ringOfDrownedChoice",
      category: "clothing",
    },
  ],
  exploreTemple: [
    {
      key: "shadow_flute",
      probability: 0.04,
      isChoice: true,
      eventId: "shadowFluteChoice",
      category: "relics",
    },
  ],
  exploreCitadel: [
    {
      key: "hollow_king_scepter",
      probability: 0.05,
      isChoice: true,
      eventId: "hollowKingScepterChoice",
      category: "relics",
    },
  ],
};

// Helper function to get inherited items with 10% probability bonus
function getInheritedItems(actionId: string) {
  const stageOrder = [
    "exploreCave",
    "ventureDeeper",
    "descendFurther",
    "exploreRuins",
    "exploreTemple",
    "exploreCitadel",
  ];
  const currentIndex = stageOrder.indexOf(actionId);

  const inheritedItems: any = {};

  // Add items from all previous stages with 1% probability bonus
  for (let i = 0; i <= currentIndex; i++) {
    const stageId = stageOrder[i];
    const items = caveItems[stageId as keyof typeof caveItems];

    items.forEach((item) => {
      const adjustedProbability =
        i === currentIndex
          ? item.probability
          : item.probability + 0.005 * (currentIndex - i);

      // Determine the category (relics or clothing) based on the item's category
      const category = item.category || 'relics';
      
      inheritedItems[`${category}.${item.key}`] = {
        probability: Math.min(adjustedProbability, 1.0), // Cap at 100%
        value: true,
        condition:
          `!${category}.${item.key}` +
          ('eventId' in item && item.eventId ? ` && !story.seen.${item.eventId}` : ""),
        ...('isChoice' in item && item.isChoice && { isChoice: item.isChoice }),
        ...('eventId' in item && item.eventId && { eventId: item.eventId }),
        ...('logMessage' in item && item.logMessage && { logMessage: item.logMessage }),
      };
    });
  }

  return inheritedItems;
}

export const caveExploreActions: Record<string, Action> = {
  lightFire: {
    id: "lightFire",
    label: "Light Fire",
    show_when: {},
    cost: {},
    effects: {
      "story.seen.fireLit": true,
    },
    cooldown: 1,
  },

  gatherWood: {
    id: "gatherWood",
    label: "Gather Wood",
    show_when: {},
    cost: {},
    effects: {
      "resources.wood": "random(3,9)",
      "story.seen.hasWood": true,
      "relics.old_trinket": {
        probability: 0.0005,
        value: true,
        condition: "!relics.old_trinket && buildings.cabin >= 1",
        logMessage:
          "While gathering wood, you find an old trinket with glowing amber liquid inside. After some hesitation, you drink it. It burns as it goes down, but you feel stronger than before.",
      },
    },
    cooldown: 6,
  },

  exploreCave: {
    id: "exploreCave",
    label: "Explore Cave",
    show_when: {
      "story.seen.actionCraftTorch": true,
      "buildings.blacksmith": 0,
    },
    cost: {
      "resources.torch": 3,
    },
    effects: {
      "resources.wood": { probability: 0.5, value: "random(2,5)" },
      "resources.stone": { probability: 1, value: "random(2,5)" },
      "resources.coal": { probability: 0.5, value: "random(2,5)" },
      "resources.iron": { probability: 0.5, value: "random(2,5)" },
      "resources.bones": { probability: 0.5, value: "random(2,5)" },
      ...getInheritedItems("exploreCave"),
      "flags.caveExplored": true,
      "story.seen.hasStone": true,
      "story.seen.caveExplored": true
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
      "resources.torch": 5,
      "resources.food": 10,
    },
    effects: {
      "resources.stone": { probability: 1, value: "random(4,8)" },
      "resources.coal": { probability: 0.55, value: "random(4,8)" },
      "resources.iron": { probability: 0.55, value: "random(4,8)" },
      "resources.bones": { probability: 0.55, value: "random(4,8)" },
      "resources.sulfur": { probability: 0.55, value: "random(4,8)" },
      ...getInheritedItems("ventureDeeper"),
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
      "resources.food": 25,
    },
    effects: {
      "resources.stone": { probability: 1, value: "random(6,11)" },
      "resources.iron": { probability: 0.6, value: "random(6,11)" },
      "resources.coal": { probability: 0.6, value: "random(6,11)" },
      "resources.obsidian": { probability: 0.25, value: "random(1,3)" },
      "resources.bones": { probability: 0.6, value: "random(6,11)" },
      "resources.sulfur": { probability: 0.6, value: "random(6,11)" },
      "resources.silver": { probability: 0.4, value: "random(2,8)" },
      ...getInheritedItems("descendFurther"),
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
      "resources.food": 50,
    },
    effects: {
      "resources.stone": { probability: 1, value: "random(8,14)" },
      "resources.iron": { probability: 0.65, value: "random(8,14)" },
      "resources.coal": { probability: 0.65, value: "random(8,14)" },
      "resources.obsidian": { probability: 0.3, value: "random(2,4)" },
      "resources.adamant": { probability: 0.2, value: "random(1,3)" },
      "resources.bones": { probability: 0.65, value: "random(8,14)" },
      "resources.sulfur": { probability: 0.65, value: "random(8,14)" },
      "resources.silver": { probability: 0.45, value: "random(4,10)" },
      "resources.gold": { probability: 0.2, value: "random(2,8)" },
      ...getInheritedItems("exploreRuins"),
      "flags.exploredRuins": true,
      "story.seen.exploredRuins": true,
    },
    cooldown: 40,
  },

  exploreTemple: {
    id: "exploreTemple",
    label: "Explore Temple",
    show_when: {
      "tools.obsidian_lantern": true,
      "tools.adamant_lantern": false,
    },
    cost: {
      "resources.food": 100,
    },
    effects: {
      "resources.stone": { probability: 1, value: "random(10,17)" },
      "resources.iron": { probability: 0.7, value: "random(10,17)" },
      "resources.coal": { probability: 0.7, value: "random(10,17" },
      "resources.obsidian": { probability: 0.35, value: "random(3,5)" },
      "resources.adamant": { probability: 0.25, value: "random(2,4)" },
      "resources.bones": { probability: 0.7, value: "random(10,17)" },
      "resources.sulfur": { probability: 0.7, value: "random(10,17)" },
      "resources.silver": { probability: 0.5, value: "random(6,12)" },
      "resources.gold": { probability: 0.25, value: "random(4,10)" },
      "resources.moonstone": { probability: 0.2, value: "random(1,8)" },
      ...getInheritedItems("exploreTemple"),
      "flags.exploredTemple": true,
      "story.seen.exploredTemple": true,
    },
    cooldown: 50,
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
      "resources.stone": { probability: 1, value: "random(12,20)" },
      "resources.iron": { probability: 0.75, value: "random(12,20)" },
      "resources.coal": { probability: 0.75, value: "random(12,20)" },
      "resources.obsidian": { probability: 0.4, value: "random(4,5)" },
      "resources.adamant": { probability: 0.3, value: "random(3,5)" },
      "resources.bones": { probability: 0.75, value: "random(12,20)" },
      "resources.sulfur": { probability: 0.75, value: "random(12,20)" },
      "resources.silver": { probability: 0.55, value: "random(8,14)" },
      "resources.gold": { probability: 0.3, value: "random(6,12)" },
      "resources.moonstone": { probability: 0.25, value: "random(2,10)" },
      ...getInheritedItems("exploreCitadel"),
      "flags.exploredCitadel": true,
      "story.seen.exploredCitadel": true,
    },
    cooldown: 60,
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
      "resources.silver": { probability: 1, value: 250 },
      "resources.gold": { probability: 1, value: 100 },
      "resources.obsidian": { probability: 1, value: 50 },
      "resources.adamant": { probability: 1, value: 50 },
      "tools.mastermason_chisel": true,
      "flags.lowChamberExplored": true,
      "story.seen.lowChamberExplored": true,
    },
    cooldown: 1,
  },

  occultistChamber: {
    id: "occultistChamber",
    label: "Occultist Chamber",
    show_when: {
      "tools.occultist_map": true,
      "flags.occultistChamberExplored": false,
    },
    cost: {
      "resources.food": 1000,
    },
    effects: {
      "resources.gold": { probability: 1, value: 150 },
      "resources.obsidian": { probability: 1, value: 75 },
      "resources.adamant": { probability: 1, value: 50 },
      "resources.moonstone": { probability: 1, value: 30 },
      "relics.occultist_grimoire": true,
      "flags.occultistChamberExplored": true,
      "story.seen.occultistChamberExplored": true,
    },
    cooldown: 1,
  },

  blastPortal: {
    id: "blastPortal",
    label: "Blast Portal",
    show_when: {
      "story.seen.portalDiscovered": true,
      "flags.portalBlasted": false,
    },
    cost: {
      "resources.ember_bomb": 10,
    },
    effects: {
      "resources.ember_bomb": -10,
      "flags.portalBlasted": true,
      "story.seen.portalBlasted": true,
    },
    cooldown: 1,
  },

  encounterBeyondPortal: {
    id: "encounterBeyondPortal",
    label: "Venture beyond Portal",
    show_when: {
      "story.seen.fifthWaveVictory": true,
      "story.seen.encounteredBeyondPortal": false,
    },
    cost: {
      "resources.food": 2500,
    },
    effects: {
      "story.seen.encounteredBeyondPortal": true,
    },
    cooldown: 1,
  },
};

// Action handlers
export function handleLightFire(
  state: GameState,
  result: ActionResult,
): ActionResult {
  result.stateUpdates.flags = { ...state.flags, gameStarted: true };
  result.stateUpdates.story = {
    ...state.story,
    seen: {
      ...state.story.seen,
      fireLit: true,
    },
  };

  // Apply boost mode resources if active
  if (state.boostMode) {
    result.stateUpdates.resources = {
      ...state.resources,
      wood: (state.resources.wood || 0) + 5000,
      stone: (state.resources.stone || 0) + 5000,
      food: (state.resources.food || 0) + 2000,
      torch: (state.resources.torch || 0) + 100,
      iron: (state.resources.iron || 0) + 1000,
      steel: (state.resources.steel || 0) + 500,
      gold: (state.resources.gold || 0) + 500,

    };
  }

  result.logEntries!.push({
    id: `fire-lit-${Date.now()}`,
    message: state.boostMode
      ? "The fire crackles softly, casting dancing shadows on the cave walls. The warmth is comforting. Someone left you a gift."
      : "The fire crackles softly, casting dancing shadows on the cave walls. The warmth is comforting.",
    timestamp: Date.now(),
    type: "system",
  });

  return result;
}

export function handleGatherWood(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("gatherWood", state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string | any) => {
      if (typeof message === "string") {
        result.logEntries!.push({
          id: `probability-effect-${Date.now()}-${Math.random()}`,
          message: message,
          timestamp: Date.now(),
          type: "system",
        });
      } else if (message.type === "event") {
        result.logEntries!.push(message);
      }
    });
    delete effectUpdates.logMessages;
  }

  // Add message for first time gathering wood
  if (state.resources.wood === 0 && !state.story.seen.firstWoodGathered) {
    result.logEntries!.push({
      id: `first-wood-gather-${Date.now()}`,
      message: "Some wood lies scattered near the cave's entrance. It might prove useful.",
      timestamp: Date.now(),
      type: "system",
    });

    // Mark as seen so it only triggers once
    result.stateUpdates.story = {
      ...state.story,
      seen: {
        ...state.story.seen,
        firstWoodGathered: true,
      },
    };
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleExploreCave(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("exploreCave", state);

  // Apply luck bonus to the resolved resource amounts
  applyCaveExplorationLuckBonus(state, "exploreCave", effectUpdates);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string | any) => {
      if (typeof message === "string") {
        result.logEntries!.push({
          id: `probability-effect-${Date.now()}-${Math.random()}`,
          message: message,
          timestamp: Date.now(),
          type: "system",
        });
      } else if (message.type === "event") {
        result.logEntries!.push(message);
      }
    });
    delete effectUpdates.logMessages;
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleVentureDeeper(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("ventureDeeper", state);
  applyCaveExplorationLuckBonus(state, "ventureDeeper", effectUpdates);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string | any) => {
      if (typeof message === "string") {
        result.logEntries!.push({
          id: `probability-effect-${Date.now()}-${Math.random()}`,
          message: message,
          timestamp: Date.now(),
          type: "system",
        });
      } else if (message.type === "event") {
        result.logEntries!.push(message);
      }
    });
    delete effectUpdates.logMessages;
  }

  // Add a special log message for venturing deeper
  if (!state.story.seen.venturedDeeper) {
    result.logEntries!.push({
      id: `venture-deeper-${Date.now()}`,
      message:
        "The torchlight reveals deeper passages carved into the rock. The air grows colder as you descend.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleDescendFurther(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("descendFurther", state);
  applyCaveExplorationLuckBonus(state, "descendFurther", effectUpdates);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string | any) => {
      if (typeof message === "string") {
        result.logEntries!.push({
          id: `probability-effect-${Date.now()}-${Math.random()}`,
          message: message,
          timestamp: Date.now(),
          type: "system",
        });
      } else if (message.type === "event") {
        result.logEntries!.push(message);
      }
    });
    delete effectUpdates.logMessages;
  }

  // Add a special log message for descending further
  if (!state.story.seen.descendedFurther) {
    result.logEntries!.push({
      id: `descend-further-${Date.now()}`,
      message:
        "With the lantern casting a steady glow, you descend into deeper chambers. The walls shimmer with veins of precious metals.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleExploreRuins(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("exploreRuins", state);
  applyCaveExplorationLuckBonus(state, "exploreRuins", effectUpdates);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string | any) => {
      if (typeof message === "string") {
        result.logEntries!.push({
          id: `probability-effect-${Date.now()}-${Math.random()}`,
          message: message,
          timestamp: Date.now(),
          type: "system",
        });
      } else if (message.type === "event") {
        result.logEntries!.push(message);
      }
    });
    delete effectUpdates.logMessages;
  }

  // Add a special log message for exploring ruins
  if (!state.story.seen.exploredRuins) {
    result.logEntries!.push({
      id: `explore-ruins-${Date.now()}`,
      message:
        "Ancient ruins sprawl before you deep in the cave, their crumbling walls telling stories of a lost civilization.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleExploreTemple(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("exploreTemple", state);
  applyCaveExplorationLuckBonus(state, "exploreTemple", effectUpdates);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string | any) => {
      if (typeof message === "string") {
        result.logEntries!.push({
          id: `probability-effect-${Date.now()}-${Math.random()}`,
          message: message,
          timestamp: Date.now(),
          type: "system",
        });
      } else if (message.type === "event") {
        result.logEntries!.push(message);
      }
    });
    delete effectUpdates.logMessages;
  }

  // Add a special log message for exploring temple
  if (!state.story.seen.exploredTemple) {
    result.logEntries!.push({
      id: `explore-temple-${Date.now()}`,
      message:
        "A magnificent temple rises from the cavern floor overlooking the city ruins, its pillars reaching toward the darkness above.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleExploreCitadel(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("exploreCitadel", state);
  applyCaveExplorationLuckBonus(state, "exploreCitadel", effectUpdates);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string | any) => {
      if (typeof message === "string") {
        result.logEntries!.push({
          id: `probability-effect-${Date.now()}-${Math.random()}`,
          message: message,
          timestamp: Date.now(),
          type: "system",
        });
      } else if (message.type === "event") {
        result.logEntries!.push(message);
      }
    });
    delete effectUpdates.logMessages;
  }

  // Add a special log message for exploring citadel
  if (!state.story.seen.exploredCitadel) {
    result.logEntries!.push({
      id: `explore-citadel-${Date.now()}`,
      message:
        "The ultimate depths reveal a vast citadel, its walls gleaming with otherworldly light. This is the heart of the ancient realm.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleLowChamber(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("lowChamber", state);

  result.logEntries!.push({
    id: `low-chamber-explored-${Date.now()}`,
    message:
      "Using the reinforced rope, you descend into the low chamber. Amongst the treasures you find a mastermason's chisel, a tool of legendary craftsmanship.",
    timestamp: Date.now(),
    type: "system",
    visualEffect: {
      type: "glow",
      duration: 3,
    },
  });

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleoccultistChamber(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("occultistChamber", state);

  result.logEntries!.push({
    id: `occultist-chamber-explored-${Date.now()}`,
    message:
      "Following the occultist's map, you find the chamber containing his treasures. Amongst them is his grimoire, filled with forbidden knowledge and arcane secrets.",
    timestamp: Date.now(),
    type: "system",
    visualEffect: {
      type: "glow",
      duration: 3,
    },
  });

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleBlastPortal(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("blastPortal", state);

  result.logEntries!.push({
    id: `portal-blasted-${Date.now()}`,
    message:
      "The ember bombs detonate in a bright flash of fire and light. The ancient portal cracks and crumbles. Whatever could have been sealed within has been released... We have to get ready for whatever comes out of there.",
    timestamp: Date.now(),
    type: "system",
    visualEffect: {
      type: "glow",
      duration: 3,
    },
  });

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleEncounterBeyondPortal(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("encounterBeyondPortal", state);

  result.logEntries!.push({
    id: `encounter-beyond-portal-${Date.now()}`,
    message:
      "You venture beyond the shattered portal into the depths below.",
    timestamp: Date.now(),
    type: "system",
  });

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}