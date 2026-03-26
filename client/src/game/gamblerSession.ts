import type { GameState } from "@shared/schema";
import { INITIAL_GOAL } from "@/game/diceFifteenGame";

/** First-time gambler visit: this many free practice rounds (no gold) before real wagers. */
export const GAMBLER_TUTORIAL_PLAYS = 3;

export const GAMBLER_TUTORIAL_PLAYS_REMAINING_SEEN_KEY =
  "gamblerTutorialPlaysRemaining" as const;

/** Missing or invalid values count as no tutorial plays remaining. New games set `GAMBLER_TUTORIAL_PLAYS`. */
export function getGamblerTutorialPlaysRemaining(
  seen: GameState["story"]["seen"] | undefined,
): number {
  const raw = seen?.[GAMBLER_TUTORIAL_PLAYS_REMAINING_SEEN_KEY];
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(GAMBLER_TUTORIAL_PLAYS, Math.floor(n));
}

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
    playerStopped: false,
    pauseAfterNextPlayerRoll: false,
  };
}

/** Uses stored `session` when present; otherwise a fresh `playerTurn` session (e.g. between rounds). */
export function resolveGamblerSessionForHydrate(
  gg: NonNullable<GameState["gamblerGame"]>,
): GamblerDiceSession {
  return gg.session ?? createDefaultGamblerSession("playerTurn");
}
