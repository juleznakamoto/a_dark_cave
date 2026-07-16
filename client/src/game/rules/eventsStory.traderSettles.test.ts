import { describe, it, expect, vi, afterEach } from "vitest";
import { storyEvents } from "./eventsStory";
import { GameState } from "@shared/schema";

vi.mock("@/lib/edition", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/edition")>();
  return {
    ...actual,
    isSteamEditionActive: vi.fn(actual.isSteamEditionActive),
  };
});

import { isSteamEditionActive } from "@/lib/edition";

function createMinimalState(overrides: Partial<GameState> = {}): GameState {
  return {
    resources: {},
    buildings: { woodenHut: 5 },
    flags: {},
    villagers: { free: 0, gatherer: 0, hunter: 0 },
    events: {},
    log: [],
    story: { seen: {} },
    relics: {},
    weapons: {},
    tools: {},
    clothing: {},
    blessings: {},
    fellowship: {},
    schematics: {},
    books: {},
    feastState: { isActive: false, endTime: 0, lastAcceptedLevel: 0 },
    greatFeastState: { isActive: false, endTime: 0 },
    boneDevourerState: { lastAcceptedLevel: 0 },
    tradersGratitudeState: { accepted: false },
    triggeredEvents: {},
    ...overrides,
  } as GameState;
}

describe("traderSettles", () => {
  afterEach(() => {
    vi.mocked(isSteamEditionActive).mockReturnValue(false);
  });

  it("does not trigger on Steam", () => {
    vi.mocked(isSteamEditionActive).mockReturnValue(true);
    expect(storyEvents.traderSettles.condition!(createMinimalState())).toBe(
      false,
    );
  });

  it("triggers on web when wooden huts are ready and not yet settled", () => {
    vi.mocked(isSteamEditionActive).mockReturnValue(false);
    expect(storyEvents.traderSettles.condition!(createMinimalState())).toBe(
      true,
    );
  });

  it("does not trigger after traderSettled", () => {
    vi.mocked(isSteamEditionActive).mockReturnValue(false);
    expect(
      storyEvents.traderSettles.condition!(
        createMinimalState({
          story: { seen: { traderSettled: true } },
        }),
      ),
    ).toBe(false);
  });
});
