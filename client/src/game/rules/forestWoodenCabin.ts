import { Action, GameState } from "@shared/schema";
import type { ActionResult } from "@/game/types";
import { applyActionEffects } from "./actionEffects";
import { killVillagers } from "@/game/stateHelpers";
import { defineSuccessChance } from "./eventSuccessChance";
import { CRUEL_MODE, cruelModeScale } from "../cruelMode";
import { getActionLogMessage } from "@/i18n/resolveGameText";

/** 30% plus 1% per point of strength. Traps do not change it. */
export const forestWoodenCabinActions: Record<string, Action> = {
  woodenCabin: {
    id: "woodenCabin",
    label: "Wooden Cabin",
    description: "Investigate the strange wooden cabin in the forest.",
    minVillagers: 8,
    expeditionVillagersRequired: () => 8,
    show_when: {
      "story.seen.woodenCabinUnlocked": true,
      "!story.seen.woodenCabinExplored": true,
    },
    cost: {
      "resources.food": 1000,
    },
    effects: {},
    ...defineSuccessChance({
      base: 0.3,
      stats: [{ type: "strength", multiplier: 0.01 }],
    }),
    executionTime: 150,
    cooldown: 0,
  },
};

export function handleWoodenCabin(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("woodenCabin", state);
  Object.assign(result.stateUpdates, effectUpdates);

  const action = forestWoodenCabinActions.woodenCabin;
  const successChance = action.success_chance
    ? action.success_chance(state)
    : 0;
  const isCompletingExecution =
    (state as GameState & { _completingExecution?: string })
      ._completingExecution === "woodenCabin";

  if (Math.random() < successChance) {
    result.stateUpdates.resources = {
      ...state.resources,
      ...(isCompletingExecution
        ? {}
        : { food: (state.resources.food || 0) - 1000 }),
    };
    result.stateUpdates.weapons = {
      ...state.weapons,
      manhunter_bow: true,
    };
    result.stateUpdates.story = {
      ...state.story,
      seen: {
        ...state.story.seen,
        woodenCabinExplored: true,
      },
    };
    result.logEntries!.push({
      id: `wooden-cabin-success-${Date.now()}`,
      message: getActionLogMessage(
        "woodenCabin",
        "success",
        "The cabin belongs to the hunter who sold you meat. The slaughterhouse is hung with hooks, and none of them held deer. He was hunting people, and the food he traded was their flesh. Among the bone arrowheads you find a bow. The Manhunter Bow is yours.",
      ),
      timestamp: Date.now(),
      type: "system",
    });
  } else {
    if (isCompletingExecution) {
      result.stateUpdates.resources = { ...state.resources };
    }
    const deaths = CRUEL_MODE.forestScout.woodenCabin.failureDeaths;
    const villagerDeaths = Math.min(
      state.current_population,
      Math.floor(Math.random() * deaths.randMax) +
        deaths.base +
        cruelModeScale(state) * deaths.whenCruel,
    );
    const deathResult = killVillagers(state, villagerDeaths);
    const actualDeaths = deathResult.villagersKilled || 0;
    Object.assign(result.stateUpdates, deathResult);

    result.logEntries!.push({
      id: `wooden-cabin-failure-${Date.now()}`,
      message: getActionLogMessage(
        "woodenCabin",
        "failure",
        "As you approach the cabin, arrows come from the dark of the doorway. Every shot is a kill. The arrowheads are bone. {{count}} villagers die before the rest flee.",
        { count: actualDeaths },
      ),
      timestamp: Date.now(),
      type: "system",
    });
  }

  return result;
}
