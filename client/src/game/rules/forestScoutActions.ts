import { Action, GameState } from "@shared/schema";
import { ActionResult } from "@/game/actions";
import { applyActionEffects } from "@/game/rules";
import { killVillagers } from "@/game/stateHelpers";
import { calculateSuccessChance } from "./events";

export const forestScoutActions: Record<string, Action> = {
  hunt: {
    id: "hunt",
    label: "Hunt",
    show_when: {
      "flags.forestUnlocked": true,
    },
    cost: {},
    effects: {
      "resources.food": "random(5,10)",
      "resources.fur": "random(2,5)",
      "resources.bones": "random(2,5)",
      "story.seen.hasHunted": true,
      "tools.blacksmith_hammer": {
        probability: (state: any) => {
          const stoneHuts = state.buildings.stoneHut || 0;
          let prob = 0.0075 + stoneHuts * 0.01 - state.CM * 0.005; // Base 0.75% + 1% per stone hut
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
          let prob = 0.005 + stoneHuts * 0.01 - state.CM * 0.0025; // Base 0.5% + 1% per stone hut
          return prob;
        },
        value: true,
        condition: "!clothing.red_mask && !story.seen.redMaskChoice",
        logMessage: "",
        isChoice: true,
        eventId: "redMaskChoice",
      },
    },
    cooldown: 10,
  },

  layTrap: {
    id: "layTrap",
    label: "Lay Trap",
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
    relevant_stats: ["strength", "luck"],
    cooldown: 30,
  },

  castleRuins: {
    id: "castleRuins",
    label: "Castle Ruins",
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
    cooldown: 45,
  },

  hillGrave: {
    id: "hillGrave",
    label: "Hill Grave",
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
    cooldown: 45,
  },

  sunkenTemple: {
    id: "sunkenTemple",
    label: "Sunken Temple",
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
    cooldown: 45,
  },

  damagedTower: {
    id: "damagedTower",
    label: "Damaged Tower",
    show_when: {
      "story.seen.damagedTowerUnlocked": true,
      "!story.seen.damagedTowerExplored": true,
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
    cooldown: 90,
  },
};

// Action handlers

export function handleHunt(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("hunt", state);

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
    const fightChance = 0.1 + strength * 0.02 - state.CM * 0.05; // 10% base + 2% per strength point
    const fightRand = Math.random();

    let villagerDeaths: number;

    if (fightRand < fightChance) {
      // Victory with minimal or no casualties (0-2 deaths)
      villagerDeaths = Math.min(state.current_population, Math.floor(Math.random() * 3) + state.CM * 1); // 0-2 deaths
    } else {
      // Defeat with heavy casualties (3-6 deaths)
      villagerDeaths = Math.min(state.current_population, Math.floor(Math.random() * 4) + 3 + state.CM * 2); // 3-6 deaths
    }

    const deathResult = killVillagers(state, villagerDeaths);
    Object.assign(result.stateUpdates, deathResult);
    result.stateUpdates.clothing = {
      ...state.clothing,
      black_bear_fur: true,
    };

    if (villagerDeaths === 0) {
      result.logEntries!.push({
        id: `giant-bear-trapped-success-${Date.now()}`,
        message:
          "The giant trap works perfectly! A massive black bear with glowing red eyes is caught. Your villagers slay the supernatural beast and claim its cursed black fur as a trophy.",
        timestamp: Date.now(),
        type: "system",
        visualEffect: {
          type: "glow",
          duration: 3,
        },
      });
    } else if (villagerDeaths <= 2) {
      result.logEntries!.push({
        id: `giant-bear-trapped-victory-${Date.now()}`,
        message: `The giant trap snares a colossal black bear with burning red eyes! ${villagerDeaths} brave villager${villagerDeaths > 1 ? "s" : ""} fall${villagerDeaths === 1 ? "s" : ""} to its supernatural claws before the beast is finally slain. You claim its cursed black fur as a hard-won trophy.`,
        timestamp: Date.now(),
        type: "system",
        visualEffect: {
          type: "glow",
          duration: 3,
        },
      });
    } else {
      result.logEntries!.push({
        id: `giant-bear-trapped-defeat-${Date.now()}`,
        message: `The giant trap snares a colossal black bear with eyes like burning coals. ${villagerDeaths} villagers fall to its supernatural fury before the beast is finally overwhelmed. You claim its cursed black fur.`,
        timestamp: Date.now(),
        type: "system",
        visualEffect: {
          type: "glow",
          duration: 3,
        },
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
      visualEffect: {
        type: "glow",
        duration: 3,
      },
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

    result.stateUpdates.resources = {
      ...state.resources,
      silver: (state.resources.silver || 0) + 100,
      gold: (state.resources.gold || 0) + 50,
      food: (state.resources.food || 0) - 2500,
    };

    result.logEntries!.push({
      id: `castle-ruins-success-${Date.now()}`,
      message:
        "The expedition to the dead necromancer's castle ruins proves successful! Deep within the you find the ancient scrolls wrapped in dark silk, revealing cryptic knowledge about how to defeat what was locked deep in the cave.",
      timestamp: Date.now(),
      type: "system",
      visualEffect: {
        type: "glow",
        duration: 3,
      },
    });
  } else {
    // Failure: Undead attack scenarios
    const failureRand = Math.random();

    if (failureRand < 0.5 - state.CM * 0.1) {
      const villagerDeaths = Math.min(state.current_population, Math.floor(Math.random() * 4) + 1 + state.CM * 2);
      const deathResult = killVillagers(state, villagerDeaths);
      Object.assign(result.stateUpdates, deathResult);

      result.logEntries!.push({
        id: `castle-ruins-minor-attack-${Date.now()}`,
        message: `Your expedition is ambushed by grotesque undead experiments left behind by the necromancer. ${villagerDeaths} villager${villagerDeaths > 1 ? "s" : ""} fall${villagerDeaths === 1 ? "s" : ""} to the undead before the survivors manage to retreat.`,
        timestamp: Date.now(),
        type: "system",
        visualEffect: {
          type: "glow",
          duration: 3,
        },
      });
    } else {
      const villagerDeaths = Math.min(state.current_population, Math.floor(Math.random() * 8) + 2 + state.CM * 4);
      const deathResult = killVillagers(state, villagerDeaths);
      Object.assign(result.stateUpdates, deathResult);

      result.logEntries!.push({
        id: `castle-ruins-major-attack-${Date.now()}`,
        message: `Shortly after your expedition enters the cursed castle ruins dozens of undead creatures pour from hidden chambers. In the desperate battle that follows, ${villagerDeaths} villagers are overwhelmed by the supernatural horde. The survivors flee in terror.`,
        timestamp: Date.now(),
        type: "system",
        visualEffect: {
          type: "glow",
          duration: 3,
        },
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
    result.stateUpdates.resources = {
      ...state.resources,
      silver: (state.resources.silver || 0) + 200,
      gold: (state.resources.gold || 0) + 100,
      food: (state.resources.food || 0) - 5000,
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
      visualEffect: {
        type: "glow",
        duration: 3,
      },
    });
  } else {
    const villagerDeaths = Math.min(state.current_population, Math.floor(Math.random() * 10) + 3 + state.CM * 4);
    const deathResult = killVillagers(state, villagerDeaths);
    Object.assign(result.stateUpdates, deathResult);

    result.logEntries!.push({
      id: `hill-grave-failure-${Date.now()}`,
      message: `Your expedition enters the hill grave but lacks the skill to navigate its deadly traps. ${villagerDeaths} villagers fall to the king's final defenses before the survivors retreat in horror, leaving their companions' bodies in the cursed tomb.`,
      timestamp: Date.now(),
      type: "system",
      visualEffect: {
        type: "glow",
        duration: 3,
      },
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
    // Deduct cost and add rewards
    result.stateUpdates.resources = {
      ...state.resources,
      silver: (state.resources.silver || 0) + 300,
      gold: (state.resources.gold || 0) + 150,
      food: (state.resources.food || 0) - 5000,
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
        "Your expedition wades through the swamp waters to reach the ancient half-sunken temple. Despite the dangers lurking in the dark waters, your villagers navigate carefully through the submerged halls and find the bloodstone gems in the temple's inner sanctum.",
      timestamp: Date.now(),
      type: "system",
      visualEffect: {
        type: "glow",
        duration: 3,
      },
    });
  } else {
    const villagerDeaths = Math.min(state.current_population, Math.floor(Math.random() * 12) + 4 + state.CM * 4);
    const deathResult = killVillagers(state, villagerDeaths);
    Object.assign(result.stateUpdates, deathResult);

    result.logEntries!.push({
      id: `sunken-temple-failure-${Date.now()}`,
      message: `Your expedition ventures into the swamp, seeking the sunken temple. The murky waters hide unspeakable horrors. Abominable creatures born of ancient magic rise from the depths and drag ${villagerDeaths} villagers beneath the surface before the survivors flee.`,
      timestamp: Date.now(),
      type: "system",
      visualEffect: {
        type: "glow",
        duration: 3,
      },
    });
  }

  return result;
}

export function handleDamagedTower(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("damagedTower", state);
  Object.assign(result.stateUpdates, effectUpdates);

  // Get success chance from action definition
  const action = forestScoutActions.damagedTower;
  const successChance = action.success_chance
    ? action.success_chance(state)
    : 0;
  const rand = Math.random();

  if (rand < successChance) {
    // Success: Discover the necromancer's plot
    result.stateUpdates.resources = {
      ...state.resources,
      silver: (state.resources.silver || 0) + 200,
      gold: (state.resources.gold || 0) + 100,
      food: (state.resources.food || 0) - 2500,
    };

    // Set flag to mark tower as explored
    result.stateUpdates.story = {
      ...state.story,
      seen: {
        ...state.story.seen,
        damagedTowerExplored: true,
      },
    };

    result.logEntries!.push({
      id: `damaged-tower-success-${Date.now()}`,
      message:
        "Inside the tower you find a necromancer and his followers, surrounded by vials of blood and crude syringes. He was harvesting the villagers' blood for dark experiments. Your men put an end to his vile work. The mysterious deaths will cease.",
      timestamp: Date.now(),
      type: "system",
      visualEffect: {
        type: "glow",
        duration: 3,
      },
    });
  } else {
    const villagerDeaths = Math.min(state.current_population, Math.floor(Math.random() * 8) + 2 + state.CM * 4);
    const deathResult = killVillagers(state, villagerDeaths);
    Object.assign(result.stateUpdates, deathResult);

    result.logEntries!.push({
      id: `damaged-tower-minor-failure-${Date.now()}`,
      message: `Your expedition reaches the damaged tower, but you are attacked by hooded figures outside. A tall man in a dark robe stands among them, commanding an aura of menace. ${villagerDeaths} villagers fall before the rest flee to safety.`,
      timestamp: Date.now(),
      type: "system",
      visualEffect: {
        type: "glow",
        duration: 3,
      },
    });
  }
  return result;
}
