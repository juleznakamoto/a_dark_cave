import { describe, expect, it } from "vitest";
import { REFERRAL_REWARD_GOLD, type GameState } from "@shared/schema";
import { mergeCloudReferralsIntoState } from "./save";

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    resources: { wood: 100, gold: 50 } as GameState["resources"],
    referrals: [],
    referralCount: 0,
    referredUsers: [],
    referralProcessed: false,
    playTime: 1000,
    log: [],
    ...overrides,
  } as GameState;
}

describe("mergeCloudReferralsIntoState referralCode", () => {
  it("prefers trimmed local code over cloud", () => {
    const local = baseState({ referralCode: "  LOCAL1  " });
    const cloud = { referralCode: "CLOUD1" };

    const merged = mergeCloudReferralsIntoState(local, cloud);
    expect(merged.referralCode).toBe("LOCAL1");
  });

  it("uses trimmed cloud code when local is blank after trim", () => {
    const local = baseState({ referralCode: "   " });
    const cloud = { referralCode: "  CLOUD1  " };

    const merged = mergeCloudReferralsIntoState(local, cloud);
    expect(merged.referralCode).toBe("CLOUD1");
  });

  it("discards whitespace-only codes instead of reintroducing the untrimmed local value", () => {
    const local = baseState({ referralCode: "   " });
    const cloud = { referralCode: "\t" };

    const merged = mergeCloudReferralsIntoState(local, cloud);
    expect(merged.referralCode).toBeUndefined();
  });

  it("omits referralCode when both sides are missing", () => {
    const local = baseState();
    const cloud = {};

    const merged = mergeCloudReferralsIntoState(local, cloud);
    expect(merged.referralCode).toBeUndefined();
  });

  it("grants invitee gold when cloud processed flips the local flag", () => {
    const local = baseState({
      referralProcessed: false,
      resources: { wood: 100, gold: 50 } as GameState["resources"],
    });
    const cloud = { referralProcessed: true, referralCode: "AB3K9M" };

    const merged = mergeCloudReferralsIntoState(local, cloud);
    expect(merged.referralProcessed).toBe(true);
    expect(merged.referralCode).toBe("AB3K9M");
    expect(merged.resources.gold).toBe(50 + REFERRAL_REWARD_GOLD);
    expect(merged.resources.wood).toBe(100);
  });

  it("does not grant invitee gold again when already processed", () => {
    const local = baseState({
      referralProcessed: true,
      referralCode: "AB3K9M",
      resources: { wood: 100, gold: 250 } as GameState["resources"],
    });
    const cloud = { referralProcessed: true, referralCode: "AB3K9M" };

    const merged = mergeCloudReferralsIntoState(local, cloud);
    expect(merged.resources.gold).toBe(250);
  });

  it("repairs a missing flag without paying again when the invitee log is already present", () => {
    const local = baseState({
      referralProcessed: false,
      resources: { wood: 100, gold: 250 } as GameState["resources"],
      log: [
        {
          id: "referral-bonus-new-1",
          message: `You were invited by someone to this world! +${REFERRAL_REWARD_GOLD} Gold`,
          timestamp: 1,
          type: "system",
        },
      ],
    });
    const cloud = { referralProcessed: true, referralCode: "AB3K9M" };

    const merged = mergeCloudReferralsIntoState(local, cloud);
    expect(merged.referralProcessed).toBe(true);
    expect(merged.referralCode).toBe("AB3K9M");
    expect(merged.resources.gold).toBe(250);
  });
});
