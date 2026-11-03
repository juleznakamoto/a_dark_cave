import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  shouldSync: vi.fn(() => true),
  isDemo: vi.fn(() => false),
  unlock: vi.fn(async () => { }),
}));

vi.mock("@/lib/edition", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/edition")>();
  return {
    ...actual,
    shouldSyncSteamAchievements: () => mocks.shouldSync(),
    isSteamDemoRuntime: () => mocks.isDemo(),
  };
});

vi.mock("@/lib/steam", () => ({
  hasSteamBridge: () => true,
  steamUnlockAchievement: (apiName: string) => mocks.unlock(apiName),
}));

import { createInitialState } from "@/game/state";
import {
  isSteamDemoAchievementId,
  listSteamAchievementMappings,
  listSteamDemoAchievementMappings,
  resetSteamAchievementSyncForTests,
  syncSteamAchievements,
  toSteamApiName,
} from "./steamAchievements";
import { buildDemoReachableBasicCompletionState } from "./configs/basic.demoReachable";

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

function stateWithDemoAndLaterProgress() {
  const initial = createInitialState();
  return {
    ...initial,
    hasWonNormalGame: true,
    hasWonCruelGame: true,
    hasFinalPactWin: true,
    buildings: {
      ...initial.buildings,
      woodenHut: 10,
    },
    story: {
      ...initial.story,
      seen: {
        ...initial.story.seen,
        totalWoodGathered: 500,
      },
    },
  };
}

describe("syncSteamAchievements", () => {
  beforeEach(() => {
    mocks.shouldSync.mockReturnValue(true);
    mocks.isDemo.mockReturnValue(false);
    mocks.unlock.mockReset();
    resetSteamAchievementSyncForTests();
  });

  it("does not unlock when Steam sync is disabled", async () => {
    mocks.shouldSync.mockReturnValue(false);
    await syncSteamAchievements(stateWithWoodGathered(500));
    expect(mocks.unlock).not.toHaveBeenCalled();
  });

  it("unlocks only basic achievements in the Steam demo", async () => {
    mocks.isDemo.mockReturnValue(true);
    await syncSteamAchievements(stateWithDemoAndLaterProgress());
    const unlocked = mocks.unlock.mock.calls.map((call) => call[0]);
    expect(unlocked).toContain(toSteamApiName("basic-0-woodGatherer"));
    expect(unlocked.every((name) => String(name).startsWith("ACH_BASIC_"))).toBe(
      true,
    );
    expect(unlocked).not.toContain(toSteamApiName("overall-0-winNormal"));
    expect(unlocked).not.toContain("ACH_OVERALL_0_WINCRUEL");
    expect(unlocked).not.toContain("ACH_OVERALL_0_FINALPACT");
    expect(unlocked).not.toContain(toSteamApiName("building-0-0"));
  });

  it("unlocks Cruel Victory and The final pact on the full game", async () => {
    const initial = createInitialState();
    await syncSteamAchievements({
      ...initial,
      hasWonCruelGame: true,
      hasFinalPactWin: true,
    });
    const unlocked = mocks.unlock.mock.calls.map((call) => call[0]);
    expect(unlocked).toContain("ACH_OVERALL_0_WINCRUEL");
    expect(unlocked).toContain("ACH_OVERALL_0_FINALPACT");
    expect(toSteamApiName("overall-0-winCruel")).toBe("ACH_OVERALL_0_WINCRUEL");
    expect(toSteamApiName("overall-0-finalPact")).toBe(
      "ACH_OVERALL_0_FINALPACT",
    );
  });

  it("unlocks completed demo progress when a demo save is loaded in the full game", async () => {
    await syncSteamAchievements(buildDemoReachableBasicCompletionState());
    const unlocked = mocks.unlock.mock.calls.map((call) => call[0]);
    const demoApiNames = listSteamDemoAchievementMappings().map((m) => m.apiName);
    expect(demoApiNames.length).toBeGreaterThan(0);
    for (const apiName of demoApiNames) {
      expect(unlocked).toContain(apiName);
    }
  });

  it("does not unlock incomplete achievements", async () => {
    await syncSteamAchievements(stateWithWoodGathered(499));
    expect(mocks.unlock).not.toHaveBeenCalledWith(
      toSteamApiName("basic-0-woodGatherer"),
    );
  });
});

describe("Steam achievement API names", () => {
  it("maps Cruel Victory and The final pact to the Steamworks names", () => {
    const mappings = listSteamAchievementMappings();
    expect(mappings).toEqual(
      expect.arrayContaining([
        {
          canonicalId: "overall-0-winCruel",
          apiName: "ACH_OVERALL_0_WINCRUEL",
        },
        {
          canonicalId: "overall-0-finalPact",
          apiName: "ACH_OVERALL_0_FINALPACT",
        },
      ]),
    );
  });
});

describe("Steam demo achievement IDs", () => {
  it("keeps the demo partner list to basic IDs", () => {
    const mappings = listSteamDemoAchievementMappings();
    expect(mappings.length).toBeGreaterThan(0);
    for (const { canonicalId, apiName } of mappings) {
      expect(isSteamDemoAchievementId(canonicalId)).toBe(true);
      expect(apiName.startsWith("ACH_BASIC_")).toBe(true);
    }
  });
});
