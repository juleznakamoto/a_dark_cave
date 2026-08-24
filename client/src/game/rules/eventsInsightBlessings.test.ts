import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { insightBlessingEvents } from "./eventsInsightBlessings";

function blessingOfferState(overrides?: {
  clerksHut?: number;
  darkEstate?: number;
}) {
  return gameStateSchema.parse({
    buildings: {
      clerksHut: overrides?.clerksHut ?? 1,
      darkEstate: overrides?.darkEstate ?? 1,
    },
  });
}

describe("insightBlessingOffer", () => {
  const condition = insightBlessingEvents.insightBlessingOffer.condition;

  it("does not appear before Clerk's Hut unlocks Insight", () => {
    const state = blessingOfferState({ clerksHut: 0, darkEstate: 1 });
    expect(condition(state)).toBe(false);
  });

  it("appears after Clerk's Hut and Dark Estate are built", () => {
    const state = blessingOfferState({ clerksHut: 1, darkEstate: 1 });
    expect(condition(state)).toBe(true);
  });
});
