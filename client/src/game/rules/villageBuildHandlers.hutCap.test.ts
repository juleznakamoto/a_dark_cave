import { describe, expect, it } from "vitest";
import { createInitialState } from "@/game/state";
import type { GameState } from "@shared/schema";
import type { ActionResult } from "@/game/types";
import { isHutBuildOverCap } from "@/game/cruelMode";
import { handleBuildStoneHut, handleBuildWoodenHut } from "./villageBuildHandlers";

function hutState(
  buildings: Partial<GameState["buildings"]>,
  cruelMode = false,
): GameState {
  const initial = createInitialState();
  return {
    ...initial,
    cruelMode,
    buildings: { ...initial.buildings, ...buildings },
    _completingExecution: "buildWoodenHut",
  } as GameState;
}

function emptyResult(): ActionResult {
  return { stateUpdates: {} };
}

describe("isHutBuildOverCap", () => {
  it("blocks wooden hut 11 in normal and allows it in cruel", () => {
    expect(isHutBuildOverCap("buildWoodenHut", { cruelMode: false }, 11)).toBe(
      true,
    );
    expect(isHutBuildOverCap("buildWoodenHut", { cruelMode: true }, 11)).toBe(
      false,
    );
  });

  it("blocks hut 13 even in cruel and ignores non-hut builds", () => {
    expect(isHutBuildOverCap("buildStoneHut", { cruelMode: true }, 13)).toBe(
      true,
    );
    expect(isHutBuildOverCap("buildLonghouse", { cruelMode: false }, 6)).toBe(
      false,
    );
  });
});

describe("hut complete respects current-mode cap", () => {
  it("does not add a leftover wooden hut at the normal cap", () => {
    const result = handleBuildWoodenHut(
      hutState({ woodenHut: 10 }),
      emptyResult(),
    );
    expect(result.stateUpdates.buildings).toBeUndefined();
  });

  it("still completes wooden hut 10 in normal", () => {
    const result = handleBuildWoodenHut(
      hutState({ woodenHut: 9 }),
      emptyResult(),
    );
    expect(result.stateUpdates.buildings?.woodenHut).toBe(10);
  });

  it("allows wooden hut 11 and 12 only in cruel", () => {
    const at10 = handleBuildWoodenHut(
      hutState({ woodenHut: 10 }, true),
      emptyResult(),
    );
    expect(at10.stateUpdates.buildings?.woodenHut).toBe(11);

    const at12 = handleBuildWoodenHut(
      hutState({ woodenHut: 12 }, true),
      emptyResult(),
    );
    expect(at12.stateUpdates.buildings).toBeUndefined();
  });

  it("does not add a leftover stone hut at the normal cap", () => {
    const state = {
      ...hutState({ stoneHut: 10, woodenHut: 10 }),
      _completingExecution: "buildStoneHut",
    } as GameState;
    const result = handleBuildStoneHut(state, emptyResult());
    expect(result.stateUpdates.buildings).toBeUndefined();
  });

  it("still completes stone hut 10 in normal", () => {
    const state = {
      ...hutState({ stoneHut: 9, woodenHut: 10 }),
      _completingExecution: "buildStoneHut",
    } as GameState;
    const result = handleBuildStoneHut(state, emptyResult());
    expect(result.stateUpdates.buildings?.stoneHut).toBe(10);
  });
});
