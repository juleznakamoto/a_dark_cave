import { describe, it, expect } from "vitest";
import { mergeReferralLists } from "./referralMerge";

describe("mergeReferralLists", () => {
  it("keeps cloud-only referrals when local list is empty", () => {
    const result = mergeReferralLists(
      [],
      [{ userId: "friend-1", claimed: false, timestamp: 100 }],
    );
    expect(result.referrals).toEqual([
      { userId: "friend-1", claimed: false, timestamp: 100 },
    ]);
    expect(result.referralCount).toBe(1);
    expect(result.referredUsers).toEqual(["friend-1"]);
  });

  it("unions distinct userIds from both sides", () => {
    const result = mergeReferralLists(
      [{ userId: "a", claimed: true, timestamp: 50 }],
      [{ userId: "b", claimed: false, timestamp: 100 }],
    );
    expect(result.referrals).toEqual([
      { userId: "a", claimed: true, timestamp: 50 },
      { userId: "b", claimed: false, timestamp: 100 },
    ]);
    expect(result.referralCount).toBe(2);
  });

  it("ORs claimed and takes max timestamp for the same userId", () => {
    const result = mergeReferralLists(
      [{ userId: "a", claimed: false, timestamp: 200 }],
      [{ userId: "a", claimed: true, timestamp: 100 }],
    );
    expect(result.referrals).toEqual([
      { userId: "a", claimed: true, timestamp: 200 },
    ]);
  });

  it("honors higher explicit referralCount", () => {
    const result = mergeReferralLists([], [], {
      localReferralCount: 3,
      cloudReferralCount: 1,
    });
    expect(result.referralCount).toBe(3);
  });

  it("skips invalid entries", () => {
    const result = mergeReferralLists(
      [null, { userId: "", claimed: true, timestamp: 1 }, undefined],
      [{ userId: "ok", claimed: false, timestamp: 2 }],
    );
    expect(result.referrals).toEqual([
      { userId: "ok", claimed: false, timestamp: 2 },
    ]);
  });
});
