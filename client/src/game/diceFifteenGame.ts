export const WAGER_TIERS = [10, 50, 250, 500, 750, 1000] as const;
export type WagerTier = (typeof WAGER_TIERS)[number];

export const WAGER_LUCK_THRESHOLDS: Record<WagerTier, number> = {
  10: 0,
  50: 10,
  250: 20,
  500: 30,
  750: 40,
  1000: 50,
};

export const INITIAL_GOAL = 15;
export const GOAL_INCREMENT = 10;

/** When tied, No Roll is disabled if both are strictly more than this many points under the goal. */
export const TIED_STOP_MAX_GOAL_DISTANCE = 6;

export function isStopBlockedTiedFarUnderGoal(
  playerTotal: number,
  npcTotal: number,
  goal: number,
): boolean {
  return (
    playerTotal === npcTotal &&
    goal - playerTotal > TIED_STOP_MAX_GOAL_DISTANCE
  );
}

/** No Roll is only allowed when the player is strictly ahead of the gambler. */
export function canPlayerChooseNoRoll(
  playerTotal: number,
  npcTotal: number,
): boolean {
  return playerTotal > npcTotal;
}

/** `bust` only when total exceeds the goal; exactly at goal is still `playing`. */
export type RollStatus = "playing" | "bust";
export type ShowdownResult = "playerWin" | "npcWin" | "tie";
export type GameOutcome = "win" | "lose";

export type RngFn = () => number;

const defaultRng: RngFn = () => Math.floor(Math.random() * 6) + 1;

export function rollDie(rng: RngFn = defaultRng): number {
  return rng();
}

export function resolveRoll(
  currentTotal: number,
  roll: number,
  goal: number,
): { newTotal: number; status: RollStatus } {
  const newTotal = currentTotal + roll;
  if (newTotal > goal) return { newTotal, status: "bust" };
  return { newTotal, status: "playing" };
}

/**
 * NPC rolls when behind or tied and still below the goal; stands when ahead or already at the goal
 * (any positive die from exactly the goal would bust — e.g. both at 15/15/15 must go to tie escalation).
 */
export function shouldNpcRoll(
  npcTotal: number,
  playerTotal: number,
  goal: number,
): boolean {
  if (npcTotal >= goal) return false;
  return npcTotal <= playerTotal;
}

/** One NPC decision per turn: roll a single die, or stand (no roll). */
export type NpcTurnStep =
  | { kind: "stand" }
  | { kind: "roll"; roll: number; newTotal: number; status: RollStatus };

export function npcRollOrStand(
  npcTotal: number,
  playerTotal: number,
  goal: number,
  rng: RngFn = defaultRng,
): NpcTurnStep {
  if (!shouldNpcRoll(npcTotal, playerTotal, goal)) {
    return { kind: "stand" };
  }
  const roll = rollDie(rng);
  const { newTotal, status } = resolveRoll(npcTotal, roll, goal);
  return { kind: "roll", roll, newTotal, status };
}


export function resolveShowdown(
  playerTotal: number,
  npcTotal: number,
  _goal: number,
): ShowdownResult {
  if (playerTotal > npcTotal) return "playerWin";
  if (npcTotal > playerTotal) return "npcWin";
  return "tie";
}
