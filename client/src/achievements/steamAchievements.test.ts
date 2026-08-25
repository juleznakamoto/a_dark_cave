import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  shouldSync: vi.fn(() => true),
  unlock: vi.fn(async () => { }),
}));

vi.mock("@/lib/edition", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/edition")>();
  return {
    ...actual,
    shouldSyncSteamAchievements: () => mocks.shouldSync(),
  };
});

vi.mock("@/lib/steam", () => ({
  hasSteamBridge: () => true,
  steamUnlockAchievement: (apiName: string) => mocks.unlock(apiName),
}));

import { createInitialState } from "@/game/state";
import {
  resetSteamAchievementSyncForTests,
  syncSteamAchievements,
  toSteamApiName,
} from "./steamAchievements";

function stateWithWoodGathered(totalWoodGathered: number) {
  const initial = createInitialState();
  return {
    ...initial,
    story: {
      ...initial.story,
      seen: {
        ...initial.story.seen,
        totalWoodGathered,
      },
    },
  };
}

describe("syncSteamAchievements", () => {
  beforeEach(() => {
    mocks.shouldSync.mockReturnValue(true);
    mocks.unlock.mockReset();
    resetSteamAchievementSyncForTests();
  });

  it("does not unlock in the Steam demo", async () => {
    mocks.shouldSync.mockReturnValue(false);
    await syncSteamAchievements(stateWithWoodGathered(500));
    expect(mocks.unlock).not.toHaveBeenCalled();
  });

  it("unlocks completed achievements when a demo save is loaded in the full game", async () => {
    await syncSteamAchievements(stateWithWoodGathered(500));
    expect(mocks.unlock).toHaveBeenCalledWith(
      toSteamApiName("basic-0-woodGatherer"),
    );
  });

  it("does not unlock incomplete achievements", async () => {
    await syncSteamAchievements(stateWithWoodGathered(499));
    expect(mocks.unlock).not.toHaveBeenCalledWith(
      toSteamApiName("basic-0-woodGatherer"),
    );
  });
});
