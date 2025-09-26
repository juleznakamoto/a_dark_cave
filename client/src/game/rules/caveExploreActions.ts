import { Action, GameState } from "@shared/schema";
import { ActionResult } from "@/game/actions";
import { applyActionEffects } from "@/game/rules";
import { getTotalLuck } from '@/game/rules/effects';

// Helper function to apply luck bonuses to cave exploration probability effects
function applyCaveExplorationLuckBonus(state: GameState, actionId: string, effectUpdates: any): void {
  const luck = getTotalLuck(state);
  const luckBonus = luck * 0.01; // 1% per luck point

  // Skip if no luck
  if (luck <= 0) return;

  // Define which resources can benefit from luck in cave exploration
  const caveResources = ['wood', 'stone', 'coal', 'iron', 'bones', 'sulfur', 'silver', 'gold', 'obsidian', 'adamant', 'bloodstone', 'frostglas'];

  // Apply luck bonus to probability-based resource effects
  if (effectUpdates.resources) {
    Object.keys(effectUpdates.resources).forEach(resource => {
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


// Base relics for each cave exploration stage
const caveRelics = {
  exploreCave: [
    {
      key: "tarnished_amulet",
      probability: 0.01,
      logMessage: "In the cave’s shadows, something glints. You pick up a tarnished amulet and place it around your neck. Despite its worn surface, a strange sense of protection and fortune washes over you.",
    },
  ],
  ventureDeeper: [
    {
      key: "bloodstained_belt",
      probability: 0.015,
      logMessage: "Among the bones, you find a leather belt stained with ancient blood. You fasten it, and a surge of strength courses through you, though the blood never seems to dry.",
    },
  ],
  descendFurther: [
    {
      key: "dragon_bone_dice",
      probability: 0.02,
      logMessage: "",
      luck: 3,
      isChoice: true,
      eventId: "dragonBoneDiceChoice",
    },
  ],
  exploreRuins: [
    {
      key: "coin_of_drowned",
      probability: 0.025,
      logMessage: "",
      luck: 4,
      madness: 2,
      isChoice: true,
      eventId: "coinOfDrownedChoice",
    },
  ],
  exploreTemple: [
    {
      key: "shadow_flute",
      probability: 0.03,
      logMessage: "",
      luck: 3,
      knowledge: 2,
      madness: 3,
      isChoice: true,
      eventId: "shadowFluteChoice",
    },
  ],
  exploreCitadel: [
    {
      key: "hollow_kings_scepter",
      probability: 0.035,
      logMessage: "",
      strength: 3,
      knowledge: 7,
      madness: 5,
      isChoice: true,
      eventId: "hollowKingsScepterChoice",
    },
  ],
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
          ? relic.probability
          : relic.probability + 0.005 * (currentIndex - i);

      inheritedRelics[`relics.${relic.key}`] = {
        probability: Math.min(adjustedProbability, 1.0), // Cap at 100%
        value: true,
        condition: `!relics.${relic.key}` + (relic.eventId ? ` && !story.seen.${relic.eventId}` : ""),
        logMessage: relic.logMessage,
        ...(relic.isChoice && { isChoice: relic.isChoice }),
        ...(relic.eventId && { eventId: relic.eventId }),
        ...(relic.luck && { luck: relic.luck }),
        ...(relic.madness && { madness: relic.madness }),
        ...(relic.knowledge && { knowledge: relic.knowledge }),
        ...(relic.strength && { strength: relic.strength }),
      };
    });
  }

  return inheritedRelics;
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
          "While gathering wood, you find an old trinket with glowing amber liquid inside. Without hesitation, you drink the mysterious liquid. It burns as it goes down, but you feel stronger than before.",
      },
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
      "resources.food": 500,
    },
    effects: {
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
    cooldown: 50,
  },

  exploreCitadel: {
    id: "exploreCitadel",
    label: "Explore Citadel",
    show_when: {
      "tools.adamant_lantern": true,
    },
    cost: {
      "resources.food": 750,
    },
    effects: {
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
      "resources.gold": { probability: 1, value: "random(15,45)" },
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
      "resources.gold": { probability: 1, value: "random(20,40)" },
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

  result.logEntries!.push({
    id: `fire-lit-${Date.now()}`,
    message:
      "The fire crackles softly, casting dancing shadows on the cave walls. The warmth is comforting.",
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
      if (typeof message === 'string') {
        result.logEntries!.push({
          id: `probability-effect-${Date.now()}-${Math.random()}`,
          message: message,
          timestamp: Date.now(),
          type: "system",
        });
      } else if (message.type === 'event') {
        result.logEntries!.push(message);
      }
    });
    delete effectUpdates.logMessages;
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
      if (typeof message === 'string') {
        result.logEntries!.push({
          id: `probability-effect-${Date.now()}-${Math.random()}`,
          message: message,
          timestamp: Date.now(),
          type: "system",
        });
      } else if (message.type === 'event') {
        result.logEntries!.push(message);
      }
    });
    delete effectUpdates.logMessages;
  }

  // Remove forge section from cave panel
  if (state.panels?.cave?.actions) {
    result.stateUpdates.panels = {
      ...state.panels,
      cave: {
        ...state.panels.cave,
        actions: state.panels.cave.actions.filter(
          (action) => action.id !== "forgeSteel",
        ),
      },
    };
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
      if (typeof message === 'string') {
        result.logEntries!.push({
          id: `probability-effect-${Date.now()}-${Math.random()}`,
          message: message,
          timestamp: Date.now(),
          type: "system",
        });
      } else if (message.type === 'event') {
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
        "The torchlight reveals deeper passages carved into the rock. The air grows colder as you descend, but the promise of greater treasures draws you forward.",
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
      if (typeof message === 'string') {
        result.logEntries!.push({
          id: `probability-effect-${Date.now()}-${Math.random()}`,
          message: message,
          timestamp: Date.now(),
          type: "system",
        });
      } else if (message.type === 'event') {
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
        "With your lantern casting a steady glow, you descend into the deepest chambers. The walls shimmer with veins of precious metals and the air hums with ancient power.",
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
      if (typeof message === 'string') {
        result.logEntries!.push({
          id: `probability-effect-${Date.now()}-${Math.random()}`,
          message: message,
          timestamp: Date.now(),
          type: "system",
        });
      } else if (message.type === 'event') {
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
        "Ancient ruins sprawl before you deep in the cave, their crumbling walls telling stories of a lost civilization. Your lantern reveals treasures hidden in the shadows of time.",
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
      if (typeof message === 'string') {
        result.logEntries!.push({
          id: `probability-effect-${Date.now()}-${Math.random()}`,
          message: message,
          timestamp: Date.now(),
          type: "system",
        });
      } else if (message.type === 'event') {
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
        "A magnificent temple rises from the cavern floor overlooking the city ruins, its pillars reaching toward the darkness above. Sacred chambers hold relics of immense power and beauty.",
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
      if (typeof message === 'string') {
        result.logEntries!.push({
          id: `probability-effect-${Date.now()}-${Math.random()}`,
          message: message,
          timestamp: Date.now(),
          type: "system",
        });
      } else if (message.type === 'event') {
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
        "The ultimate depths reveal a vast citadel, its walls gleaming with otherworldly light. This is the heart of the ancient realm, where the greatest treasures await.",
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
  applyCaveExplorationLuckBonus(state, "lowChamber", effectUpdates);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string | any) => {
      if (typeof message === 'string') {
        result.logEntries!.push({
          id: `probability-effect-${Date.now()}-${Math.random()}`,
          message: message,
          timestamp: Date.now(),
          type: "system",
        });
      } else if (message.type === 'event') {
        result.logEntries!.push(message);
      }
    });
    delete effectUpdates.logMessages;
  }

  result.logEntries!.push({
    id: `low-chamber-explored-${Date.now()}`,
    message:
      "Using the reinforced rope, you descend into a previously inaccessible chamber deep within the cave. Ancient treasures glimmer in the torchlight, hidden for centuries in this forgotten place.",
    timestamp: Date.now(),
    type: "system",
  });

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleAlchemistChamber(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("alchemistChamber", state);
  applyCaveExplorationLuckBonus(state, "alchemistChamber", effectUpdates);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string | any) => {
      if (typeof message === 'string') {
        result.logEntries!.push({
          id: `probability-effect-${Date.now()}-${Math.random()}`,
          message: message,
          timestamp: Date.now(),
          type: "system",
        });
      } else if (message.type === 'event') {
        result.logEntries!.push(message);
      }
    });
    delete effectUpdates.logMessages;
  }

  result.logEntries!.push({
    id: `alchemist-chamber-explored-${Date.now()}`,
    message:
      "Following the alchemist's map, you find the hidden chamber sealed behind rock that moves like a door. Inside, the alchemist's greatest treasures and experiments await, preserved in death.",
    timestamp: Date.now(),
    type: "system",
  });

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}