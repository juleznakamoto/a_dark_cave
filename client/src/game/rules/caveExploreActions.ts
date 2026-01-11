import { Action, GameState } from "@shared/schema";
import { ActionResult } from "@/game/actions";
import { applyActionEffects } from "./actionEffects";
import { gameEvents, LogEntry } from "./events";
import { logger } from "../../lib/logger";

// Helper function to process triggered events from action effects
function processTriggeredEvents(
  effectUpdates: any,
  result: ActionResult,
  state: GameState
): void {
  if (effectUpdates.triggeredEvents && effectUpdates.triggeredEvents.length > 0) {
    logger.log(`[CAVE EXPLORE] Processing triggered events:`, effectUpdates.triggeredEvents);
    
    effectUpdates.triggeredEvents.forEach((eventId: string) => {
      // Prevent event from happening again if it's already been triggered
      if (state.triggeredEvents?.[eventId]) {
        logger.log(`[CAVE EXPLORE] Skipping already triggered event: ${eventId}`);
        return;
      }

      const eventDef = gameEvents[eventId];
      if (eventDef) {
        logger.log(`[CAVE EXPLORE] Found event definition for: ${eventId}`, { 
          title: eventDef.title,
          hasChoices: !!eventDef.choices
        });
        
        // Mark as triggered in state updates
        if (!effectUpdates.triggeredEventsState) effectUpdates.triggeredEventsState = {};
        effectUpdates.triggeredEventsState[eventId] = true;

        // Create a log entry for the event
        const logEntry: LogEntry = {
          id: `${eventId}-${Date.now()}`,
          message: typeof eventDef.message === 'string' 
            ? eventDef.message 
            : Array.isArray(eventDef.message) 
              ? eventDef.message[0] 
              : '',
          timestamp: Date.now(),
          type: "event",
          title: eventDef.title,
          choices: typeof eventDef.choices === 'function' ? undefined : eventDef.choices,
          isTimedChoice: eventDef.isTimedChoice,
          baseDecisionTime: eventDef.baseDecisionTime,
          fallbackChoice: eventDef.fallbackChoice,
          relevant_stats: eventDef.relevant_stats,
        };
        
        result.logEntries!.push(logEntry);
      } else {
        logger.warn(`[CAVE EXPLORE] No event definition found for: ${eventId}`);
      }
    });
    
    // Merge triggered events state into main state updates
    if (effectUpdates.triggeredEventsState) {
      effectUpdates.triggeredEvents = {
        ...(state.triggeredEvents || {}),
        ...effectUpdates.triggeredEventsState
      };
      delete effectUpdates.triggeredEventsState;
    } else {
      delete effectUpdates.triggeredEvents;
    }
  }
}

