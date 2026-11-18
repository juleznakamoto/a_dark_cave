import { beforeEach, describe, expect, it, vi } from "vitest";

const impact = vi.fn(async () => {});
const notification = vi.fn(async () => {});
const selectionChanged = vi.fn(async () => {});

vi.mock("@capacitor/haptics", () => ({
  ImpactStyle: { Heavy: "HEAVY", Medium: "MEDIUM", Light: "LIGHT" },
  NotificationType: {
    Success: "SUCCESS",
    Warning: "WARNING",
    Error: "ERROR",
  },
  Haptics: { impact, notification, selectionChanged },
}));

vi.mock("@/lib/edition", () => ({
  isIosBuild: true,
}));

vi.mock("@/game/gameStoreHolder", () => ({
  tryGetBoundGameStore: () => ({
    getState: () => ({ hapticsMuted: muted }),
  }),
}));

let muted = false;

describe("playHaptic", () => {
  beforeEach(() => {
    muted = false;
    impact.mockClear();
    notification.mockClear();
    selectionChanged.mockClear();
  });

  it("maps lighting the fire and blasting the gate to a heavy impact", async () => {
    const { playHaptic } = await import("./haptics");
    playHaptic("makeFire");
    playHaptic("blastGate");
    expect(impact).toHaveBeenNthCalledWith(1, { style: "HEAVY" });
    expect(impact).toHaveBeenNthCalledWith(2, { style: "HEAVY" });
  });

  it("maps feed fire, insight, prior, coins, claim, improve, and the lantern to medium", async () => {
    const { playHaptic } = await import("./haptics");
    playHaptic("feedFire");
    playHaptic("insight");
    playHaptic("priorBadge");
    playHaptic("mapCoin");
    playHaptic("claimAchievementReward");
    playHaptic("estateSkill");
    playHaptic("wanderersLantern");
    expect(impact).toHaveBeenCalledTimes(7);
    for (const call of impact.mock.calls) {
      expect(call[0]).toEqual({ style: "MEDIUM" });
    }
  });

  it("maps a plain button and log filters to light impact", async () => {
    const { playHaptic } = await import("./haptics");
    playHaptic("button");
    playHaptic("logFilter");
    expect(impact).toHaveBeenNthCalledWith(1, { style: "LIGHT" });
    expect(impact).toHaveBeenNthCalledWith(2, { style: "LIGHT" });
  });

  it("maps job + and - to the selection tick", async () => {
    const { playHaptic } = await import("./haptics");
    playHaptic("selection");
    expect(selectionChanged).toHaveBeenCalledTimes(1);
    expect(impact).not.toHaveBeenCalled();
  });

  it("maps a new game tab to success", async () => {
    const { playHaptic } = await import("./haptics");
    playHaptic("tabUnlock");
    expect(notification).toHaveBeenCalledWith({ type: "SUCCESS" });
  });

  it("maps combatFight to heavy and items to medium", async () => {
    const { playHaptic } = await import("./haptics");
    playHaptic("combatFight");
    playHaptic("combatItemOrSkill");
    expect(impact).toHaveBeenNthCalledWith(1, { style: "HEAVY" });
    expect(impact).toHaveBeenNthCalledWith(2, { style: "MEDIUM" });
  });

  it("maps villager death and madness to warning", async () => {
    const { playHaptic } = await import("./haptics");
    playHaptic("villagerDeath");
    playHaptic("madnessEvent");
    expect(notification).toHaveBeenCalledWith({ type: "WARNING" });
    expect(notification).toHaveBeenCalledTimes(2);
  });

  it("skips the light button tap when this click already played a cue", async () => {
    const { armClickHaptic, playButtonHaptic, playHaptic } = await import(
      "./haptics"
    );
    armClickHaptic();
    playHaptic("insight");
    playButtonHaptic();
    expect(impact).toHaveBeenCalledTimes(1);
    expect(impact).toHaveBeenCalledWith({ style: "MEDIUM" });
  });

  it("skips when haptics are muted", async () => {
    muted = true;
    const { playHaptic } = await import("./haptics");
    playHaptic("button");
    expect(impact).not.toHaveBeenCalled();
  });
});
