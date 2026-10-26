import { describe, expect, it, vi } from "vitest";
import { gameStateSchema, type GameState } from "@shared/schema";
import {
  getAssignedPopulationJobIds,
  getTotalPopulationEffects,
  hasResourceProductionBreakdown,
} from "@/game/population";
import * as population from "@/game/population";
import {
  getSidePanelModel,
  sidePanelModelEqual,
} from "./sidePanelModel";

function baseState(overrides: Partial<GameState> = {}): GameState {
  return { ...gameStateSchema.parse({}), ...overrides } as GameState;
}

describe("getSidePanelModel", () => {
  it("lists mined resources in cave Mine button order", () => {
    const mined = [
      "stone",
      "iron",
      "coal",
      "sulfur",
      "obsidian",
      "adamant",
      "moonstone",
    ];
    const keys = Object.keys(gameStateSchema.parse({}).resources);
    expect(keys.filter((key) => mined.includes(key))).toEqual(mined);
  });

  it("lists a held resource and skips untouched ones", () => {
    const state = baseState({
      resources: {
        ...gameStateSchema.parse({}).resources,
        wood: 12,
      },
      seenResources: ["wood"],
    });
    const model = getSidePanelModel(state);
    expect(model.resourceRows.map((row) => row.id)).toEqual(["wood"]);
    expect(model.resourceRows[0]?.value).toBe(12);
  });

  it("hides a consumed mountain village map", () => {
    const owned = baseState({
      tools: {
        ...gameStateSchema.parse({}).tools,
        mountain_village_map: true,
      },
    });
    expect(getSidePanelModel(owned).toolIds).toContain("mountain_village_map");

    const used = baseState({
      tools: {
        ...gameStateSchema.parse({}).tools,
        mountain_village_map: true,
      },
      story: {
        ...gameStateSchema.parse({}).story,
        seen: {
          ...gameStateSchema.parse({}).story.seen,
          mountainVillageExplored: true,
        },
      },
    });
    expect(getSidePanelModel(used).toolIds).not.toContain(
      "mountain_village_map",
    );
  });

  it("treats equal models as equal despite new object identity", () => {
    const state = baseState({
      resources: {
        ...gameStateSchema.parse({}).resources,
        wood: 3,
      },
      seenResources: ["wood"],
    });
    expect(
      sidePanelModelEqual(getSidePanelModel(state), getSidePanelModel(state)),
    ).toBe(true);
  });

  it("derives hasFlow and deltas from one villager production scan", () => {
    const parsed = gameStateSchema.parse({});
    const state = baseState({
      villagers: { ...parsed.villagers, gatherer: 2 },
      seenResources: ["wood", "stone", "food", "silver"],
      resources: {
        ...parsed.resources,
        wood: 1,
        stone: 1,
        food: 1,
        silver: 1,
      },
    });
    const spy = vi.spyOn(population, "getPopulationResourceFlows");
    const model = getSidePanelModel(state);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();

    const deltas = getTotalPopulationEffects(
      state,
      getAssignedPopulationJobIds(state),
    );
    for (const row of model.resourceRows) {
      expect(row.hasFlow).toBe(hasResourceProductionBreakdown(state, row.id));
      expect(row.productionDelta).toBe(deltas[row.id] ?? 0);
    }
    expect(model.resourceRows.find((row) => row.id === "wood")?.hasFlow).toBe(
      true,
    );
    expect(model.resourceRows.find((row) => row.id === "food")?.hasFlow).toBe(
      false,
    );
  });

  it("treats a resource amount change as unequal", () => {
    const empty = gameStateSchema.parse({});
    const a = getSidePanelModel(
      baseState({
        resources: { ...empty.resources, wood: 3 },
        seenResources: ["wood"],
      }),
    );
    const b = getSidePanelModel(
      baseState({
        resources: { ...empty.resources, wood: 4 },
        seenResources: ["wood"],
      }),
    );
    expect(sidePanelModelEqual(a, b)).toBe(false);
  });
});
