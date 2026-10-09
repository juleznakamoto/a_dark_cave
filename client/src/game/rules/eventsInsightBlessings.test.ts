import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { insightBlessingEvents } from "./eventsInsightBlessings";

function blessingOfferState(overrides?: {
  clerksHut?: number;
  darkEstate?: number;
  insight?: number;
  blessings?: Record<string, boolean>;
}) {
  return gameStateSchema.parse({
    buildings: {
      clerksHut: overrides?.clerksHut ?? 1,
      darkEstate: overrides?.darkEstate ?? 1,
    },
    resources: {
      insight: overrides?.insight ?? 0,
    },
    blessings: overrides?.blessings,
  });
}

describe("insightBlessingOffer", () => {
  const condition = insightBlessingEvents.insightBlessingOffer.condition;

  it("does not appear before Clerk's Hut unlocks Insight", () => {
    const state = blessingOfferState({ clerksHut: 0, darkEstate: 1 });
    expect(condition(state)).toBe(false);
  });

  it("stays away on the first offer until the player holds 300 Insight", () => {
    const short = blessingOfferState({ insight: 299 });
    expect(condition(short)).toBe(false);

    const ready = blessingOfferState({ insight: 300 });
    expect(condition(ready)).toBe(true);
  });

  it("appears after Clerk's Hut and Dark Estate are built once Insight is high enough", () => {
    const state = blessingOfferState({
      clerksHut: 1,
      darkEstate: 1,
      insight: 300,
    });
    expect(condition(state)).toBe(true);
  });

  it("does not require 300 Insight after the first blessing is owned", () => {
    const state = blessingOfferState({
      insight: 0,
      blessings: { trail_sense: true },
    });
    expect(condition(state)).toBe(true);
  });
});
