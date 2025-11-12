import { Action, GameState } from "@shared/schema";
import { ActionResult } from "@/game/actions";
import { applyActionEffects } from "./index";

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

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

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
          let prob = 0.0075 + stoneHuts * 0.01; // Base 0.75% + 1% per stone hut
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
          let prob = 0.005 + stoneHuts * 0.01; // Base 0.5% + 1% per stone hut
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
    cooldown: 20,
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
    cooldown: 45,
  },

  gatherWood: {
    id: "gatherWood",
    label: "Chop Wood",
    show_when: {
      "flags.forestUnlocked": true,
    },
    cost: {
      "resources.food": 100,
    },
    effects: {
      "resources.wood": "random(50, 150)",
      "resources.food": -50,
      "story.seen.hasChoppedWood": true,
    },
    cooldown: 10,
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

  // Calculate success based on luck
  const luck = getTotalLuck(state);
  const successChance = 0.25 + luck * 0.01;
  const rand = Math.random();

  if (rand < successChance) {
    // Success: Giant bear trapped - now determine combat outcome based on strength
    const strength = state.stats.strength || 0;
    const fightChance = 0.1 + strength * 0.02; // 10% base + 2% per strength point
    const fightRand = Math.random();

    let villagerDeaths: number;

    if (fightRand < fightChance) {
      // Victory with minimal or no casualties (0-2 deaths)
      villagerDeaths = Math.floor(Math.random() * 3); // 0-2 deaths
    } else {
      // Defeat with heavy casualties (3-6 deaths)
      villagerDeaths = Math.floor(Math.random() * 4) + 3; // 3-6 deaths
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

  // Calculate success based on strength and knowledge
  const strength = getTotalStrength(state);
  const knowledge = getTotalKnowledge(state);
  const successChance = 0.1 + ((strength + knowledge) / 2) * 0.01; // 10% base + (strength + knowledge)/2%

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
      gold: (state.resources.gold || 0) + 200,
    };

    result.logEntries!.push({
      id: `castle-ruins-success-${Date.now()}`,
      message:
        "The expedition to the necromancer's castle ruins proves successful! Deep within the you find the ancient scrolls wrapped in dark silk, revealing cryptic knowledge about how to defeat what was locked deep in the cave.",
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

    if (failureRand < 0.5) {
      // Scenario 1: Minor undead attack (1-4 deaths)
      const villagerDeaths = Math.floor(Math.random() * 4) + 1; // 1-4 deaths
      const deathResult = killVillagers(state, villagerDeaths);
      Object.assign(result.stateUpdates, deathResult);

      result.logEntries!.push({
        id: `castle-ruins-minor-attack-${Date.now()}`,
        message: `Your expedition is ambushed by shambling undead grotesque experiments left behind by the necromancer. ${villagerDeaths} villager${villagerDeaths > 1 ? "s" : ""} fall${villagerDeaths === 1 ? "s" : ""} to the undead horde before the survivors manage to retreat to safety.`,
        timestamp: Date.now(),
        type: "system",
        visualEffect: {
          type: "glow",
          duration: 3,
        },
      });
    } else {
      // Scenario 2: Major undead attack (5-10 deaths)
      const villagerDeaths = Math.floor(Math.random() * 6) + 5; // 5-10 deaths
      const deathResult = killVillagers(state, villagerDeaths);
      Object.assign(result.stateUpdates, deathResult);

      result.logEntries!.push({
        id: `castle-ruins-major-attack-${Date.now()}`,
        message: `Shortly after your expedition enters the cursed castle ruins the very stones awaken with malevolent energy as dozens of undead creatures pour from hidden chambers - failed experiments of the mad necromancer, twisted into monstrous forms. In the desperate battle that follows, ${villagerDeaths} brave villagers are overwhelmed by the supernatural horde. The survivors flee in terror, carrying only tales of horror.`,
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

  // Calculate success based on strength and knowledge
  const strength = getTotalStrength(state);
  const knowledge = getTotalKnowledge(state);
  const successChance = 0.15 + ((strength + knowledge) / 2) * 0.01; // 15% base + (strength + knowledge)/2%
  const rand = Math.random();

  if (rand < successChance) {
    // Success: Find frostglass
    result.stateUpdates.resources = {
      ...state.resources,
      silver: (state.resources.silver || 0) + 150,
      gold: (state.resources.gold || 0) + 250,
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
        "Your expedition carefully navigates the treacherous traps of the hill grave. Through skill and knowledge, your villagers disarm the ancient mechanisms and reach the burial chamber. Among the king's treasures, you discover weapons forged of pure frostglass, cold as the void itself.",
      timestamp: Date.now(),
      type: "system",
      visualEffect: {
        type: "glow",
        duration: 3,
      },
    });
  } else {
    // Failure: Villagers die to traps (5-15 deaths)
    const villagerDeaths = Math.floor(Math.random() * 11) + 5; // 5-15 deaths
    const deathResult = killVillagers(state, villagerDeaths);
    Object.assign(result.stateUpdates, deathResult);

    result.logEntries!.push({
      id: `hill-grave-failure-${Date.now()}`,
      message: `Your expedition enters the hill grave but lacks the skill to navigate its deadly traps. Poisoned arrows fly from hidden slots, floors collapse into spike pits, and ancient mechanisms crush those who trigger them. ${villagerDeaths} villagers fall to the king's final defenses before the survivors retreat in horror, leaving their companions' bodies in the cursed tomb.`,
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

  // Calculate success based on strength and knowledge
  const strength = getTotalStrength(state);
  const knowledge = getTotalKnowledge(state);
  const successChance = 0.1 + ((strength + knowledge) / 2) * 0.01; // 10% base + (strength + knowledge)/2%
  const rand = Math.random();

  if (rand < successChance) {
    // Success: Find bloodstone
    result.stateUpdates.resources = {
      ...state.resources,
      gold: (state.resources.gold || 0) + 300,
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
        "Your expedition wades through the fetid swamp waters to reach the ancient temple, half-sunken in the murky depths. Despite the dangers lurking in the dark waters, your villagers navigate carefully through the submerged halls. In the temple's inner sanctum, you discover a cache of bloodstone gems, pulsing with a deep crimson glow.",
      timestamp: Date.now(),
      type: "system",
      visualEffect: {
        type: "glow",
        duration: 3,
      },
    });
  } else {
    // Failure: Villagers die to swamp creatures (5-15 deaths)
    const villagerDeaths = Math.floor(Math.random() * 11) + 5; // 5-15 deaths
    const deathResult = killVillagers(state, villagerDeaths);
    Object.assign(result.stateUpdates, deathResult);

    result.logEntries!.push({
      id: `sunken-temple-failure-${Date.now()}`,
      message: `Your expedition ventures into the swamp, seeking the sunken temple. The murky waters hide unspeakable horrors - twisted creatures born of ancient magic and decay rise from the depths. ${villagerDeaths} villagers are dragged beneath the surface by grasping tendrils and fanged maws before the survivors flee in terror, their screams echoing across the swamp.`,
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

// Add the new wizard event and weapon craft action
export const additionalActions: Record<string, Action> = {
  wizardSaysBloodstoneStaff: {
    id: "wizardSaysBloodstoneStaff",
    label: "Wizard says: 'No, we can craft the Bloodstone Staff!'",
    show_when: {
      "story.seen.sunkenTempleExplored": true,
      "!story.seen.wizardSaidBloodstoneStaff": true,
    },
    cost: {},
    effects: {
      "story.seen.wizardSaidBloodstoneStaff": true,
    },
    cooldown: 0,
  },
  craftBloodstoneStaff: {
    id: "craftBloodstoneStaff",
    label: "Craft Bloodstone Staff",
    show_when: {
      "story.seen.wizardSaidBloodstoneStaff": true,
      "resources.bloodstone": ">= 50",
      "resources.wood": ">= 1000",
    },
    cost: {
      "resources.bloodstone": 50,
      "resources.wood": 1000,
    },
    effects: {
      "story.seen.bloodstoneStaffCrafted": true,
      "weapons.bloodstone_staff": true,
    },
    cooldown: 60,
  },
};