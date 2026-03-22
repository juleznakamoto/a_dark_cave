import { describe, it, expect } from "vitest";
import {
  rollDie,
  resolveRoll,
  shouldNpcRoll,
  runNpcTurn,
  resolveShowdown,
  INITIAL_GOAL,
  GOAL_INCREMENT,
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

  it("returns win when total equals goal", () => {
    expect(resolveRoll(10, 5, 15)).toEqual({ newTotal: 15, status: "win" });
  });

  it("returns bust when total exceeds goal", () => {
    expect(resolveRoll(12, 5, 15)).toEqual({ newTotal: 17, status: "bust" });
  });

  it("works with escalated goal of 20", () => {
    expect(resolveRoll(14, 6, 20)).toEqual({ newTotal: 20, status: "win" });
    expect(resolveRoll(18, 5, 20)).toEqual({ newTotal: 23, status: "bust" });
  });
});

describe("shouldNpcRoll", () => {
  it("rolls when behind the player", () => {
    expect(shouldNpcRoll(8, 12, 15)).toBe(true);
  });

  it("stands when equal to the player", () => {
    expect(shouldNpcRoll(12, 12, 15)).toBe(false);
  });

  it("stands when ahead of the player", () => {
    expect(shouldNpcRoll(13, 12, 15)).toBe(false);
  });
});

describe("runNpcTurn", () => {
  it("NPC stands immediately when already ahead", () => {
    const result = runNpcTurn(13, 12, 15, makeRng([]));
    expect(result.rolls).toEqual([]);
    expect(result.finalTotal).toBe(13);
    expect(result.status).toBe("playing");
  });

  it("NPC rolls to catch up and stops when ahead", () => {
    const result = runNpcTurn(5, 12, 15, makeRng([4, 4]));
    expect(result.rolls).toEqual([4, 4]);
    expect(result.finalTotal).toBe(13);
    expect(result.status).toBe("playing");
  });

  it("NPC hits goal exactly and wins", () => {
    const result = runNpcTurn(10, 12, 15, makeRng([5]));
    expect(result.rolls).toEqual([5]);
    expect(result.finalTotal).toBe(15);
    expect(result.status).toBe("win");
  });

  it("NPC busts while catching up", () => {
    const result = runNpcTurn(11, 14, 15, makeRng([6]));
    expect(result.rolls).toEqual([6]);
    expect(result.finalTotal).toBe(17);
    expect(result.status).toBe("bust");
  });

  it("NPC stands on tie with player", () => {
    const result = runNpcTurn(12, 12, 15, makeRng([]));
    expect(result.rolls).toEqual([]);
    expect(result.finalTotal).toBe(12);
    expect(result.status).toBe("playing");
  });
});

describe("resolveShowdown", () => {
  it("player wins with higher total", () => {
    expect(resolveShowdown(14, 12, 15)).toBe("playerWin");
  });

  it("NPC wins with higher total", () => {
    expect(resolveShowdown(10, 13, 15)).toBe("npcWin");
  });

  it("tie when equal", () => {
    expect(resolveShowdown(12, 12, 15)).toBe("tie");
  });
});

describe("tie escalation", () => {
  it("goal increases by 5 on tie", () => {
    const goal = INITIAL_GOAL;
    const result = resolveShowdown(12, 12, goal);
    expect(result).toBe("tie");
    const newGoal = goal + GOAL_INCREMENT;
    expect(newGoal).toBe(20);
  });

  it("multi-tie escalation works (15 -> 20 -> 25)", () => {
    let goal = INITIAL_GOAL;

    goal += GOAL_INCREMENT;
    expect(goal).toBe(20);
    expect(resolveRoll(18, 2, goal)).toEqual({ newTotal: 20, status: "win" });

    goal += GOAL_INCREMENT;
    expect(goal).toBe(25);
    expect(resolveRoll(22, 4, goal)).toEqual({ newTotal: 26, status: "bust" });
  });

  it("NPC plays correctly with escalated goal", () => {
    const result = runNpcTurn(12, 18, 20, makeRng([3, 4]));
    expect(result.rolls).toEqual([3, 4]);
    expect(result.finalTotal).toBe(19);
    expect(result.status).toBe("playing");
  });
});
