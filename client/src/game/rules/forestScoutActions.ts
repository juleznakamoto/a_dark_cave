import { Action, GameState } from "@shared/schema";
import { ActionResult } from "@/game/actions";
import { applyActionEffects } from "./actionEffects";
import { addFreeVillagersWithinCap, killVillagers } from "@/game/stateHelpers";
import { calculateSuccessChance, gameEvents, LogEntry } from "./events";
import { logger } from "@/lib/logger";
import { ActionEffectUpdates } from "@/game/types";
import { CRUEL_MODE, cruelModeScale } from "../cruelMode";

// Helper function to process triggered events from action effects
function processTriggeredEvents(
  effectUpdates: ActionEffectUpdates,
  result: ActionResult,
  state: GameState,
): void {
  if (
    effectUpdates.triggeredEvents &&
    effectUpdates.triggeredEvents.length > 0
  ) {
    logger.log(
      `[FOREST SCOUT] Processing triggered events:`,
      effectUpdates.triggeredEvents,
    );

    effectUpdates.triggeredEvents.forEach((eventId: string) => {
      // Prevent event from happening again if it's already been triggered
      if (state.triggeredEvents?.[eventId]) {
        logger.log(
          `[FOREST SCOUT] Skipping already triggered event: ${eventId}`,
        );
        return;
      }

      const eventDef = gameEvents[eventId];
      if (eventDef) {
        logger.log(`[FOREST SCOUT] Found event definition for: ${eventId}`, {
          title: eventDef.title,
          hasChoices: !!eventDef.choices,
        });

        // Mark as triggered in state updates
        if (!effectUpdates.triggeredEventsState)
          effectUpdates.triggeredEventsState = {};
        effectUpdates.triggeredEventsState[eventId] = true;

        // Create a log entry for the event
        const eventChoices =
          typeof eventDef.choices === "function" ? undefined : eventDef.choices;
        const logEntry: LogEntry = {
          id: `${eventId}-${Date.now()}`,
          message:
            typeof eventDef.message === "string"
              ? eventDef.message
              : Array.isArray(eventDef.message)
                ? eventDef.message[0]
                : "",
          timestamp: Date.now(),
          type: "event",
          title: eventDef.title,
          choices: eventChoices,
          isTimedChoice: eventDef.isTimedChoice,
          baseDecisionTime: eventDef.baseDecisionTime,
          fallbackChoice: eventDef.fallbackChoice,
          relevant_stats: eventDef.relevant_stats,
          skipEventLog: eventChoices && eventChoices.length > 0, // Don't log events with choices - only show in dialog
        };

        result.logEntries!.push(logEntry);
      } else {
        logger.warn(`[FOREST SCOUT] No event definition found for: ${eventId}`);
      }
    });

    // Merge triggered events state into main state updates
    if (effectUpdates.triggeredEventsState) {
      effectUpdates.triggeredEvents = {
        ...(state.triggeredEvents || {}),
        ...effectUpdates.triggeredEventsState,
      };
      delete effectUpdates.triggeredEventsState;
    } else {
      delete effectUpdates.triggeredEvents;
    }
  }
}

