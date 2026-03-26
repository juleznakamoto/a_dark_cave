import { describe, it, expect } from "vitest";
import {
  rollDie,
  resolveRoll,
  shouldNpcRoll,
  npcRollOrStand,
  resolveShowdown,
  isStopBlockedTiedFarUnderGoal,
  canPlayerChooseNoRoll,
  INITIAL_GOAL,
  RngFn,
} from "./diceFifteenGame";

function makeRng(values: number[]): RngFn {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error("RNG exhausted");
    return values[i++];
  };
}

describe("rollDie", () => {
  it("returns the value from the injected RNG", () => {
    expect(rollDie(() => 4)).toBe(4);
  });
});

describe("resolveRoll", () => {
  it("returns playing when total is under goal", () => {
    expect(resolveRoll(8, 3, 15)).toEqual({ newTotal: 11, status: "playing" });
  });

  it("returns exactGoal when total equals goal", () => {
    expect(resolveRoll(10, 5, 15)).toEqual({ newTotal: 15, status: "exactGoal" });
  });

  it("returns bust when total exceeds goal", () => {
    expect(resolveRoll(12, 5, 15)).toEqual({ newTotal: 17, status: "bust" });
  });

  it("works with escalated goal of 25", () => {
    expect(resolveRoll(19, 6, 25)).toEqual({ newTotal: 25, status: "exactGoal" });
    expect(resolveRoll(20, 6, 25)).toEqual({ newTotal: 26, status: "bust" });
  });
});

describe("shouldNpcRoll", () => {
  it("rolls when behind the player", () => {
    expect(shouldNpcRoll(8, 12, 15)).toBe(true);
  });

  it("rolls when tied with the player", () => {
    expect(shouldNpcRoll(12, 12, 15)).toBe(true);
  });

  it("stands when ahead of the player", () => {
    expect(shouldNpcRoll(13, 12, 15)).toBe(false);
  });

  it("stands when already at the goal (rolling would always bust)", () => {
    expect(shouldNpcRoll(15, 10, 15)).toBe(false);
    expect(shouldNpcRoll(15, 15, 15)).toBe(false);
    expect(shouldNpcRoll(25, 25, 25)).toBe(false);
  });
});

describe("npcRollOrStand", () => {
  it("stands when already ahead (no RNG)", () => {
    expect(npcRollOrStand(13, 12, 15, makeRng([]))).toEqual({ kind: "stand" });
  });

  it("stands when at goal even if tied with player (both 15/15/15)", () => {
    expect(npcRollOrStand(15, 15, 15, makeRng([]))).toEqual({ kind: "stand" });
  });

  it("rolls one die when tied", () => {
    const step = npcRollOrStand(12, 12, 15, makeRng([3]));
    expect(step).toMatchObject({
      kind: "roll",
      roll: 3,
      newTotal: 15,
      status: "exactGoal",
    });
  });

  it("rolls one die when behind", () => {
    const step = npcRollOrStand(5, 12, 15, makeRng([4]));
    expect(step).toMatchObject({
      kind: "roll",
      roll: 4,
      newTotal: 9,
      status: "playing",
    });
  });

  it("hits goal exactly (exactGoal status for dialog to resolve win/lose)", () => {
    const step = npcRollOrStand(10, 12, 15, makeRng([5]));
    expect(step).toMatchObject({
      kind: "roll",
      roll: 5,
      newTotal: 15,
      status: "exactGoal",
    });
  });

  it("busts on one roll", () => {
    const step = npcRollOrStand(11, 14, 15, makeRng([6]));
    expect(step).toMatchObject({
      kind: "roll",
      roll: 6,
      newTotal: 17,
      status: "bust",
    });
  });

  it("with escalated goal, rolls a single die", () => {
    const step = npcRollOrStand(12, 18, 25, makeRng([3]));
    expect(step).toMatchObject({
      kind: "roll",
      roll: 3,
      newTotal: 15,
      status: "playing",
    });
  });
});

describe("resolveShowdown", () => {
  it("player wins with higher total", () => {
    expect(resolveShowdown(14, 12, 15)).toBe("playerWin");
  });

  it("NPC wins with higher total", () => {
    expect(resolveShowdown(10, 13, 15)).toBe("npcWin");
  });

  it("throws when equal (unreachable in play)", () => {
    expect(() => resolveShowdown(12, 12, 15)).toThrow();
  });
});

describe("isStopBlockedTiedFarUnderGoal", () => {
  it("blocks when tied and strictly more than 6 under goal", () => {
    expect(isStopBlockedTiedFarUnderGoal(4, 4, 15)).toBe(true);
    expect(isStopBlockedTiedFarUnderGoal(8, 8, 15)).toBe(true);
  });

  it("allows when tied at 6 or fewer points under goal", () => {
    expect(isStopBlockedTiedFarUnderGoal(9, 9, 15)).toBe(false);
    expect(isStopBlockedTiedFarUnderGoal(10, 10, 15)).toBe(false);
  });

  it("allows when not tied", () => {
    expect(isStopBlockedTiedFarUnderGoal(8, 9, 15)).toBe(false);
  });

  it("respects escalated goal", () => {
    expect(isStopBlockedTiedFarUnderGoal(10, 10, 25)).toBe(true);
    expect(isStopBlockedTiedFarUnderGoal(17, 17, 25)).toBe(true);
    expect(isStopBlockedTiedFarUnderGoal(19, 19, 25)).toBe(false);
  });
});

describe("canPlayerChooseNoRoll", () => {
  it("is true only when player is strictly ahead", () => {
    expect(canPlayerChooseNoRoll(13, 12)).toBe(true);
    expect(canPlayerChooseNoRoll(15, 10)).toBe(true);
  });

  it("is false when tied or behind", () => {
    expect(canPlayerChooseNoRoll(12, 12)).toBe(false);
    expect(canPlayerChooseNoRoll(11, 13)).toBe(false);
    expect(canPlayerChooseNoRoll(0, 0)).toBe(false);
  });
});

