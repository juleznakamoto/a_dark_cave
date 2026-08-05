import { describe, it, expect } from "vitest";
import { getPopulationProduction } from "./population";
import type { GameState } from "@shared/schema";

/** Minimal state for gatherer/hunter Veinroot job checks. */
function createState(overrides?: Partial<GameState>): GameState {
  return {
    resources: { wood: 0, stone: 0, food: 0, veinroot: 0 } as GameState["resources"],
    buildings: { herbGarden: 0 } as GameState["buildings"],
    villagers: { free: 0, gatherer: 1, hunter: 0 } as GameState["villagers"],
    story: { seen: { veinrootDiscovered: true } } as GameState["story"],
    tools: {} as GameState["tools"],
    weapons: {} as GameState["weapons"],
    clothing: {} as GameState["clothing"],
    relics: { ravens_orb: false } as GameState["relics"],
    blessings: {} as GameState["blessings"],
    books: {} as GameState["books"],
    fellowship: {} as GameState["fellowship"],
    huntingSkills: { level: 0 },
    schematics: {} as GameState["schematics"],
    flags: {} as GameState["flags"],
    stats: { madnessFromEvents: 0 } as GameState["stats"],
    cruelMode: false,
    ...overrides,
  } as GameState;
}

describe("gatherer Veinroot production", () => {
  it("gives gatherers 1 Veinroot after discovery", () => {
    const production = getPopulationProduction("gatherer", 1, createState());
    const veinroot = production.find((p) => p.resource === "veinroot");
    expect(veinroot?.totalAmount).toBe(1);
    expect(veinroot?.baseAmount).toBe(1);
  });

  it("adds Herb Garden +2 Veinroot via productionEffects (1 base + 2 = 3)", () => {
    const production = getPopulationProduction(
      "gatherer",
      2,
      createState({
        buildings: { herbGarden: 1 } as GameState["buildings"],
      }),
    );
    const veinroot = production.find((p) => p.resource === "veinroot");
    expect(veinroot?.baseAmount).toBe(1);
    expect(veinroot?.totalAmount).toBe(6); // (1 + 2) * 2 gatherers
  });

  it("does not give hunters Veinroot job production", () => {
    const production = getPopulationProduction(
      "hunter",
      1,
      createState({
        villagers: { free: 0, gatherer: 0, hunter: 1 } as GameState["villagers"],
      }),
    );
    const veinroot = production.find((p) => p.resource === "veinroot");
    expect(veinroot).toBeUndefined();
  });
});
