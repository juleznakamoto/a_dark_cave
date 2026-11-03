import { afterEach, describe, expect, it, vi } from "vitest";
import { gameStateSchema, type GameState } from "@shared/schema";
import type { ActionResult } from "@/game/types";
import { handleRisingSmoke } from "./forestScoutActions";

function risingSmokeState(btp: number, skeletonKey: boolean): GameState {
  return gameStateSchema.parse({
    BTP: btp,
    resources: { gold: 20, food: 5000 },
    tools: { skeleton_key: skeletonKey },
    villagers: { free: 30 },
    buildings: { woodenHut: 0 },
  });
}

function emptyResult(): ActionResult {
  return { stateUpdates: {}, logEntries: [] };
}

describe("handleRisingSmoke gold text", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("names the chest gold that was actually paid, doubled on store editions", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const web = handleRisingSmoke(risingSmokeState(0, false), emptyResult());
    expect(web.stateUpdates.resources?.gold).toBe(520);
    expect(web.logEntries?.[0]?.message).toContain("500 Gold");
    expect(web.logEntries?.[0]?.message).not.toContain("1000");

    const steam = handleRisingSmoke(risingSmokeState(1, false), emptyResult());
    expect(steam.stateUpdates.resources?.gold).toBe(1020);
    expect(steam.logEntries?.[0]?.message).toContain("1000 Gold");
  });

  it("names the skeleton-key gold that was actually paid", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const web = handleRisingSmoke(risingSmokeState(0, true), emptyResult());
    expect(web.stateUpdates.resources?.gold).toBe(770);
    expect(web.logEntries?.[0]?.message).toContain("500 Gold");
    expect(web.logEntries?.[0]?.message).toContain("250 Gold");

    const steam = handleRisingSmoke(risingSmokeState(1, true), emptyResult());
    expect(steam.stateUpdates.resources?.gold).toBe(1520);
    expect(steam.logEntries?.[0]?.message).toContain("1000 Gold");
    expect(steam.logEntries?.[0]?.message).toContain("500 Gold");
  });
});
