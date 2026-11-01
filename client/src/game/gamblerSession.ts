import type { GameState } from "@shared/schema";
import { INITIAL_GOAL } from "@/game/diceFifteenGame";
import { getVillagersInVillage } from "@/game/population";
import { killVillagers } from "@/game/stateHelpers";

/** First-time gambler visit: this many free practice rounds (no gold) before real wagers. */
export const GAMBLER_TUTORIAL_PLAYS = 2;

export const GAMBLER_TUTORIAL_PLAYS_REMAINING_SEEN_KEY =
  "gamblerTutorialPlaysRemaining" as const;

/** Set when the gambler timed-tab event first appears (no dice round required). */
export const GAMBLER_EVENT_SEEN_KEY = "gamblerEventSeen" as const;

/** Avid Apprentices: after a paid win, the Gambler may offer a coin. */
export const GAMBLER_COIN_PACT_ID = "avid_apprentices";
export const GAMBLER_COIN_OFFER_CHANCE = 0.25;

/** Avid Apprentices: one paid win may send the Gambler out in a rage. */
export const GAMBLER_RAGE_CHANCE = 0.2;
export const GAMBLER_ENRAGED_SEEN_KEY = "gamblerEnraged" as const;
export const GAMBLER_BANNED_SEEN_KEY = "gamblerBanned" as const;
/** Madness removed when the player bans the Gambler after the killing. */
export const GAMBLER_BAN_MADNESS = 2;
/** Madness added when the player lets the Gambler return after the killing. */
export const GAMBLER_SPARE_MADNESS = 1;

const GAMBLER_ENRAGED_LOG =
  "Raging over his losses, the gambler started a fight with a villager and killed him on the road out of town.";

/** True when this paid win should offer double-or-nothing. Practice rounds never do. */
export function gamblerCoinOfferOnWin(
  state: { chosenPacts?: readonly string[] },
  wager: number,
  rng: () => number = Math.random,
): boolean {
  if (wager <= 0) return false;
  if (!state.chosenPacts?.includes(GAMBLER_COIN_PACT_ID)) return false;
  return rng() < GAMBLER_COIN_OFFER_CHANCE;
}

/** Paid dice win that took gold from the Gambler. Practice and a lost coin toss do not count. */
export function isGamblerPaidWin(game: {
  wager?: number;
  outcome?: "win" | "lose" | null;
  goldDelta?: number;
} | null | undefined): boolean {
  if (!game || game.outcome !== "win") return false;
  if ((game.wager ?? 0) <= 0) return false;
  const delta = game.goldDelta ?? game.wager ?? 0;
  return delta > 0;
}

export function isGamblerBanned(state: {
  story?: { seen?: GameState["story"]["seen"] };
}): boolean {
  return Boolean(state.story?.seen?.[GAMBLER_BANNED_SEEN_KEY]);
}

/**
 * Avid Apprentices only. Call this on the last game of the visit.
 * Rolls once until the rage has happened.
 * No villager in the village means there is nobody for him to kill.
 */
export function gamblerRageOnWin(
  state: {
    chosenPacts?: readonly string[];
    story?: { seen?: GameState["story"]["seen"] };
    villagers?: GameState["villagers"];
  },
  paidWin: boolean,
  rng: () => number = Math.random,
): boolean {
  if (!paidWin) return false;
  if (!state.chosenPacts?.includes(GAMBLER_COIN_PACT_ID)) return false;
  if (state.story?.seen?.[GAMBLER_ENRAGED_SEEN_KEY]) return false;
  if (isGamblerBanned(state)) return false;
  if (!state.villagers || getVillagersInVillage({ villagers: state.villagers }) <= 0) {
    return false;
  }
  return rng() < GAMBLER_RAGE_CHANCE;
}

/**
 * Kill one villager and remember that the rage already happened.
 * Returns null when the death does not land, so a later win can still roll.
 */
export function applyGamblerRage(state: GameState): Partial<GameState> | null {
  const death = killVillagers(state, 1);
  if (!death.villagersKilled || !death.villagers) return null;
  return {
    villagers: death.villagers,
    ...(death.stats ? { stats: death.stats } : {}),
    story: {
      ...state.story,
      seen: {
        ...state.story.seen,
        [GAMBLER_ENRAGED_SEEN_KEY]: true,
      },
    },
    log: [
      ...state.log,
      {
        id: `gambler-enraged-${Date.now()}`,
        message: GAMBLER_ENRAGED_LOG,
        logKey: "gambler.enraged",
        timestamp: Date.now(),
        type: "event" as const,
      },
    ],
  };
}

/** Gambler timed event has appeared at least once (playing a round is not required). */
export function hasGamblerAppearedOnce(state: GameState): boolean {
  return Boolean(state.story?.seen?.[GAMBLER_EVENT_SEEN_KEY]);
}

/**
 * Practice rounds exist only on a player's first playthrough.
 * A later game (a win already on the record, or a restart that cleared the
 * remaining count) does not offer them again.
 */
export function getGamblerTutorialPlaysRemaining(state: {
  story?: { seen?: GameState["story"]["seen"] };
  lifetimeGamesWon?: number;
}): number {
  if ((state.lifetimeGamesWon ?? 0) > 0) return 0;
  const seen = state.story?.seen;
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
