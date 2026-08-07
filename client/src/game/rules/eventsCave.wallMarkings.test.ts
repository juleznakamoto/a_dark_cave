import { beforeEach, describe, expect, it, vi } from "vitest";
import { gameStateSchema } from "@shared/schema";

vi.mock("@/lib/edition", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/edition")>("@/lib/edition");
  return {
    ...actual,
    isSteamEditionActive: vi.fn(actual.isSteamEditionActive),
  };
});

import { isSteamEditionActive } from "@/lib/edition";
import {
  CAVE_WALL_MARKINGS_INSIGHT,
  CAVE_WALL_MARKINGS_INSIGHT_STEAM,
  caveEvents,
  getCaveWallMarkingsInsight,
} from "./eventsCave";

describe("cave wall markings", () => {
  beforeEach(() => {
    vi.mocked(isSteamEditionActive).mockReturnValue(false);
  });

  it("registers one event per cave stage", () => {
    expect(Object.keys(CAVE_WALL_MARKINGS_INSIGHT)).toEqual(
      Object.keys(CAVE_WALL_MARKINGS_INSIGHT_STEAM),
    );

    for (const eventId of Object.keys(CAVE_WALL_MARKINGS_INSIGHT)) {
      expect(caveEvents[eventId]).toBeDefined();
      expect(caveEvents[eventId]?.i18nKey).toBe("caveWallMarkings");
    }
  });

  it("uses web Insight amounts by default", () => {
    expect(Object.values(CAVE_WALL_MARKINGS_INSIGHT)).toEqual([
      100, 200, 300, 500, 750, 1000,
    ]);
    expect(getCaveWallMarkingsInsight("caveWallMarkingsVentureDeeper")).toBe(
      200,
    );
  });

  it("uses Steam Insight amounts when Steam edition is active", () => {
    vi.mocked(isSteamEditionActive).mockReturnValue(true);
    expect(Object.values(CAVE_WALL_MARKINGS_INSIGHT_STEAM)).toEqual([
      250, 500, 750, 1000, 1250, 1500,
    ]);
    expect(getCaveWallMarkingsInsight("caveWallMarkingsVentureDeeper")).toBe(
      500,
    );
    expect(getCaveWallMarkingsInsight("caveWallMarkingsExploreCitadel")).toBe(
      1500,
    );
  });

  it("grants Insight and marks the stage as found on continue", () => {
    const state = gameStateSchema.parse({
      resources: { insight: 40 },
      buildings: { clerksHut: 1 },
    });

    const effect = caveEvents.caveWallMarkingsVentureDeeper.choices;
    const choices = typeof effect === "function" ? effect(state) : effect;
    const continueChoice = choices?.find((c) => c.id === "continue");
    expect(continueChoice).toBeDefined();

    const result = continueChoice!.effect!(state);
    expect(result.resources?.insight).toBe(40 + 200);
    expect(result.story?.seen?.caveWallMarkingsFoundVentureDeeper).toBe(true);
    expect(result._logMessageKey).toBe("outcome0");
  });

  it("grants Steam Insight amounts on continue when Steam edition is active", () => {
    vi.mocked(isSteamEditionActive).mockReturnValue(true);
    const state = gameStateSchema.parse({
      resources: { insight: 40 },
      buildings: { clerksHut: 1 },
    });

    const effect = caveEvents.caveWallMarkingsExploreCave.choices;
    const choices = typeof effect === "function" ? effect(state) : effect;
    const continueChoice = choices?.find((c) => c.id === "continue");
    const result = continueChoice!.effect!(state);

    expect(result.resources?.insight).toBe(40 + 250);
  });
});
