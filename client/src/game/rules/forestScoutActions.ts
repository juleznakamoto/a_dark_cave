import { Action, GameState } from "@shared/schema";
import { ActionResult } from "@/game/actions";
import { applyActionEffects } from "@/game/rules";
import {
  getTotalLuck,
  getTotalStrength,
  getTotalKnowledge,
} from "@/game/rules/effects";
import { killVillagers } from "@/game/stateHelpers";

export const forestScoutActions: Record<string, Action> = {
  hunt: {
    id: "hunt",
    label: "Hunt",
    show_when: {
      "flags.forestUnlocked": true,
    },
    cost: {},
    effects: {
      "resources.food": "random(4,8)",
      "resources.fur": "random(1,4)",
      "resources.bones": "random(1,4)",
      "story.seen.hasHunted": true,
      "relics.blacksmith_hammer": {
        probability: 0.005,
        value: true,
        condition:
          "!relics.blacksmith_hammer && !story.seen.blacksmithHammerChoice",
        logMessage: "",
        isChoice: true,
        eventId: "blacksmithHammerChoice",
      },
      "relics.red_mask": {
        probability: 0.0025,
        value: true,
        condition: "!relics.red_mask && !story.seen.redMaskChoice",
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
      "relics.black_bear_fur": false,
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
    effects: {
      "story.seen.castleRuinsExplored": true,
    },
    cooldown: 60,
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
    effects: {
      "story.seen.hillGraveExplored": true,
    },
    cooldown: 60,
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
      "story.seen.sunkenTempleExplored": true,
      "events.wizardSaysBloodstoneStaff": true,
    },
    cooldown: 60,
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

  // Check for blacksmith hammer choice event (0.5% probability if not yet found)
  if (!state.story.seen.blacksmithHammerChoice && Math.random() < 0.005) {
    const hammerEvent = gameEvents.blacksmithHammerChoice;
    if (hammerEvent) {
      result.logEntries = result.logEntries || [];
      result.logEntries.push({
        id: `${hammerEvent.id}-${Date.now()}`,
        message: hammerEvent.message as string,
        timestamp: Date.now(),
        type: "event",
        title: hammerEvent.title,
        choices: hammerEvent.choices,
      });
    }
  }

  // Check for red mask choice event (0.25% probability if not yet found)
  if (!state.story.seen.redMaskChoice && Math.random() < 0.0025) {
    const maskEvent = gameEvents.redMaskChoice;
    if (maskEvent) {
      result.logEntries = result.logEntries || [];
      result.logEntries.push({
        id: `${maskEvent.id}-${Date.now()}`,
        message: maskEvent.message as string,
        timestamp: Date.now(),
        type: "event",
        title: maskEvent.title,
        choices: maskEvent.choices,
      });
    }
  }

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
    result.stateUpdates.relics = {
      ...state.relics,
      black_bear_fur: true,
    };

    if (villagerDeaths === 0) {
      result.logEntries!.push({
        id: `giant-bear-trapped-success-${Date.now()}`,
        message:
          "The giant trap works perfectly! A massive black bear with glowing red eyes is caught, its otherworldly roar echoing through the forest. Your villagers fight with incredible strength and coordination, managing to slay the supernatural beast without casualties. You claim its cursed black fur as a trophy.",
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
        message: `The giant trap snares a colossal black bear with burning red eyes! Its otherworldly roar chills the soul, but your villagers' strength prevails. ${villagerDeaths} brave villager${villagerDeaths > 1 ? "s" : ""} fall${villagerDeaths === 1 ? "s" : ""} to its supernatural claws before the beast is finally slain. You claim its cursed black fur as a hard-won trophy.`,
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
        message: `The giant trap snares a nightmare - a colossal black bear with eyes like burning coals. Its roar seems to come from another realm entirely. Despite their courage, ${villagerDeaths} villagers fall to its supernatural fury before the beast is finally overwhelmed by sheer numbers. You claim its cursed black fur, still warm with otherworldly power.`,
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
        "You set the giant trap with care, but when you return to check it, you find only disturbed earth and massive claw marks. In the silence, you swear you hear a distant, otherworldly roar echoing from deep within the woods. Whatever prowls these forests is too cunning for your trap... this time.",
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
      gold: (state.resources.gold || 0) + 50,
    };

    result.logEntries!.push({
      id: `castle-ruins-success-${Date.now()}`,
      message:
        "Your expedition to the necromancer's castle ruins proves successful! Deep within the crumbling towers, you discover a hidden chamber containing ancient scrolls wrapped in dark silk. The scrolls reveal cryptic knowledge about the creature locked in the lowest chamber of the caves and hint at methods to defeat it.",
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
        message: `Your expedition reaches the ruined castle but is ambushed by shambling undead - grotesque experiments left behind by the necromancer. Skeletal hands claw at your villagers as rotting corpses attack with unnatural hunger. Despite fighting bravely, ${villagerDeaths} villager${villagerDeaths > 1 ? "s" : ""} fall${villagerDeaths === 1 ? "s" : ""} to the undead horde before the survivors manage to retreat to safety.`,
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
    // Success: Find frostglas
    result.stateUpdates.resources = {
      ...state.resources,
      silver: (state.resources.silver || 0) + 200,
      gold: (state.resources.gold || 0) + 100,
      frostglas: (state.resources.frostglas || 0) + 50,
    };

    // Set both flags in a single assignment to avoid overwriting
    result.stateUpdates.story = {
      ...state.story,
      seen: {
        ...state.story.seen,
        hillGraveSuccess: true,
        hillGraveExplored: true,
      },
    };

    result.logEntries!.push({
      id: `hill-grave-success-${Date.now()}`,
      message:
        "Your expedition carefully navigates the treacherous traps of the hill grave. Through skill and knowledge, your villagers disarm the ancient mechanisms and reach the burial chamber. Among the king's treasures, you discover weapons forged of pure frostglas, cold as the void itself.",
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
  const successChance = 0.10 + ((strength + knowledge) / 2) * 0.01; // 10% base + (strength + knowledge)/2%
  const rand = Math.random();

  if (rand < successChance) {
    // Success: Find bloodstone
    result.stateUpdates.resources = {
      ...state.resources,
      gold: (state.resources.gold || 0) + 250,
      bloodstone: (state.resources.bloodstone || 0) + 50,
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
  "wizardSaysBloodstoneStaff": {
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
  "craftBloodstoneStaff": {
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
      "weapons.bloodstone_staff": {
        value: {
          strength: 5,
          knowledge: 10,
        },
      },
    },
    cooldown: 60,
  },
};

// Add the new weapon definition
export const weaponDefinitions = {
  bloodstone_staff: {
    name: "Bloodstone Staff",
    description: "+ 5 Strength, + 10 Knowledge",
    stats: {
      strength: 5,
      knowledge: 10,
    },
  },
};