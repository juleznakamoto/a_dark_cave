import { describe, expect, it } from "vitest";
import type { GameState } from "@shared/schema";
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
});