export const forestScoutActions: Record<string, Action> = {
  hunt: {
    id: "hunt",
    label: "Hunt",
    minVillagers: 0,
    show_when: {
      "flags.forestUnlocked": true,
    },
    cost: {},
    effects: (state: GameState) => {
      const isBTP = state.BTP === 1;
      return {
        "resources.food": isBTP ? "random(6,14)" : "random(6,12)",
        "resources.fur": isBTP ? "random(3,6)" : "random(2,5)",
        "resources.bones": isBTP ? "random(3,6)" : "random(2,5)",
        "story.seen.hasHunted": true,
        "tools.blacksmith_hammer": {
          probability: (state: any) => {
            const stoneHuts = state.buildings.stoneHut || 0;
            let prob =
              CRUEL_MODE.forestScout.huntBlacksmithHammerProb.base +
              stoneHuts *
              CRUEL_MODE.forestScout.huntBlacksmithHammerProb.perStoneHut -
              cruelModeScale(state) *
              CRUEL_MODE.forestScout.huntBlacksmithHammerProb.whenCruel;
            return prob;
          },
          value: true,
          condition:
            "!tools.blacksmith_hammer && !story.seen.blacksmithHammerChoice",
          logMessage: "",
          isChoice: true,
          eventId: "blacksmithHammerChoice",
        },
        "clothing.red_mask": {
          probability: (state: any) => {
            const stoneHuts = state.buildings.stoneHut || 0;
            let prob =
              CRUEL_MODE.forestScout.huntRedMaskProb.base +
              stoneHuts * CRUEL_MODE.forestScout.huntRedMaskProb.perStoneHut -
              cruelModeScale(state) *
              CRUEL_MODE.forestScout.huntRedMaskProb.whenCruel;
            return prob;
          },
          value: true,
          condition: "!clothing.red_mask && !story.seen.redMaskChoice",
          logMessage: "",
          isChoice: true,
          eventId: "redMaskChoice",
        },
        "story.seen.mapFragmentHuntFound": {
          probability: (state: any) => {
            const stoneHuts = state.buildings.stoneHut || 0;
            return (
              CRUEL_MODE.forestScout.huntMapFragmentProb.base +
              stoneHuts *
              CRUEL_MODE.forestScout.huntMapFragmentProb.perStoneHut +
              cruelModeScale(state) *
              CRUEL_MODE.forestScout.huntMapFragmentProb.whenCruel
            );
          },
          value: true,
          condition:
            "!story.seen.mapFragmentHuntFound && !story.seen.swampMapAssembled",
          logMessage:
            "While hunting, something catches your eye in the mud. A water-stained scrap, perhaps part of a map.",
        },
      };
    },
    executionTime: 8,
    cooldown: 0,
  },

  layTrap: {
    id: "layTrap",
    label: "Lay Trap",
    minVillagers: 0,
    show_when: {
      "tools.giant_trap": true,
      "clothing.black_bear_fur": false,
    },
    cost: {
      "resources.food": 500,
    },
    effects: {
      "story.seen.trapLaid": true,
    },
    success_chance: (state: GameState) => {
      return calculateSuccessChance(state, 0.2, {
        type: "luck",
        multiplier: 0.01,
      });
    },
    relevant_stats: ["luck"],
    executionTime: 30,
    cooldown: 0,
  },

  castleRuins: {
    id: "castleRuins",
    label: "Castle Ruins",
    minVillagers: 6,
    expeditionVillagersRequired: (state: GameState) =>
      CRUEL_MODE.forestExpedition.castleRuins.base +
      cruelModeScale(state) * CRUEL_MODE.forestExpedition.castleRuins.whenCruel,
    show_when: {
      "story.seen.wizardNecromancerCastle": true,
      "!story.seen.castleRuinsExplored": true,
    },
    cost: {
      "resources.food": 2500,
    },
    effects: {},
    success_chance: (state: GameState) => {
      return calculateSuccessChance(
        state,
        0.2,
        { type: "strength", multiplier: 0.005 },
        { type: "knowledge", multiplier: 0.005 },
      );
    },
    relevant_stats: ["strength", "knowledge"],
    executionTime: 30,
    cooldown: 0,
  },

  hillGrave: {
    id: "hillGrave",
    label: "Hill Grave",
    minVillagers: 6,
    expeditionVillagersRequired: (state: GameState) =>
      CRUEL_MODE.forestExpedition.hillGrave.base +
      cruelModeScale(state) * CRUEL_MODE.forestExpedition.hillGrave.whenCruel,
    show_when: {
      "story.seen.wizardHillGrave": true,
      "!story.seen.hillGraveExplored": true,
    },
    cost: {
      "resources.food": 5000,
    },
    effects: {},
    success_chance: (state: GameState) => {
      return calculateSuccessChance(
        state,
        0.1,
        { type: "strength", multiplier: 0.005 },
        { type: "knowledge", multiplier: 0.005 },
      );
    },
    relevant_stats: ["strength", "knowledge"],
    executionTime: 45,
    cooldown: 0,
  },

  sunkenTemple: {
    id: "sunkenTemple",
    label: "Sunken Temple",
    minVillagers: 6,
    expeditionVillagersRequired: (state: GameState) =>
      CRUEL_MODE.forestExpedition.sunkenTemple.base +
      cruelModeScale(state) *
      CRUEL_MODE.forestExpedition.sunkenTemple.whenCruel,
    show_when: {
      "story.seen.wizardBloodstone": true,
      "!story.seen.sunkenTempleExplored": true,
    },
    cost: {
      "resources.food": 5000,
    },
    effects: {
      "events.wizardSaysBloodstoneStaff": true,
    },
    success_chance: (state: GameState) => {
      return calculateSuccessChance(
        state,
        0.0,
        { type: "strength", multiplier: 0.005 },
        { type: "knowledge", multiplier: 0.005 },
      );
    },
    relevant_stats: ["strength", "knowledge"],
    executionTime: 60,
    cooldown: 0,
  },

  swampSanctuary: {
    id: "swampSanctuary",
    label: "Swamp Sanctuary",
    minVillagers: 20,
    expeditionVillagersRequired: (state: GameState) =>
      CRUEL_MODE.forestExpedition.swampSanctuary.base +
      cruelModeScale(state) *
      CRUEL_MODE.forestExpedition.swampSanctuary.whenCruel,
    show_when: {
      "story.seen.swampMapAssembled": true,
      "!story.seen.swampSanctuaryExplored": true,
    },
    cost: {
      "resources.food": 5000,
    },
    effects: {},
    executionTime: 180,
    cooldown: 0,
  },

  collapsedTower: {
    id: "collapsedTower",
    label: "Collapsed Tower",
    minVillagers: 6,
    expeditionVillagersRequired: (state: GameState) =>
      CRUEL_MODE.forestExpedition.collapsedTower.base +
      cruelModeScale(state) *
      CRUEL_MODE.forestExpedition.collapsedTower.whenCruel,
    show_when: {
      "story.seen.collapsedTowerUnlocked": true,
      "!story.seen.collapsedTowerExplored": true,
    },
    cost: {
      "resources.food": 2500,
    },
    effects: {},
    success_chance: (state: GameState) => {
      return calculateSuccessChance(
        state,
        0.15,
        { type: "strength", multiplier: 0.005 },
        { type: "knowledge", multiplier: 0.005 },
      );
    },
    relevant_stats: ["strength", "knowledge"],
    executionTime: 60,
    cooldown: 0,
  },

  forestCave: {
    id: "forestCave",
    label: "Forest Cave",
    minVillagers: 4,
    expeditionVillagersRequired: (state: GameState) =>
      CRUEL_MODE.forestExpedition.forestCave.base +
      cruelModeScale(state) * CRUEL_MODE.forestExpedition.forestCave.whenCruel,
    show_when: {
      "story.seen.forestTribeHelpAccepted": true,
      "!story.seen.forestCaveExplored": true,
    },
    cost: {
      "resources.food": 1000,
    },
    effects: {},
    success_chance: (state: GameState) => {
      return calculateSuccessChance(
        state,
        0.2,
        { type: "strength", multiplier: 0.005 },
        { type: "knowledge", multiplier: 0.005 },
      );
    },
    relevant_stats: ["strength", "knowledge"],
    executionTime: 45,
    cooldown: 0,
  },

  blackreachCanyon: {
    id: "blackreachCanyon",
    label: "Blackreach Canyon",
    minVillagers: 0,
    show_when: {
      "tools.crow_harness": true,
      "buildings.darkEstate": 1,
      "!fellowship.one_eyed_crow": true,
    },
    cost: {
      "resources.food": 7500,
    },
    effects: {},
    executionTime: 60,
    cooldown: 0,
  },

  steelDelivery: {
    id: "steelDelivery",
    label: "Steel Delivery",
    minVillagers: 0,
    show_when: {
      "story.seen.steelDeliveryUnlocked": true,
      "!story.seen.steelDeliveryCompleted": true,
    },
    cost: {
      "resources.steel": 1000,
      "resources.food": 2500,
    },
    effects: {},
    executionTime: 90,
    cooldown: 0,
  },

  risingSmoke: {
    id: "risingSmoke",
    label: "Rising smoke",
    minVillagers: 16,
    expeditionVillagersRequired: (state: GameState) =>
      CRUEL_MODE.forestExpedition.risingSmoke.base +
      cruelModeScale(state) * CRUEL_MODE.forestExpedition.risingSmoke.whenCruel,
    show_when: {
      "story.seen.risingSmokeUnlocked": true,
      "!story.seen.risingSmokeExplored": true,
    },
    cost: {
      "resources.food": 2500,
    },
    effects: {},
    success_chance: (state: GameState) =>
      calculateSuccessChance(
        state,
        0.1,
        { type: "strength", multiplier: 0.0025 },
        { type: "knowledge", multiplier: 0.002 },
      ),
    relevant_stats: ["strength", "knowledge"],
    executionTime: 90,
    cooldown: 0,
  },

  canyonBridge: {
    id: "canyonBridge",
    label: "Canyon Bridge",
    minVillagers: 0,
    show_when: {
      "story.seen.ashwraithCanyonTradeOfferSeen": true,
      "!story.seen.canyonBridgeBuilt": true,
    },
    cost: {
      "resources.stone": 25000,
      "resources.steel": 25000,
      "resources.wood": 10000,
    },
    effects: {},
    executionTime: 300,
    expeditionVillagersRequired: () => 30,
    cooldown: 0,
  },
};

