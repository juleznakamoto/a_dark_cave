import { beforeEach, describe, expect, it, vi } from "vitest";

const impact = vi.fn(async () => {});
const notification = vi.fn(async () => {});

vi.mock("@capacitor/haptics", () => ({
  ImpactStyle: { Heavy: "HEAVY", Medium: "MEDIUM", Light: "LIGHT" },
  NotificationType: {
    Success: "SUCCESS",
    Warning: "WARNING",
    Error: "ERROR",
  },
  Haptics: { impact, notification },
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
  });

  it("maps makeFire to heavy impact", async () => {
    const { playHaptic } = await import("./haptics");
    playHaptic("makeFire");
    expect(impact).toHaveBeenCalledWith({ style: "HEAVY" });
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

  it("maps mapCoin and logFilter to light impact", async () => {
    const { playHaptic } = await import("./haptics");
    playHaptic("mapCoin");
    playHaptic("logFilter");
    expect(impact).toHaveBeenNthCalledWith(1, { style: "LIGHT" });
    expect(impact).toHaveBeenNthCalledWith(2, { style: "LIGHT" });
  });

  it("maps claimAchievementReward and estateSkill to medium impact", async () => {
    const { playHaptic } = await import("./haptics");
    playHaptic("claimAchievementReward");
    playHaptic("estateSkill");
    expect(impact).toHaveBeenNthCalledWith(1, { style: "MEDIUM" });
    expect(impact).toHaveBeenNthCalledWith(2, { style: "MEDIUM" });
  });

  it("skips when haptics are muted", async () => {
    muted = true;
    const { playHaptic } = await import("./haptics");
    playHaptic("purchase");
    expect(impact).not.toHaveBeenCalled();
  });
});
