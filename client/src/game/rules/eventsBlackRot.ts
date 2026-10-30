import type { GameState } from "@shared/schema";
import { formatNumber } from "@/lib/utils";
import { getVillagersInVillage } from "../population";
import { killVillagers } from "@/game/stateHelpers";
import { CRUEL_MODE } from "../cruelMode";
import { defineSuccessChance } from "./eventSuccessChance";
import type { GameEvent } from "./eventTypes";

export const BLACK_ROT_MIN_WOODEN_HUTS = 5;
export const BLACK_ROT_MIN_VILLAGERS = 6;
export const BLACK_ROT_MIN_FOOD = 1000;

const keepFoodSuccess = defineSuccessChance({
  base: CRUEL_MODE.blackRot.successBase,
  stats: [{ type: "luck", multiplier: CRUEL_MODE.blackRot.luckPerPoint }],
  cmMultiplier: CRUEL_MODE.blackRot.cruelSuccessPenalty,
});

export function getBlackRotKeepChance(state: GameState): number {
  return keepFoodSuccess.success_chance(state);
}

/** Odd dialog open-time picks the larger spoiled share. Stable until the player chooses. */
export function blackRotHighBand(openedAt: number): boolean {
  return openedAt % 2 === 1;
}

function blackRotOpenedAt(state: GameState): number | null {
  const pending = state.pendingModalEvent;
  if (pending?.eventId !== "blackRot") return null;
  return pending.openedAt;
}

/**
 * Dialog copy is built before the store writes `pendingModalEvent`.
 * Give that first pass the same open time the snapshot will keep, so the
 * shown cost and the throw-away use one band.
 */
export function stateForBlackRotDialog(
  state: GameState,
  openedAt: number,
): GameState {
  const pending = state.pendingModalEvent;
  if (pending?.eventId === "blackRot" && pending.openedAt === openedAt) {
    return state;
  }
  return {
    ...state,
    pendingModalEvent: { eventId: "blackRot", openedAt },
  };
}

export function blackRotSpoiledFoodAmount(
  food: number,
  cruel: boolean,
  highBand: boolean,
): number {
  const spec = CRUEL_MODE.blackRot;
  const percent = cruel
    ? highBand
      ? spec.foodPercentHighCruel
      : spec.foodPercentLowCruel
    : highBand
      ? spec.foodPercentHigh
      : spec.foodPercentLow;
  const stock = Math.max(0, food);
  const raw = Math.floor((stock * percent) / 100);
  const stepped = Math.floor(raw / spec.foodStep) * spec.foodStep;
  const amount = stepped >= spec.foodStep ? stepped : spec.foodBelowStep;
  return Math.min(stock, amount);
}

/** Spoiled pile for this open dialog. Without a pending dialog, uses the low band. */
export function blackRotSpoiledFood(state: GameState): number {
  const openedAt = blackRotOpenedAt(state);
  const highBand = openedAt != null && blackRotHighBand(openedAt);
  return blackRotSpoiledFoodAmount(
    state.resources.food ?? 0,
    !!state.cruelMode,
    highBand,
  );
}

/** Inclusive percent of villagers at home. `roll` is in [0, 1). */
export function rollBlackRotDeaths(
  villagersInVillage: number,
  cruel: boolean,
  roll: number,
): number {
  if (villagersInVillage <= 0) return 0;
  const spec = CRUEL_MODE.blackRot;
  const min = cruel ? spec.deathPercentMinCruel : spec.deathPercentMin;
  const max = cruel ? spec.deathPercentMaxCruel : spec.deathPercentMax;
  const span = max - min + 1;
  const clamped = Math.min(Math.max(roll, 0), 0.999999);
  const pct = min + Math.floor(clamped * span);
  let deaths = Math.floor((villagersInVillage * pct) / 100);
  if (!cruel) deaths = Math.max(spec.minDeathsNormal, deaths);
  return Math.min(villagersInVillage, deaths);
}

export const blackRotEvents: Record<string, GameEvent> = {
  blackRot: {
    id: "blackRot",
    condition: (state: GameState) =>
      (state.buildings.woodenHut ?? 0) >= BLACK_ROT_MIN_WOODEN_HUTS &&
      getVillagersInVillage(state) >= BLACK_ROT_MIN_VILLAGERS &&
      (state.resources.food ?? 0) >= BLACK_ROT_MIN_FOOD,
    timeProbability: 75,
    cooldownPercent: 0.7,
    priority: 2,
    repeatable: true,
    i18nVars: (state: GameState) => ({
      foodCost: formatNumber(blackRotSpoiledFood(state)),
    }),
    choices: [
      {
        id: "throwAway",
        effect: (state: GameState) => {
          const loss = blackRotSpoiledFood(state);
          return {
            resources: {
              ...state.resources,
              food: Math.max(0, (state.resources.food ?? 0) - loss),
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "keepFood",
        ...keepFoodSuccess,
        effect: (state: GameState) => {
          if (Math.random() < getBlackRotKeepChance(state)) {
            return { _logMessageKey: "outcome1" };
          }

          const deaths = rollBlackRotDeaths(
            getVillagersInVillage(state),
            !!state.cruelMode,
            Math.random(),
          );
          const deathResult = killVillagers(state, deaths);
          return {
            ...deathResult,
            _logMessageKey: "outcome2",
          };
        },
      },
    ],
  },
};
