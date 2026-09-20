import { afterEach, describe, expect, it, vi } from "vitest";
import { gameStateSchema } from "@shared/schema";

vi.mock("@/lib/edition", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/edition")>();
  return {
    ...actual,
    isDemoEdition: vi.fn(() => false),
  };
});

import { isDemoEdition } from "@/lib/edition";
import { disgracedPriorEvents } from "./eventsDisgracedPrior";

const isDemoEditionMock = vi.mocked(isDemoEdition);
const condition = disgracedPriorEvents.disgracedPriorOffer.condition;

function priorOfferState(overrides?: {
  woodenHut?: number;
  darkEstate?: number;
  cruelMode?: boolean;
  alreadyJoined?: boolean;
}) {
  return gameStateSchema.parse({
    buildings: {
      woodenHut: overrides?.woodenHut ?? 6,
      darkEstate: overrides?.darkEstate ?? 1,
    },
    cruelMode: overrides?.cruelMode ?? false,
    fellowship: {
      disgraced_prior: overrides?.alreadyJoined ?? false,
    },
    story: {
      seen: {
        disgracedPriorJoined: overrides?.alreadyJoined ?? false,
      },
    },
  });
}

describe("disgracedPriorOffer", () => {
  afterEach(() => {
    isDemoEditionMock.mockReturnValue(false);
  });

  it("needs 6 wooden huts and Dark Estate in the full game", () => {
    expect(condition(priorOfferState({ woodenHut: 5 }))).toBe(false);
    expect(condition(priorOfferState({ woodenHut: 6 }))).toBe(true);
  });

  it("needs 5 wooden huts in Cruel Mode outside demo", () => {
    expect(
      condition(priorOfferState({ woodenHut: 4, cruelMode: true })),
    ).toBe(false);
    expect(
      condition(priorOfferState({ woodenHut: 5, cruelMode: true })),
    ).toBe(true);
  });

  it("needs 4 wooden huts in demo editions", () => {
    isDemoEditionMock.mockReturnValue(true);
    expect(condition(priorOfferState({ woodenHut: 3 }))).toBe(false);
    expect(condition(priorOfferState({ woodenHut: 4 }))).toBe(true);
    expect(
      condition(priorOfferState({ woodenHut: 4, cruelMode: true })),
    ).toBe(true);
  });

  it("does not appear without Dark Estate or after joining", () => {
    expect(condition(priorOfferState({ darkEstate: 0 }))).toBe(false);
    expect(condition(priorOfferState({ alreadyJoined: true }))).toBe(false);
  });
});
