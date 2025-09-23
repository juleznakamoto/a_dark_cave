
import { Action, GameState } from "@shared/schema";
import { ActionResult } from '@/game/actions';
import { applyActionEffects, getActionBonuses, getTotalLuck } from '@/game/rules/effects';
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
      "resources.food": "random(1,6)",
      "resources.fur": "random(0,2)",
      "resources.bones": "random(0,2)",
      "story.seen.hasHunted": true,
      "relics.blacksmith_hammer": {
        probability: 0.0025,
        value: true,
        condition: "!relics.blacksmith_hammer",
        logMessage:
          "Deep in the forest, you discover the ruin of an old stone building dominated by a massive stone furnace. Skeletal remains lie scattered about - the bones of what must have been a giant. Among the debris, a magnificent blacksmith hammer catches the light, its head still bearing traces of ancient forge-fire. You take the hammer with you.",
      },
    },
    cooldown: 10,
  },

  layTrap: {
    id: "layTrap",
    label: "Lay Trap",
    show_when: {
      "tools.giant_trap": true,
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

  // Apply weapon bonuses for hunting
  const actionBonuses = getActionBonuses('hunt', state);
  if (actionBonuses.resourceBonus && actionBonuses.resourceBonus.food) {
    if (!effectUpdates.resources) {
      effectUpdates.resources = { ...state.resources };
    }
    effectUpdates.resources.food = (effectUpdates.resources.food || 0) + actionBonuses.resourceBonus.food;
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
    // Success: Giant bear trapped
    const villagerDeaths = Math.floor(Math.random() * 4); // 0-3 deaths
    const deathResult = killVillagers(state, villagerDeaths);

    Object.assign(result.stateUpdates, deathResult);
    result.stateUpdates.relics = {
      ...state.relics,
      black_bear_fur: true,
    };

    if (villagerDeaths === 0) {
      result.logEntries!.push({
        id: `giant-bear-trapped-success-${Date.now()}`,
        message: 'The giant trap works perfectly! A massive black bear, larger than any normal bear, is caught. Your villagers fight with all their strength and manage to slay the beast without casualties. You claim its magnificent black fur as a trophy.',
        timestamp: Date.now(),
        type: 'system',
      });
    } else {
      result.logEntries!.push({
        id: `giant-bear-trapped-casualties-${Date.now()}`,
        message: `The giant trap snares a colossal black bear! The beast fights ferociously. ${villagerDeaths} villager${villagerDeaths > 1 ? 's' : ''} fall${villagerDeaths === 1 ? 's' : ''} to its claws before it is finally slain. You claim its magnificent black fur as a hard-won trophy.`,
        timestamp: Date.now(),
        type: 'system',
      });
    }
  } else {
    // Failure: Nothing caught
    result.logEntries!.push({
      id: `giant-trap-failed-${Date.now()}`,
      message: 'You set the giant trap with care, but when you return to check it, you find only disturbed earth and massive claw marks. Whatever prowls these woods is too cunning for your trap... this time. Perhaps you should try again.',
      timestamp: Date.now(),
      type: 'system',
    });
  }

  return result;
}