// Action handlers

export function handleHunt(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("hunt", state) as any;

  // Filter out any log entries that are event dialogs (have choices)
  // These should only appear as dialogs, not in the log
  if (result.logEntries) {
    result.logEntries = result.logEntries.filter(
      (entry) => !entry.choices || entry.choices.length === 0,
    );
  }

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

  // Process triggered events (hunt choice events like blacksmithHammer, redMask)
  processTriggeredEvents(effectUpdates, result, state);

  Object.assign(result.stateUpdates, effectUpdates);

  return result;
}

export function handleLayTrap(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("layTrap", state);
  Object.assign(result.stateUpdates, effectUpdates);

  // Get success chance from action definition
  const action = forestScoutActions.layTrap;
  const successChance = action.success_chance
    ? action.success_chance(state)
    : 0;
  const rand = Math.random();

  if (rand < successChance) {
    // Success: Giant bear trapped - now determine combat outcome based on strength
    const strength = state.stats.strength || 0;
    const gbt = CRUEL_MODE.forestScout.giantBearTrap;
    const fightChance =
      gbt.fightChance.base +
      strength * gbt.fightChance.perStrength -
      cruelModeScale(state) * gbt.fightChance.whenCruel;
    const fightRand = Math.random();

    let villagerDeaths: number;

    if (fightRand < fightChance) {
      // Victory with minimal or no casualties
      villagerDeaths = Math.min(
        state.current_population,
        Math.floor(Math.random() * gbt.victoryDeaths.randMax) +
        cruelModeScale(state) * gbt.victoryDeaths.whenCruel,
      );
    } else {
      // Defeat with heavy casualties
      villagerDeaths = Math.min(
        state.current_population,
        Math.floor(Math.random() * gbt.defeatDeaths.randMax) +
        gbt.defeatDeaths.base +
        cruelModeScale(state) * gbt.defeatDeaths.whenCruel,
      );
    }

    const deathResult = killVillagers(state, villagerDeaths);
    const actualDeaths = deathResult.villagersKilled || 0;
    Object.assign(result.stateUpdates, deathResult);
    result.stateUpdates.clothing = {
      ...state.clothing,
      black_bear_fur: true,
    };

    if (actualDeaths === 0) {
      result.logEntries!.push({
        id: `giant-bear-trapped-success-${Date.now()}`,
        message:
          "The giant trap works perfectly! A massive black bear with glowing red eyes is caught. Your villagers slay the supernatural beast and claim its cursed black fur as a trophy.",
        timestamp: Date.now(),
        type: "system",
      });
    } else if (actualDeaths <= 2) {
      result.logEntries!.push({
        id: `giant-bear-trapped-victory-${Date.now()}`,
        message: `The giant trap snares a colossal black bear with burning red eyes! ${actualDeaths} brave villager${actualDeaths > 1 ? "s" : ""} fall${actualDeaths === 1 ? "s" : ""} to its supernatural claws before the beast is finally slain. You claim its cursed black fur as a hard-won trophy.`,
        timestamp: Date.now(),
        type: "system",
      });
    } else {
      result.logEntries!.push({
        id: `giant-bear-trapped-defeat-${Date.now()}`,
        message: `The giant trap snares a colossal black bear with eyes like burning coals. ${actualDeaths} villagers fall to its supernatural fury before the beast is finally overwhelmed. You claim its cursed black fur.`,
        timestamp: Date.now(),
        type: "system",
      });
    }
  } else {
    // Failure: Nothing caught
    result.logEntries!.push({
      id: `giant-trap-failed-${Date.now()}`,
      message:
        "The giant trap is set, but when checked only giant claw marks are found next to it. Whatever prowls these forests is too cunning for your trap... this time.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return result;
}

export function handleCastleRuins(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("castleRuins", state);
  Object.assign(result.stateUpdates, effectUpdates);

  // Get success chance from action definition
  const action = forestScoutActions.castleRuins;
  const successChance = action.success_chance
    ? action.success_chance(state)
    : 0;
  const rand = Math.random();

  if (rand < successChance) {
    // Success: Find ancient scrolls
    result.stateUpdates.relics = {
      ...state.relics,
      ancient_scrolls: true,
    };
    // Set flag only on success
    result.stateUpdates.story = {
      ...state.story,
      seen: {
        ...state.story.seen,
        castleRuinsExplored: true,
      },
    };

    // Food cost already consumed at execution start; only apply rewards here
    const isCompletingExecution =
      (state as any)._completingExecution === "castleRuins";
    result.stateUpdates.resources = {
      ...state.resources,
      silver: (state.resources.silver || 0) + 100,
      gold: (state.resources.gold || 0) + 50,
      ...(isCompletingExecution
        ? {}
        : { food: (state.resources.food || 0) - 2500 }),
    };

    result.logEntries!.push({
      id: `castle-ruins-success-${Date.now()}`,
      message:
        "The expedition to the dead necromancer's castle ruins proves successful! Deep within the you find the ancient scrolls wrapped in dark silk, revealing cryptic knowledge about how to defeat what was locked deep in the cave.",
      timestamp: Date.now(),
      type: "system",
    });
  } else {
    // Failure: Undead attack scenarios
    const failureRand = Math.random();

    const cr = CRUEL_MODE.forestScout.castleRuins;
    if (
      failureRand <
      cr.minorUndeadChance.base -
      cruelModeScale(state) * cr.minorUndeadChance.whenCruel
    ) {
      const villagerDeaths = Math.min(
        state.current_population,
        Math.floor(Math.random() * cr.minorDeaths.randMax) +
        cr.minorDeaths.base +
        cruelModeScale(state) * cr.minorDeaths.whenCruel,
      );
      const deathResult = killVillagers(state, villagerDeaths);
      const actualDeaths = deathResult.villagersKilled || 0;
      Object.assign(result.stateUpdates, deathResult);

      result.logEntries!.push({
        id: `castle-ruins-minor-attack-${Date.now()}`,
        message: `Your expedition is ambushed by grotesque undead experiments left behind by the necromancer. ${actualDeaths} villager${actualDeaths > 1 ? "s" : ""} fall${actualDeaths === 1 ? "s" : ""} to the undead before the survivors manage to retreat.`,
        timestamp: Date.now(),
        type: "system",
      });
    } else {
      const villagerDeaths = Math.min(
        state.current_population,
        Math.floor(Math.random() * cr.majorDeaths.randMax) +
        cr.majorDeaths.base +
        cruelModeScale(state) * cr.majorDeaths.whenCruel,
      );
      const deathResult = killVillagers(state, villagerDeaths);
      const actualDeaths = deathResult.villagersKilled || 0;
      Object.assign(result.stateUpdates, deathResult);

      result.logEntries!.push({
        id: `castle-ruins-major-attack-${Date.now()}`,
        message: `Shortly after your expedition enters the cursed castle ruins dozens of undead creatures pour from hidden chambers. In the desperate battle that follows, ${actualDeaths} villagers are overwhelmed by the supernatural horde. The survivors flee in terror.`,
        timestamp: Date.now(),
        type: "system",
      });
    }
  }

  return result;
}

export function handleHillGrave(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("hillGrave", state);
  Object.assign(result.stateUpdates, effectUpdates);

  // Get success chance from action definition
  const action = forestScoutActions.hillGrave;
  const successChance = action.success_chance
    ? action.success_chance(state)
    : 0;
  const rand = Math.random();

  if (rand < successChance) {
    // Success: Find frostglass
    // Food cost already consumed at execution start; only apply rewards here
    const isCompletingExecution =
      (state as any)._completingExecution === "hillGrave";
    result.stateUpdates.resources = {
      ...state.resources,
      silver: (state.resources.silver || 0) + 200,
      gold: (state.resources.gold || 0) + 100,
      ...(isCompletingExecution
        ? {}
        : { food: (state.resources.food || 0) - 5000 }),
    };

    result.stateUpdates.relics = {
      ...state.relics,
      frostglass: true,
    };

    // Set both flags in a single assignment to avoid overwriting
    result.stateUpdates.story = {
      ...state.story,
      seen: {
        ...state.story.seen,
        hillGraveExplored: true,
      },
    };

    result.logEntries!.push({
      id: `hill-grave-success-${Date.now()}`,
      message:
        "Your expedition carefully navigates the treacherous traps of the hill grave. Your villagers disarm the ancient mechanisms and reach the burial chamber. Among the king's treasures, you discover pure frostglass, cold as the void itself.",
      timestamp: Date.now(),
      type: "system",
    });
  } else {
    const hg = CRUEL_MODE.forestScout.hillGrave.failureDeaths;
    const villagerDeaths = Math.min(
      state.current_population,
      Math.floor(Math.random() * hg.randMax) +
      hg.base +
      cruelModeScale(state) * hg.whenCruel,
    );
    const deathResult = killVillagers(state, villagerDeaths);
    const actualDeaths = deathResult.villagersKilled || 0;
    Object.assign(result.stateUpdates, deathResult);

    result.logEntries!.push({
      id: `hill-grave-failure-${Date.now()}`,
      message: `Your expedition enters the hill grave but lacks the skill to navigate its deadly traps. ${actualDeaths} villagers fall to the king's final defenses before the survivors retreat in horror, leaving their companions' bodies in the cursed tomb.`,
      timestamp: Date.now(),
      type: "system",
    });
  }

  return result;
}

export function handleSunkenTemple(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("sunkenTemple", state);
  Object.assign(result.stateUpdates, effectUpdates);

  // Get success chance from action definition
  const action = forestScoutActions.sunkenTemple;
  const successChance = action.success_chance
    ? action.success_chance(state)
    : 0;
  const rand = Math.random();

  if (rand < successChance) {
    // Success: Find bloodstone
    // Food cost already consumed at execution start; only apply rewards here
    const isCompletingExecution =
      (state as any)._completingExecution === "sunkenTemple";
    result.stateUpdates.resources = {
      ...state.resources,
      silver: (state.resources.silver || 0) + 500,
      gold: (state.resources.gold || 0) + 250,
      ...(isCompletingExecution
        ? {}
        : { food: (state.resources.food || 0) - 5000 }),
    };

    result.stateUpdates.relics = {
      ...state.relics,
      bloodstone: true,
    };

    // Set both flags in a single assignment to avoid overwriting
    result.stateUpdates.story = {
      ...state.story,
      seen: {
        ...state.story.seen,
        sunkenTempleSuccess: true,
        sunkenTempleExplored: true,
      },
    };

    result.logEntries!.push({
      id: `sunken-temple-success-${Date.now()}`,
      message:
        "Your expedition wades through the swamp waters to reach the ancient half-sunken temple. Despite the dangers lurking in the dark waters, the villagers navigate carefully through the submerged halls and find the bloodstone gems in the temple's inner sanctum.",
      timestamp: Date.now(),
      type: "system",
    });
  } else {
    const st = CRUEL_MODE.forestScout.sunkenTemple.failureDeaths;
    const villagerDeaths = Math.min(
      state.current_population,
      Math.floor(Math.random() * st.randMax) +
      st.base +
      cruelModeScale(state) * st.whenCruel,
    );
    const deathResult = killVillagers(state, villagerDeaths);
    const actualDeaths = deathResult.villagersKilled || 0;
    Object.assign(result.stateUpdates, deathResult);

    result.logEntries!.push({
      id: `sunken-temple-failure-${Date.now()}`,
      message: `Your expedition ventures into the swamp, seeking the sunken temple. The murky waters hide unspeakable horrors. Abominable creatures born of ancient magic rise from the depths and drag ${actualDeaths} villagers beneath the surface before the survivors flee.`,
      timestamp: Date.now(),
      type: "system",
    });
  }

  return result;
}

export function handleSwampSanctuary(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("swampSanctuary", state);
  Object.assign(result.stateUpdates, effectUpdates);

  result.stateUpdates.story = {
    ...state.story,
    seen: {
      ...state.story.seen,
      ...result.stateUpdates.story?.seen,
      swampSanctuaryExplored: true,
    },
  };

  const eventDef = gameEvents.swampSanctuaryChoice;
  const eventChoices =
    typeof eventDef.choices === "function"
      ? eventDef.choices(state)
      : eventDef.choices;
  const messageRaw =
    typeof eventDef.message === "function"
      ? eventDef.message(state)
      : Array.isArray(eventDef.message)
        ? eventDef.message[0]
        : eventDef.message;
  const message =
    typeof messageRaw === "string" ? messageRaw : String(messageRaw ?? "");
  const titleRaw =
    typeof eventDef.title === "function"
      ? eventDef.title(state)
      : eventDef.title;
  const title = typeof titleRaw === "string" ? titleRaw : undefined;

  // id prefix must match `gameEvents` key so EventDialog's `event.id.split("-")[0]` resolves
  // the correct definition (e.g. "swamp-sanctuary-…" would wrongly yield eventId "swamp").
  result.logEntries!.push({
    id: `swampSanctuaryChoice-${Date.now()}`,
    message,
    timestamp: Date.now(),
    type: "event",
    title,
    choices: eventChoices ?? [],
    skipEventLog: true,
  });

  return result;
}

export function handlecollapsedTower(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("collapsedTower", state);
  Object.assign(result.stateUpdates, effectUpdates);

  // Get success chance from action definition
  const action = forestScoutActions.collapsedTower;
  const successChance = action.success_chance
    ? action.success_chance(state)
    : 0;
  const rand = Math.random();

  if (rand < successChance) {
    // Success: Discover the necromancer's plot
    // Food cost already consumed at execution start; only apply rewards here
    const isCompletingExecution =
      (state as any)._completingExecution === "collapsedTower";
    result.stateUpdates.resources = {
      ...state.resources,
      silver: (state.resources.silver || 0) + 500,
      gold: (state.resources.gold || 0) + 250,
      ...(isCompletingExecution
        ? {}
        : { food: (state.resources.food || 0) - 2500 }),
    };

    // Give the bone saw tool
    result.stateUpdates.tools = {
      ...state.tools,
      bone_saw: true,
    };

    // Grant the necromancer blood relic
    result.stateUpdates.relics = {
      ...state.relics,
      necromancer_blood: true,
    };

    // Set flag to mark tower as explored
    result.stateUpdates.story = {
      ...state.story,
      seen: {
        ...state.story.seen,
        collapsedTowerExplored: true,
      },
    };

    result.logEntries!.push({
      id: `collapsed-tower-success-${Date.now()}`,
      message:
        "Inside the tower you find a necromancer and his followers, surrounded by vials of liquids and crude syringes. He was harvesting the villagers' blood for dark experiments. Your men put an end to his vile work and take a vial of his blood. Among his tools, you find his powerful bone saw.",
      timestamp: Date.now(),
      type: "system",
    });
  } else {
    const ct = CRUEL_MODE.forestScout.collapsedTower.failureDeaths;
    const villagerDeaths = Math.min(
      state.current_population,
      Math.floor(Math.random() * ct.randMax) +
      ct.base +
      cruelModeScale(state) * ct.whenCruel,
    );
    const deathResult = killVillagers(state, villagerDeaths);
    const actualDeaths = deathResult.villagersKilled || 0;
    Object.assign(result.stateUpdates, deathResult);

    result.logEntries!.push({
      id: `collapsed-tower-minor-failure-${Date.now()}`,
      message: `Your expedition reaches the Collapsed Tower, but you are attacked by hooded figures outside. A tall man in a dark robe stands among them, commanding an aura of menace. ${actualDeaths} villagers fall before the rest flee to safety.`,
      timestamp: Date.now(),
      type: "system",
    });
  }
  return result;
}

export function handleForestCave(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("forestCave", state);
  Object.assign(result.stateUpdates, effectUpdates);

  // Get success chance from action definition
  const action = forestScoutActions.forestCave;
  const successChance = action.success_chance
    ? action.success_chance(state)
    : 0;
  const rand = Math.random();

  if (rand < successChance) {
    // Success: Defeat the hounds
    // Food cost already consumed at execution start; only apply rewards here
    const isCompletingExecution =
      (state as any)._completingExecution === "forestCave";
    result.stateUpdates.resources = {
      ...state.resources,
      silver: (state.resources.silver || 0) + 250,
      gold: (state.resources.gold || 0) + 100,
      fur: (state.resources.fur || 0) + 500,
      ...(isCompletingExecution
        ? {}
        : { food: (state.resources.food || 0) - 1000 }),
    };

    // Set flag to mark cave as explored
    result.stateUpdates.story = {
      ...state.story,
      seen: {
        ...state.story.seen,
        forestCaveExplored: true,
      },
    };

    result.logEntries!.push({
      id: `forest-cave-success-${Date.now()}`,
      message:
        "As the villagers descend the cave, savage hounds erupt from darkness in relentless packs. Screams echo as claws tear and teeth snap. When the last creature falls, all villagers survive, but hollowed by what they’ve endured.",
      timestamp: Date.now(),
      type: "system",
    });
  } else {
    const fc = CRUEL_MODE.forestScout.forestCave.failureDeaths;
    const villagerDeaths = Math.min(
      state.current_population,
      Math.floor(Math.random() * fc.randMax) +
      fc.base +
      cruelModeScale(state) * fc.whenCruel,
    );
    const deathResult = killVillagers(state, villagerDeaths);
    const actualDeaths = deathResult.villagersKilled || 0;
    Object.assign(result.stateUpdates, deathResult);

    result.logEntries!.push({
      id: `forest-cave-failure-${Date.now()}`,
      message: `As the expedition enters the cave it is overwhelmed by a pack of brutal hounds. ${actualDeaths} villagers are torn apart by savage jaws before the survivors manage to retreat.`,
      timestamp: Date.now(),
      type: "system",
    });
  }

  return result;
}

export function handleBlackreachCanyon(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("blackreachCanyon", state);
  Object.assign(result.stateUpdates, effectUpdates);

  // Always succeed - the crow is caught with the harness
  result.stateUpdates.fellowship = {
    ...state.fellowship,
    one_eyed_crow: true,
  };

  // Remove crow harness from tools (consumed in the process)
  result.stateUpdates.tools = {
    ...state.tools,
    crow_harness: false,
  };

  // Food cost already consumed at execution start; skip re-deduction on completion
  const isCompletingExecution =
    (state as any)._completingExecution === "blackreachCanyon";
  if (!isCompletingExecution) {
    result.stateUpdates.resources = {
      ...state.resources,
      food: (state.resources.food || 0) - 7500,
    };
  }

  result.logEntries!.push({
    id: `blackreach-canyon-success-${Date.now()}`,
    message:
      "You venture deep into Blackreach Canyon. There, perched on a stone pillar, sits a magnificent one-eyed crow. Using the harness, your carefully approach and bond with the creature. The One-eyed Crow has joined your fellowship.",
    timestamp: Date.now(),
    type: "system",
  });

  return result;
}

export function handleSteelDelivery(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("steelDelivery", state);
  Object.assign(result.stateUpdates, effectUpdates);

  // Steel and food costs already consumed at execution start; skip re-deduction on completion
  const isCompletingExecution =
    (state as any)._completingExecution === "steelDelivery";
  if (!isCompletingExecution) {
    result.stateUpdates.resources = {
      ...state.resources,
      steel: (state.resources.steel || 0) - 1000,
    };
  }

  // Grant the Chitin Plates relic
  result.stateUpdates.relics = {
    ...state.relics,
    chitin_plates: true,
  };

  // Mark as completed
  result.stateUpdates.story = {
    ...state.story,
    seen: {
      ...state.story.seen,
      steelDeliveryCompleted: true,
    },
  };

  result.logEntries!.push({
    id: `steel-delivery-success-${Date.now()}`,
    message:
      "Your caravan delivers the steel to the Swamp Tribe as promised. In return, the tribe presents you with Chitin Plates harvested from swamp creatures. These can be used to construct powerful fortifications.",
    timestamp: Date.now(),
    type: "system",
  });

  return result;
}

export function handleRisingSmoke(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("risingSmoke", state);
  Object.assign(result.stateUpdates, effectUpdates);

  const action = forestScoutActions.risingSmoke;
  const successChance = action.success_chance
    ? action.success_chance(state)
    : 0;

  if (Math.random() < successChance) {
    const isCompletingExecution =
      (state as any)._completingExecution === "risingSmoke";
    let goldGain = 500;
    if (state.tools.skeleton_key) {
      goldGain += 250;
    }

    const { added, patch: captivePatch } = addFreeVillagersWithinCap(state, 20);

    Object.assign(result.stateUpdates, captivePatch);

    result.stateUpdates.resources = {
      ...state.resources,
      gold: (state.resources.gold || 0) + goldGain,
      ...(isCompletingExecution
        ? {}
        : { food: (state.resources.food || 0) - 2500 }),
    };

    result.stateUpdates.story = {
      ...state.story,
      seen: {
        ...state.story.seen,
        ...captivePatch.story?.seen,
        risingSmokeExplored: true,
      },
    };

    const keyPart = state.tools.skeleton_key
      ? " With your skeleton key you open a hidden compartment and find another 250 Gold."
      : "";
    const captivePart =
      added > 0
        ? added === 1
          ? " 1 captive from the camp chooses to join the village."
          : ` ${added} captives from the camp choose to join the village.`
        : "";

    result.logEntries!.push({
      id: `rising-smoke-success-${Date.now()}`,
      message: `Your expedition finds an outlaw camp. The fight is brutal, but you win. In a chest you find 500 Gold.${keyPart}${captivePart}`,
      timestamp: Date.now(),
      type: "system",
    });
  } else {
    const rs = CRUEL_MODE.forestScout.risingSmoke.failureDeaths;
    const villagerDeaths = Math.min(
      state.current_population,
      Math.floor(Math.random() * rs.randMax) +
      rs.base +
      cruelModeScale(state) * rs.whenCruel,
    );
    const deathResult = killVillagers(state, villagerDeaths);
    const actualDeaths = deathResult.villagersKilled || 0;
    Object.assign(result.stateUpdates, deathResult);

    result.logEntries!.push({
      id: `rising-smoke-failure-${Date.now()}`,
      message: `Your expedition reaches an outlaw camp, but the fight goes terribly wrong. ${actualDeaths} villager${actualDeaths === 1 ? "" : "s"} fall${actualDeaths === 1 ? "s" : ""} before the survivors flee back to the village.`,
      timestamp: Date.now(),
      type: "system",
    });
  }

  return result;
}

export function handleCanyonBridge(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("canyonBridge", state);
  Object.assign(result.stateUpdates, effectUpdates);

  result.stateUpdates.story = {
    ...state.story,
    seen: {
      ...state.story.seen,
      canyonBridgeBuilt: true,
    },
  };

  result.logEntries!.push({
    id: `canyon-bridge-complete-${Date.now()}`,
    message:
      "The canyon bridge stands complete. Ashwraith traders can now reach your settlement—and you can sell goods to them at agreed rates.",
    timestamp: Date.now(),
    type: "system",
  });

  return result;
}
