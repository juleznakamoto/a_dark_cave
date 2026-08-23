import { describe, expect, it } from "vitest";
import { gameStateSchema, type GameState } from "@shared/schema";
import {
  getSidePanelModel,
  sidePanelModelEqual,
} from "./sidePanelModel";

function baseState(overrides: Partial<GameState> = {}): GameState {
  return { ...gameStateSchema.parse({}), ...overrides } as GameState;
}

describe("getSidePanelModel", () => {
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
