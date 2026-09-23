import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "@/game/state";
import { PARTNER_INSIGHT_SEEN_KEYS } from "@shared/partnerInsightReferral";

const readPartnerInsightReferral = vi.hoisted(() => vi.fn());

vi.mock("@/lib/partnerInsightReferral", () => ({
  readPartnerInsightReferral,
}));

vi.mock("@/lib/playlight", () => ({
  isPlaylightReferralUrl: () => false,
}));

import { handleMakeFire } from "./caveExploreActions";

describe("handleMakeFire partner Insight bonus", () => {
  beforeEach(() => {
    readPartnerInsightReferral.mockReset();
  });

  it("marks itch, Bored, and Incremental DB players for the 10,000 Insight bonus", () => {
    readPartnerInsightReferral.mockReturnValue("incrementaldb");
    const state = createInitialState();
    const result = handleMakeFire(state, { stateUpdates: {}, logEntries: [] });

    expect(
      result.stateUpdates.story?.seen?.[
      PARTNER_INSIGHT_SEEN_KEYS.incrementaldb
      ],
    ).toBe(true);
    expect(result.stateUpdates.resources?.gold).toBeUndefined();
    expect(
      result.stateUpdates.story?.seen?.playlightFirstPurchaseDiscountActive,
    ).toBeUndefined();
  });

  it("does not mark a player who already paid", () => {
    readPartnerInsightReferral.mockReturnValue("itch");
    const state = createInitialState();
    state.hasMadeNonFreePurchase = true;
    const result = handleMakeFire(state, { stateUpdates: {}, logEntries: [] });

    expect(
      result.stateUpdates.story?.seen?.[PARTNER_INSIGHT_SEEN_KEYS.itch],
    ).toBeUndefined();
  });
});
