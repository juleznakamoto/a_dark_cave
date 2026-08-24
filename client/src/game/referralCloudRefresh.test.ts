import { describe, expect, it } from "vitest";
import { REFERRAL_REWARD_GOLD } from "@shared/schema";
import { applyReferralCloudRefreshPatch } from "./referralCloudRefresh";
import type { GameState } from "@shared/schema";

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    resources: { wood: 500, gold: 50 } as GameState["resources"],
    referrals: [],
    referralCount: 0,
    referredUsers: [],
    referralProcessed: false,
    buildings: { woodenHut: 3 } as GameState["buildings"],
    playTime: 9999,
    log: [],
    ...overrides,
  } as GameState;
}

describe("applyReferralCloudRefreshPatch", () => {
  it("merges referrer rows without replacing live progression", () => {
    const live = baseState({
      resources: { wood: 500, gold: 50 } as GameState["resources"],
    });
    const cloud = {
      referrals: [
        { userId: "u1", timestamp: 1, claimed: false },
      ],
      referralCount: 1,
      referredUsers: ["u1"],
      resources: { gold: 999 },
    };

    const patch = applyReferralCloudRefreshPatch(live, cloud);
    expect(patch.changed).toBe(true);
    expect(patch.nextState.resources.wood).toBe(500);
    expect(patch.nextState.buildings).toEqual(live.buildings);
    expect(patch.nextState.playTime).toBe(9999);
    expect(patch.nextState.referrals).toHaveLength(1);
    expect(patch.nextState.referrals?.[0]?.claimed).toBe(true);
    expect(patch.nextState.resources.gold).toBe(50 + REFERRAL_REWARD_GOLD);
  });

  it("grants invitee gold once from exact reward, never cloud gold", () => {
    const live = baseState({
      referralProcessed: false,
      resources: { wood: 10, gold: 50 } as GameState["resources"],
    });
    const cloud = {
      referralProcessed: true,
      referralCode: "ABC",
      resources: { gold: 100 },
      referrals: [],
      referralCount: 0,
      referredUsers: [],
    };

    const patch = applyReferralCloudRefreshPatch(live, cloud);
    expect(patch.changed).toBe(true);
    expect(patch.nextState.referralProcessed).toBe(true);
    expect(patch.nextState.referralCode).toBe("ABC");
    expect(patch.nextState.resources.gold).toBe(50 + REFERRAL_REWARD_GOLD);
    expect(patch.nextState.resources.wood).toBe(10);
  });

  it("repairs a missing flag without paying again when the invitee log is already present", () => {
    const live = baseState({
      referralProcessed: false,
      resources: { gold: 250 } as GameState["resources"],
      log: [
        {
          id: "referral-bonus-new-1",
          message: `You were invited by someone to this world! +${REFERRAL_REWARD_GOLD} Gold`,
          timestamp: 1,
          type: "system",
        },
      ],
    });
    const cloud = {
      referralProcessed: true,
      referralCode: "ABC",
      referrals: [],
      referralCount: 0,
      referredUsers: [],
    };

    const patch = applyReferralCloudRefreshPatch(live, cloud);
    expect(patch.changed).toBe(true);
    expect(patch.nextState.referralProcessed).toBe(true);
    expect(patch.nextState.referralCode).toBe("ABC");
    expect(patch.nextState.resources.gold).toBe(250);
  });

  it("is idempotent when already processed locally", () => {
    const live = baseState({
      referralProcessed: true,
      referralCode: "ABC",
      resources: { gold: 250 } as GameState["resources"],
    });
    const cloud = {
      referralProcessed: true,
      referralCode: "ABC",
      resources: { gold: 250 },
      referrals: [],
      referralCount: 0,
      referredUsers: [],
    };

    const patch = applyReferralCloudRefreshPatch(live, cloud);
    expect(patch.changed).toBe(false);
    expect(patch.nextState).toBe(live);
  });

  it("invitee claim then inviter refresh both grant 200", () => {
    const invitee = applyReferralCloudRefreshPatch(
      baseState({
        resources: { wood: 10, gold: 200 } as GameState["resources"],
      }),
      {
        referralProcessed: true,
        referralCode: "EWEVJ9",
        referrals: [],
        referralCount: 0,
        referredUsers: [],
      },
    );
    expect(invitee.nextState.referralProcessed).toBe(true);
    expect(invitee.nextState.resources.gold).toBe(200 + REFERRAL_REWARD_GOLD);

    const inviter = applyReferralCloudRefreshPatch(
      baseState({
        resources: { wood: 10, gold: 200 } as GameState["resources"],
      }),
      {
        referralProcessed: false,
        referrals: [
          { userId: "invitee-c", claimed: false, timestamp: 1 },
        ],
        referralCount: 1,
        referredUsers: ["invitee-c"],
      },
    );
    expect(inviter.nextState.referralCount).toBe(1);
    expect(inviter.nextState.referrals?.[0]?.claimed).toBe(true);
    expect(inviter.nextState.resources.gold).toBe(200 + REFERRAL_REWARD_GOLD);
  });
});
