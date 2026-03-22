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
export const GOAL_INCREMENT = 5;

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

export interface NpcTurnResult {
  rolls: number[];
  finalTotal: number;
  status: RollStatus;
}

export function runNpcTurn(
  npcStartTotal: number,
  playerTotal: number,
  goal: number,
  rng: RngFn = defaultRng,
): NpcTurnResult {
  const rolls: number[] = [];
  let total = npcStartTotal;
  let status: RollStatus = "playing";

  while (shouldNpcRoll(total, playerTotal, goal)) {
    const roll = rollDie(rng);
    rolls.push(roll);
    const result = resolveRoll(total, roll, goal);
    total = result.newTotal;
    status = result.status;
    if (status !== "playing") break;
  }

  if (status === "playing" && total === goal) {
    status = "win";
  }

  return { rolls, finalTotal: total, status };
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
