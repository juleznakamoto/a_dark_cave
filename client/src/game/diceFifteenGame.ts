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

export type RollStatus = "playing" | "win" | "bust";
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
  if (newTotal === goal) return { newTotal, status: "win" };
  return { newTotal, status: "playing" };
}

export function shouldNpcRoll(
  npcTotal: number,
  playerTotal: number,
  _goal: number,
): boolean {
  return npcTotal < playerTotal;
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
