import { Action, GameState } from "@shared/schema";
import { ActionResult } from '@/game/actions';
import { gameActions, applyActionEffects } from '@/game/rules';

import { Action, GameState } from "@shared/schema";
import { ActionResult } from '@/game/actions';

export const caveForgingActions: Record<string, Action> = {
  forgeFrostglassSword: {
    id: "forgeFrostglassSword",
    label: "Frostglass Sword",
    show_when: {
      "buildings.grandBlacksmith": 1,
      "weapons.frostglass_sword": false,
    },
    cost: {
      "resources.frostglas": 50,
    },
    effects: {
      "weapons.frostglass_sword": true,
      "story.seen.hasFrostglassSword": true,
    },
    cooldown: 60,
  },
};

// Action handler for frostglass sword
export function handleForgeFrostglassSword(
  state: GameState,
  result: ActionResult,
): ActionResult {
  result.stateUpdates.resources = {
    ...state.resources,
    frostglas: state.resources.frostglas - 50,
  };

  result.stateUpdates.weapons = {
    ...state.weapons,
    frostglass_sword: true,
  };

  result.stateUpdates.story = {
    ...state.story,
    seen: {
      ...state.story.seen,
      hasFrostglassSword: true,
    },
  };

  result.logEntries!.push({
    id: `frostglass-sword-forged-${Date.now()}`,
    message:
      "The Grand Blacksmith's forge burns with ethereal blue flames as the frostglas is shaped into a magnificent sword. The blade gleams with an otherworldly cold light, radiating power.",
    timestamp: Date.now(),
    type: "system",
  });

  return result;
}
