import { describe, expect, it } from "vitest";
import { REFERRAL_REWARD_GOLD, type GameState } from "./schema";
import {
  hasInviteeReferralLog,
  withInviteeReferralGold,
} from "./referralReward";

const inviteeLog: NonNullable<GameState["log"]>[number] = {
  id: "referral-bonus-new-1",
  message: `You were invited by someone to this world! +${REFERRAL_REWARD_GOLD} Gold`,
  timestamp: 1,
  type: "system",
};

describe("withInviteeReferralGold", () => {
  it("grants gold and writes the invitee log on first flip", () => {
    const next = withInviteeReferralGold(
      {
        resources: { gold: 50 } as GameState["resources"],
        log: [],
      },
      "AB3K9M",
    );

    expect(next.referralProcessed).toBe(true);
    expect(next.referralCode).toBe("AB3K9M");
    expect(next.resources.gold).toBe(50 + REFERRAL_REWARD_GOLD);
    expect(hasInviteeReferralLog(next.log)).toBe(true);
  });

  it("restores the flag without paying again when the invitee log is already present", () => {
    const next = withInviteeReferralGold({
      resources: { gold: 250 } as GameState["resources"],
      log: [inviteeLog],
    });

    expect(next.referralProcessed).toBe(true);
    expect(next.resources.gold).toBe(250);
    expect(next.log).toEqual([inviteeLog]);
  });
});