// Base items for each cave exploration stage
const caveItems = {
  exploreCave: [],
  ventureDeeper: [
    {
      key: "tarnished_amulet",
      probability: 0.0075,
      logMessage:
        "In the cave's shadows, something glints. You find a tarnished amulet.",
      category: "clothing",
    },
    {
      key: "bloodstained_belt",
      probability: 0.0125,
      logMessage:
        "In the cave you find a leather belt stained with ancient blood.",
      category: "clothing",
    },
  ],
  descendFurther: [
    {
      key: "bone_dice",
      probability: 0.0175,
      isChoice: true,
      eventId: "boneDiceChoice",
      category: "relics",
    },
  ],
  exploreRuins: [
    {
      key: "ring_of_drowned",
      probability: 0.0225,
      isChoice: true,
      eventId: "ringOfDrownedChoice",
      category: "clothing",
    },
  ],
  exploreTemple: [
    {
      key: "shadow_flute",
      probability: 0.0275,
      isChoice: true,
      eventId: "shadowFluteChoice",
      category: "relics",
    },
  ],
  exploreCitadel: [
    {
      key: "hollow_king_scepter",
      probability: 0.0325,
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

  // Add items from all previous stages with 0.5% probability bonus
  for (let i = 0; i <= currentIndex; i++) {
    const stageId = stageOrder[i];
    const items = caveItems[stageId as keyof typeof caveItems];

    items.forEach((item) => {
      const adjustedProbability =
        i === currentIndex
          ? item.probability
          : item.probability + 0.005 * (currentIndex - i);

      // Determine the category (relics or clothing) based on the item's category
      const category = item.category || "relics";

      inheritedItems[`${category}.${item.key}`] = {
        probability: Math.min(adjustedProbability, 1.0), // Cap at 100%
        value: true,
        condition:
          `!${category}.${item.key}` +
          ("eventId" in item && item.eventId
            ? ` && !story.seen.${item.eventId}`
            : ""),
        ...("isChoice" in item && item.isChoice && { isChoice: item.isChoice }),
        ...("eventId" in item && item.eventId && { eventId: item.eventId }),
        ...("logMessage" in item &&
          item.logMessage && { logMessage: item.logMessage }),
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

  chopWood: {
    id: "chopWood",
    label: "Gather Wood",
    show_when: {},
    cost: {},
    effects: (state: GameState) => {
      const woodAmount = state.BTP === 1 ? "random(6,14)" : "random(6,12)";
      return {
        "resources.wood": woodAmount,
        "story.seen.hasWood": true,
        "story.seen.firstWoodGathered": true,
      };
    },
    cooldown: 4,
    upgrade_key: "chopWood",
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
      "resources.wood": "random(5,10)",
      "resources.stone": "random(3,7)",
      "resources.coal": "random(3,7)",
      "resources.iron": "random(3,7)",
      ...getInheritedItems("exploreCave"),
      "story.seen.hasStone": true,
      "story.seen.caveExplored": true,
    },
    cooldown: 10,
    upgrade_key: "exploreCave",
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
      "resources.food": 25,
    },
    effects: (state: GameState) => {
      const multiplier = state.BTP === 1 ? 2 : 1;
      return {
        "resources.stone": "random(4,8)",
        "resources.coal": "random(4,8)",
        "resources.iron": "random(4,8)",
        "resources.sulfur": "random(4,8)",
        "resources.silver": `random(1,${5 * multiplier})`,
        ...getInheritedItems("ventureDeeper"),
        "story.seen.venturedDeeper": true,
      };
    },
    cooldown: 15,
    upgrade_key: "ventureDeeper",
  },

  descendFurther: {
    id: "descendFurther",
    label: "Descend Further",
    show_when: {
      "tools.iron_lantern": true,
      "tools.steel_lantern": false,
    },
    cost: {
      "resources.food": 50,
    },
    effects: (state: GameState) => {
      const multiplier = state.BTP === 1 ? 2 : 1;
      return {
        "resources.stone": "random(5,10)",
        "resources.coal": "random(5,10)",
        "resources.iron": "random(5,10)",
        "resources.obsidian": "random(0,2)",
        "resources.silver": `random(1,${10 * multiplier})`,
        ...getInheritedItems("descendFurther"),
        "story.seen.descendedFurther": true,
      };
    },
    cooldown: 20,
    upgrade_key: "descendFurther",
  },

  exploreRuins: {
    id: "exploreRuins",
    label: "Explore Ruins",
    show_when: {
      "tools.steel_lantern": true,
      "tools.obsidian_lantern": false,
    },
    cost: {
      "resources.food": 100,
    },
    effects: (state: GameState) => {
      const multiplier = state.BTP === 1 ? 2 : 1;
      return {
        "resources.obsidian": "random(1,4)",
        "resources.adamant": "random(0,2)",
        "resources.silver": `random(5,${10 * multiplier})`,
        "resources.gold": `random(1,${5 * multiplier})`,
        ...getInheritedItems("exploreRuins"),
        "story.seen.exploredRuins": true,
      };
    },
    cooldown: 25,
    upgrade_key: "exploreRuins",
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
    effects: (state: GameState) => {
      const multiplier = state.BTP === 1 ? 2 : 1;
      return {
        "resources.obsidian": "random(1,6)",
        "resources.adamant": "random(1,4)",
        "resources.moonstone": "random(0,1)",
        "resources.silver": `random(10,${10 * multiplier})`,
        "resources.gold": `random(1,${10 * multiplier})`,

        ...getInheritedItems("exploreTemple"),
        "story.seen.exploredTemple": true,
      };
    },
    cooldown: 30,
    upgrade_key: "exploreTemple",
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
    effects: (state: GameState) => {
      const multiplier = state.BTP === 1 ? 2 : 1;
      return {
        "resources.obsidian": "random(1,8)",
        "resources.adamant": "random(1,6)",
        "resources.moonstone": "random(0,2)",
        "resources.silver": `random(10,${20 * multiplier})`,
        "resources.gold": `random(5,${10 * multiplier})`,
        ...getInheritedItems("exploreCitadel"),
        "story.seen.exploredCitadel": true,
      };
    },
    cooldown: 35,
    upgrade_key: "exploreCitadel",
  },

  lowChamber: {
    id: "lowChamber",
    label: "Low Chamber",
    show_when: {
      "tools.reinforced_rope": true,
      "story.seen.lowChamberExplored": false,
    },
    cost: {
      "resources.food": 1000,
    },
    effects: (state: GameState) => {
      const silverBonus = state.BTP === 1 ? 150 : 1;
      const goldBonus = state.BTP === 1 ? 100 : 0;
      return {
        "resources.silver": 250 + silverBonus,
        "resources.gold": 50 + goldBonus,
        "resources.obsidian": 50,
        "resources.adamant": 50,
        "tools.mastermason_chisel": true,
        "story.seen.lowChamberExplored": true,
      };
    },
    cooldown: 1,
  },

  occultistChamber: {
    id: "occultistChamber",
    label: "Occultist Chamber",
    show_when: {
      "tools.occultist_map": true,
      "story.seen.occultistChamberExplored": false,
    },
    cost: {
      "resources.food": 1000,
    },
    effects: (state: GameState) => {
      const goldBonus = state.BTP === 1 ? 150 : 0;
      return {
        "resources.gold": 150 + goldBonus,
        "resources.obsidian": 75,
        "resources.adamant": 50,
        "resources.moonstone": 25,
        "relics.occultist_grimoire": true,
        "story.seen.occultistChamberExplored": true,
      };
    },
    cooldown: 1,
  },

  hiddenLibrary: {
    id: "hiddenLibrary",
    label: "Hidden Library",
    show_when: {
      "tools.hidden_library_map": true,
      "story.seen.hiddenLibraryExplored": false,
    },
    cost: {
      "resources.food": 2500,
    },
    effects: (state: GameState) => {
      const goldBonus = state.BTP === 1 ? 100 : 0;
      return {
        "resources.gold": 100 + goldBonus,
        "relics.stonebinders_codex": true,
        "story.seen.hiddenLibraryExplored": true,
      };
    },
    cooldown: 1,
  },

  exploreUndergroundLake: {
    id: "exploreUndergroundLake",
    label: "Underground Lake",
    show_when: {
      "story.seen.undergroundLakeDiscovered": true,
      "story.seen.undergroundLakeExplored": false,
    },
    cost: {
      "resources.food": 2500,
      "resources.wood": 5000,
      "resources.iron": 500,
    },
    effects: (state: GameState) => {
      const goldBonus = state.BTP === 1 ? 100 : 0;
      return {
        "resources.silver": 500,
        "resources.gold": 100 + goldBonus,
        "resources.obsidian": 150,
        "resources.adamant": 100,
        "resources.moonstone": 25,
        "story.seen.undergroundLakeExplored": true,
      };
    },
    cooldown: 1,
  },

  lureLakeCreature: {
    id: "lureLakeCreature",
    label: "Place Trap",
    show_when: {
      "story.seen.undergroundLakeCreatureDiscovered": true,
      "story.seen.lakeCreatureLured": false,
    },
    cost: {
      "resources.food": 10000,
      "resources.wood": 5000,
      "resources.steel": 1000,
    },
    effects: {
      "story.seen.lakeCreatureLured": true,
    },
    cooldown: 1,
  },

  blastPortal: {
    id: "blastPortal",
    label: "Blast Portal",
    show_when: {
      "story.seen.portalDiscovered": true,
      "story.seen.portalBlasted": false,
    },
    cost: {
      "resources.ember_bomb": 10,
    },
    effects: {
      "resources.ember_bomb": -10,
      "story.seen.portalBlasted": true,
    },
    cooldown: 1,
  },

  encounterBeyondPortal: {
    id: "encounterBeyondPortal",
    label: "Venture beyond Portal",
    show_when: {
      "story.seen.sixthWaveVictory": true,
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

export function handleChopWood(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("chopWood", state);

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
  if (!state.story.seen.firstWoodGathered) {
    result.logEntries!.push({
      id: `first-wood-gather-${Date.now()}`,
      message:
        "Some wood lies scattered near the cave's entrance. It might prove useful.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleExploreCave(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("exploreCave", state);

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

  // Process triggered events (cave choice events)
  processTriggeredEvents(effectUpdates, result, state);

  // Add a special log message for first time exploring the cave
  if (!state.story.seen.caveExplored) {
    result.logEntries!.push({
      id: `explore-cave-${Date.now()}`,
      message:
        "The torchlight illuminates the cave walls. In the flickering light, you notice a path leading deeper into the caves.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleVentureDeeper(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("ventureDeeper", state);

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

  // Process triggered events (cave choice events)
  processTriggeredEvents(effectUpdates, result, state);

  // Add a special log message for venturing deeper
  if (!state.story.seen.venturedDeeper) {
    result.logEntries!.push({
      id: `venture-deeper-${Date.now()}`,
      message:
        "The air grows colder as you descend the path deeper into the cave. The walls around you seem unnaturally smooth, as if shaped by someone.",
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

  // Process triggered events (cave choice events)
  processTriggeredEvents(effectUpdates, result, state);

  // Add a special log message for descending further
  if (!state.story.seen.descendedFurther) {
    result.logEntries!.push({
      id: `descend-further-${Date.now()}`,
      message:
        "With the lantern casting a steady glow, you descend even deeper. Suddenly your feet touch manmade stone steps, worn by time.",
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

  // Process triggered events (cave choice events)
  processTriggeredEvents(effectUpdates, result, state);

  // Add a special log message for exploring ruins
  if (!state.story.seen.exploredRuins) {
    result.logEntries!.push({
      id: `explore-ruins-${Date.now()}`,
      message:
        "At the end of the stairs, a vast cavern opens before you. In the dark lie the ruins of a lost city, the remains of a civilization long gone.",
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

  // Process triggered events (cave choice events)
  processTriggeredEvents(effectUpdates, result, state);

  // Add a special log message for exploring temple
  if (!state.story.seen.exploredTemple) {
    result.logEntries!.push({
      id: `explore-temple-${Date.now()}`,
      message:
        "As you delve deeper into the ruins of the underground city, a grand temple emerges from the cavern floor, mostly intact, its shadow stretching over the forgotten remnants of the city.",
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

  // Process triggered events (cave choice events)
  processTriggeredEvents(effectUpdates, result, state);

  // Add a special log message for exploring citadel
  if (!state.story.seen.exploredCitadel) {
    result.logEntries!.push({
      id: `explore-citadel-${Date.now()}`,
      message:
        "At the deepest part of the city, a massive citadel rises before you. Its size suggests it houses something of great power, or something of great danger.",
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

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleExploreUndergroundLake(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("exploreUndergroundLake", state);

  result.logEntries!.push({
    id: `underground-lake-explored-${Date.now()}`,
    message:
      "Using the skull lantern's grim glow, you descend to the underground lake and build a small boat. On a tiny island in the middle of the dark lake, forgotten treasures lie in shadow, untouched for ages.",
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

export function handleLureLakeCreature(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("lureLakeCreature", state);

  result.logEntries!.push({
    id: `lake-creature-lured-${Date.now()}`,
    message:
      "You set a massive trap at the edge of the underground lake, baited with piles of meat. Hours pass before the black waters erupt, and a titanic, tentacled horror rises from the depths and crawls into the trap.",
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

export function handleHiddenLibrary(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("hiddenLibrary", state);

  result.logEntries!.push({
    id: `hidden-library-explored-${Date.now()}`,
    message:
      "The monastery's map leads you deep into the cave to the hidden library where you find a codex.",
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
