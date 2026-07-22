import { describe, expect, it } from "vitest";
import { slimGameStateForAdmin } from "./adminDashboardData";

describe("slimGameStateForAdmin", () => {
  it("keeps admin-relevant fields and cube events only", () => {
    const slim = slimGameStateForAdmin({
      playTime: 120_000,
      gameComplete: true,
      events: {
        cube13: true,
        cube99: true,
        merchantArrives: true,
        storySeen_foo: true,
      },
      sleepUpgrades: { lengthLevel: 2, intensityLevel: 1 },
      buttonUpgrades: { hunt: { level: 3 } },
      isUserSignedIn: true,
      referralCount: 2,
      social_media_rewards: { instagram: { claimed: true } },
      socialPromoExclusiveRewardPending: false,
      clothing: { gifted_ring: true, other: "ignored" },
      flags: { gameStarted: true, villageUnlocked: true },
      buildings: { woodenHut: 7, stoneHut: 0, cabin: 3 },
      referralProcessed: true,
      resources: { gold: 9999 },
      story: { seen: { huge: true } },
    });

    expect(slim).toMatchObject({
      playTime: 120_000,
      gameComplete: true,
      events: { cube13: true, cube99: true },
      sleepUpgrades: { lengthLevel: 2, intensityLevel: 1 },
      buttonUpgrades: { hunt: { level: 3 } },
      isUserSignedIn: true,
      referralCount: 2,
      social_media_rewards: { instagram: { claimed: true } },
      clothing: { gifted_ring: true },
      flags: { gameStarted: true },
      buildings: { woodenHut: 7, stoneHut: 0 },
      referralProcessed: true,
    });
    expect(slim).not.toHaveProperty("resources");
    expect(slim).not.toHaveProperty("story");
    expect(slim?.events).not.toHaveProperty("merchantArrives");
    expect(slim?.flags).not.toHaveProperty("villageUnlocked");
    expect(slim?.buildings).not.toHaveProperty("cabin");
  });

  it("returns null for missing state", () => {
    expect(slimGameStateForAdmin(null)).toBeNull();
    expect(slimGameStateForAdmin(undefined)).toBeNull();
  });
});
