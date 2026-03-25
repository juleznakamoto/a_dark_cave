import type { GameState } from "@shared/schema";
import { INITIAL_GOAL } from "@/game/diceFifteenGame";

/** Persisted in-progress gambler dice state (subset of `GameState["gamblerGame"]`). */
export type GamblerDiceSession = NonNullable<
  NonNullable<GameState["gamblerGame"]>["session"]
>;

export function createDefaultGamblerSession(
  hasBoneDice: boolean,
  phase: GamblerDiceSession["phase"] = "wager",
): GamblerDiceSession {
  return {
    phase,
    playerTotal: 0,
    npcTotal: 0,
    goal: INITIAL_GOAL,
    playerLastRoll: null,
    npcLastRoll: null,
    hasReroll: hasBoneDice,
    hasRolledThisRound: false,
    npcTurnChain: 0,
    goalRaisedBlinkKey: 0,
    playerStopped: false,
    pauseAfterNextPlayerRoll: false,
  };
}

/** Legacy saves: only wager + stake flag, no session — treat as start of round after wager. */
export function resolveGamblerSessionForHydrate(
  gg: NonNullable<GameState["gamblerGame"]>,
  hasBoneDice: boolean,
): GamblerDiceSession {
  if (gg.session) return { ...gg.session };
  return createDefaultGamblerSession(hasBoneDice, "playerTurn");
}
