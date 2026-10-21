import { Action, GameState } from "@shared/schema";
import type { ActionResult } from "@/game/types";
import { applyActionEffects } from "./actionEffects";

export const TAME_WOLF_BONE_COST = 2500;
/** One minute, in seconds. */
export const TAME_WOLF_SECONDS = 60;

export const villageUtilityActions: Record<string, Action> = {
  tameWolf: {
    id: "tameWolf",
    label: "Tame Wolf",
    description: "Tame the wolf you found near the dead alpha.",
    show_when: {
      "clothing.alphas_hide": true,
      "fellowship.grey_one": false,
    },
    cost: {
      "resources.bones": TAME_WOLF_BONE_COST,
    },
    effects: {
      "fellowship.grey_one": true,
    },
    executionTime: TAME_WOLF_SECONDS,
    cooldown: 0,
  },
};

export function handleTameWolf(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("tameWolf", state);
  Object.assign(result.stateUpdates, effectUpdates);
  if (!result.logEntries) result.logEntries = [];
  result.logEntries.push({
    id: `tame-wolf-${Date.now()}`,
    message: "The wolf pup is tamed. Grey One has joined your fellowship.",
    actionId: "tameWolf",
    actionLogKey: "complete",
    timestamp: Date.now(),
    type: "system",
  });
  return result;
}
