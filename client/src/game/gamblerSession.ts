import type { GameState } from "@shared/schema";
import { INITIAL_GOAL } from "@/game/diceFifteenGame";

/** Minimal timed-tab slice used when deciding whether to reopen the gambler UI after load. */
export type GamblerResumeTimedTab = {
  isActive: boolean;
  event: { id?: string } | null;
  expiryTime?: number;
};

/**
 * After a full page load, reopen the timed-event tab and gambler modal when the save has an
 * active gambler timed event and persisted gambler round state (in progress or outcome screen).
 */
export function gamblerDiceResumeOnLoad(input: {
  timedEventTab?: GamblerResumeTimedTab | null;
  gamblerGame?: GameState["gamblerGame"];
}): { activeTab: "cave" | "timedevent"; gamblerDiceDialogOpen: boolean } {
  const tab = input.timedEventTab ?? {
    isActive: false,
    event: null,
    expiryTime: 0,
  };
  const gg = input.gamblerGame ?? null;
  const isGamblerEvent =
    tab.isActive &&
    !!tab.event?.id &&
    String(tab.event.id).split("-")[0] === "gambler";
  const hasRoundCredits =
    gg?.roundsRemainingThisEvent != null && gg.roundsRemainingThisEvent > 0;
  const resume =
    isGamblerEvent &&
    gg != null &&
    (gg.outcome != null ||
      gg.wager > 0 ||
      gg.session != null ||
      hasRoundCredits);
  return {
    activeTab: resume ? "timedevent" : "cave",
    gamblerDiceDialogOpen: resume,
  };
}

/** Persisted in-progress gambler dice state (subset of `GameState["gamblerGame"]`). */
export type GamblerDiceSession = NonNullable<
  NonNullable<GameState["gamblerGame"]>["session"]
>;

export function createDefaultGamblerSession(
  phase: GamblerDiceSession["phase"] = "wager",
): GamblerDiceSession {
  return {
    phase,
    playerTotal: 0,
    npcTotal: 0,
    goal: INITIAL_GOAL,
    playerLastRoll: null,
    npcLastRoll: null,
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
): GamblerDiceSession {
  if (gg.session) {
    const s = gg.session as GamblerDiceSession & { hasReroll?: boolean };
    const { hasReroll: _legacyReroll, ...rest } = s;
    return rest;
  }
  return createDefaultGamblerSession("playerTurn");
}
