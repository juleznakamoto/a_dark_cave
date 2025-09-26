import { Action, GameState } from "@shared/schema";
import { ActionResult } from '@/game/actions';
import { applyActionEffects } from '@/game/rules';
import { getActionBonuses, getTotalLuck } from '@/game/rules/effects';
import { killVillagers } from '@/game/stateHelpers';

export const forestScoutActions: Record<string, Action> = {
  hunt: {
    id: "hunt",
    label: "Hunt",
    show_when: {
      "flags.forestUnlocked": true,
    },
    cost: {},
    effects: {
      "resources.food": "random(2,6)",
      "resources.fur": "random(0,3)",
      "resources.bones": "random(0,3)",
      "story.seen.hasHunted": true,
      "relics.blacksmith_hammer": {
        probability: 0.005,
        value: true,
        condition: "!relics.blacksmith_hammer",
        logMessage:
          "Deep in the forest, you discover the ruin of an old stone building dominated by a massive stone furnace. Skeletal remains lie scattered about - the bones of what must have been a giant. Among the debris, a magnificent blacksmith hammer catches the light, its head still bearing traces of ancient forge-fire. You take the hammer with you.",
      },
      "relics.red_mask": {
        probability: 0.0025,
        value: true,
        condition: "!relics.red_mask",
        logMessage:
          "While hunting, you see an oddly big black raven staring at you from a broken tree. Even when you come nearer he keeps staring. Suddenly he croaks. It sounds like he is saying a word you don't understand again and again. As you come closer he flies away. On the floor in front of the tree is laying a mask out of red leather.",
      },
    },
    cooldown: 10,
  },

  layTrap: {
    id: "layTrap",
    label: "Lay Trap",
    show_when: {
      "tools.giant_trap": true,
      "!relics.black_bear_fur": true,
    },
    cost: {
      "resources.food": 500,
    },
    effects: {
      "resources.food": -500,
      "story.seen.trapLaid": true,
    },
    cooldown: 20,
  },
};

// Action handlers
export function handleHunt(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('hunt', state);

  // Apply weapon bonuses and multipliers for hunting
  const actionBonuses = getActionBonuses('hunt', state);

  if (!effectUpdates.resources) {
    effectUpdates.resources = { ...state.resources };
  }

  // Apply fixed resource bonuses
  if (actionBonuses.resourceBonus && Object.keys(actionBonuses.resourceBonus).length > 0) {
    Object.entries(actionBonuses.resourceBonus).forEach(([resource, bonus]) => {
      if (effectUpdates.resources && typeof bonus === 'number') {
        effectUpdates.resources[resource] = (effectUpdates.resources[resource] || 0) + bonus;
      }
    });
  }

  // Apply resource multipliers (like 25% bonus from black bear fur)
  if (actionBonuses.resourceMultiplier && actionBonuses.resourceMultiplier !== 1) {
    Object.keys(effectUpdates.resources).forEach((resource) => {
      if (effectUpdates.resources) {
        const currentAmount = effectUpdates.resources[resource] || 0;
        const baseAmount = currentAmount - (state.resources[resource] || 0);
        const bonusAmount = Math.floor(baseAmount * (actionBonuses.resourceMultiplier - 1));
        effectUpdates.resources[resource] = currentAmount + bonusAmount;
      }
    });
  }

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

export function handleLayTrap(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('layTrap', state);
  Object.assign(result.stateUpdates, effectUpdates);

  // Calculate success based on luck
  const luck = getTotalLuck(state);
  const successChance = 0.25 + (luck * 0.01);
  const rand = Math.random();

  if (rand < successChance) {
    // Success: Giant bear trapped - now determine combat outcome based on strength
    const strength = state.stats.strength || 0;
    const fightChance = 0.1 + (strength * 0.02); // 10% base + 2% per strength point
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
        message: 'The giant trap works perfectly! A massive black bear with glowing red eyes is caught, its otherworldly roar echoing through the forest. Your villagers fight with incredible strength and coordination, managing to slay the supernatural beast without casualties. You claim its cursed black fur as a trophy.',
        timestamp: Date.now(),
        type: 'system',
      });
    } else if (villagerDeaths <= 2) {
      result.logEntries!.push({
        id: `giant-bear-trapped-victory-${Date.now()}`,
        message: `The giant trap snares a colossal black bear with burning red eyes! Its otherworldly roar chills the soul, but your villagers' strength prevails. ${villagerDeaths} brave villager${villagerDeaths > 1 ? 's' : ''} fall${villagerDeaths === 1 ? 's' : ''} to its supernatural claws before the beast is finally slain. You claim its cursed black fur as a hard-won trophy.`,
        timestamp: Date.now(),
        type: 'system',
      });
    } else {
      result.logEntries!.push({
        id: `giant-bear-trapped-defeat-${Date.now()}`,
        message: `The giant trap snares a nightmare - a colossal black bear with eyes like burning coals. Its roar seems to come from another realm entirely. Despite their courage, ${villagerDeaths} villagers fall to its supernatural fury before the beast is finally overwhelmed by sheer numbers. You claim its cursed black fur, still warm with otherworldly power.`,
        timestamp: Date.now(),
        type: 'system',
      });
    }
  } else {
    // Failure: Nothing caught
    result.logEntries!.push({
      id: `giant-trap-failed-${Date.now()}`,
      message: 'You set the giant trap with care, but when you return to check it, you find only disturbed earth and massive claw marks. In the silence, you swear you hear a distant, otherworldly roar echoing from deep within the woods. Whatever prowls these forests is too cunning for your trap... this time.',
      timestamp: Date.now(),
      type: 'system',
    });
  }

  return result;
}