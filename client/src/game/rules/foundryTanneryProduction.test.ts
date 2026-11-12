import { describe, expect, it } from "vitest";
import { getPopulationProduction } from "@/game/population";
import { createInitialState, defaultGameState } from "@/game/store/createInitialState";
import {
  applyGameStateLoadMigrations,
  hydrateLoadedGameState,
} from "@/game/stateHelpers";
import { gameStateSchema, type GameState } from "@shared/schema";
import { getBuildingTooltipEffectLines, getBuildingUpgradeMarginalEffectLines } from "./buildingTooltipSections";
import { villageBuildActions } from "./villageBuildActions";

/** Leftover marker from saves created while Steam could opt into web rates. */
const LEGACY_WEB_RATE_SEEN_KEY = "webFoundryTanneryProduction";

function stateWith(btp: number, legacyFlag = false): GameState {
  const state = createInitialState();
  state.BTP = btp;
  if (legacyFlag) {
    state.story.seen[LEGACY_WEB_RATE_SEEN_KEY] = true;
  }
  return state;
}

function production(
  actionId: "buildPrimeFoundry" | "buildMasterworkFoundry" | "buildMasterTannery" | "buildHighTannery",
) {
  return villageBuildActions[actionId].productionEffects;
}

function tooltipLines(actionId: keyof typeof villageBuildActions, state: GameState, damaged = false) {
  return getBuildingTooltipEffectLines(villageBuildActions[actionId], state, damaged);
}

function produced(jobId: string, count: number, state: GameState, resource: string) {
  const row = getPopulationProduction(jobId, count, state).find(
    (entry) => entry.resource === resource,
  );
  return row?.totalAmount;
}

describe("foundry and tannery rates", () => {
  it("uses the same rates on a Steam save and a web save", () => {
    expect(production("buildPrimeFoundry")).toEqual({
      steel_forger: { steel: 1 },
    });
    expect(production("buildMasterworkFoundry")).toEqual({
      steel_forger: { steel: 2 },
    });
    expect(production("buildMasterTannery")).toEqual({
      tanner: { leather: 1 },
    });
    expect(production("buildHighTannery")).toEqual({
      tanner: { leather: 2 },
    });

    for (const state of [stateWith(0), stateWith(1), stateWith(1, true)]) {
      expect(tooltipLines("buildPrimeFoundry", state)).toEqual([
        "Unlocks Steel Forgers",
        "Steel Forger: +1 Steel",
      ]);
      expect(tooltipLines("buildMasterworkFoundry", state)).toEqual([
        "Unlocks Steel Forgers",
        "Unlocks Blacksteel Forgers",
        "Steel Forger: +2 Steel",
      ]);
      expect(tooltipLines("buildMasterTannery", state)).toEqual([
        "Unlocks Tanners",
        "Tanner: +1 Leather",
      ]);
      expect(tooltipLines("buildHighTannery", state)).toEqual([
        "Unlocks Tanners",
        "Tanner: +2 Leather",
      ]);
      expect(
        getBuildingUpgradeMarginalEffectLines("masterworkFoundry", state),
      ).toEqual(["Unlocks Blacksteel Forgers", "Steel Forger: +2 Steel"]);
      expect(getBuildingUpgradeMarginalEffectLines("highTannery", state)).toEqual([
        "Tanner: +2 Leather",
      ]);
    }
  });

  it("does not mark new games with the old web-rate flag", () => {
    expect(createInitialState().story.seen[LEGACY_WEB_RATE_SEEN_KEY]).toBeUndefined();
    expect(defaultGameState.story.seen[LEGACY_WEB_RATE_SEEN_KEY]).toBeUndefined();
  });

  it("pays the building bonus through villager production and leaves job costs alone", () => {
    const state = stateWith(1);
    state.buildings.primeFoundry = 1;
    state.buildings.masterworkFoundry = 1;
    state.buildings.masterTannery = 1;
    state.buildings.highTannery = 1;
    state.villagers.steel_forger = 2;
    state.villagers.tanner = 3;

    // Base 1 plus Prime Foundry +1 and Masterwork Foundry +2.
    expect(produced("steel_forger", 2, state, "steel")).toBe((1 + 1 + 2) * 2);
    expect(produced("steel_forger", 2, state, "iron")).toBe(-10);
    expect(produced("steel_forger", 2, state, "coal")).toBe(-10);
    expect(produced("steel_forger", 2, state, "food")).toBe(-10);

    expect(produced("tanner", 3, state, "leather")).toBe((1 + 1 + 2) * 3);
    expect(produced("tanner", 3, state, "fur")).toBe(-30);
  });

  it("does not change the basic foundry, basic tannery, or unrelated buildings", () => {
    const state = stateWith(1);
    state.buildings.foundry = 1;
    state.buildings.tannery = 1;
    state.buildings.greatCabin = 1;
    state.buildings.herbGarden = 1;
    state.story.seen.veinrootDiscovered = true;

    expect(villageBuildActions.buildFoundry.productionEffects).toBeUndefined();
    expect(villageBuildActions.buildTannery.productionEffects).toBeUndefined();
    expect(produced("steel_forger", 1, state, "steel")).toBe(1);
    expect(produced("tanner", 1, state, "leather")).toBe(1);
    expect(villageBuildActions.buildGreatCabin.productionEffects).toEqual({
      hunter: { food: 5, fur: 1, bones: 1 },
    });
    expect(produced("hunter", 1, state, "food")).toBe(5 + 5);
    expect(villageBuildActions.buildHerbGarden.productionEffects).toEqual({
      gatherer: { veinroot: 2 },
    });
    expect(produced("gatherer", 1, state, "veinroot")).toBe(1 + 2);
  });

  it("still halves a damaged building tooltip from the same rate", () => {
    const state = stateWith(1);
    expect(tooltipLines("buildPrimeFoundry", state, true)).toContain(
      "Steel Forger: +0 Steel",
    );
    expect(tooltipLines("buildHighTannery", state, true)).toContain(
      "Tanner: +1 Leather",
    );
  });

  it("uses web rates when an old Steam save is loaded", () => {
    const legacy = gameStateSchema.parse({
      BTP: 1,
      playTime: 60_000,
      buildings: { primeFoundry: 1, highTannery: 1 },
      story: { seen: { firstWolfAttack: true } },
    });
    const migrated = applyGameStateLoadMigrations(hydrateLoadedGameState(legacy));

    expect(migrated.story.seen[LEGACY_WEB_RATE_SEEN_KEY]).toBeUndefined();
    expect(migrated.BTP).toBe(1);
    expect(produced("steel_forger", 2, migrated, "steel")).toBe((1 + 1) * 2);
    expect(produced("tanner", 2, migrated, "leather")).toBe((1 + 2) * 2);
  });

  it("ignores a leftover web-rate flag on a loaded save", () => {
    const flagged = gameStateSchema.parse({
      BTP: 1,
      playTime: 5_000,
      buildings: { masterworkFoundry: 1, masterTannery: 1 },
      story: { seen: { [LEGACY_WEB_RATE_SEEN_KEY]: true } },
    });
    const migrated = applyGameStateLoadMigrations(hydrateLoadedGameState(flagged));

    expect(migrated.story.seen[LEGACY_WEB_RATE_SEEN_KEY]).toBe(true);
    expect(produced("steel_forger", 2, migrated, "steel")).toBe((1 + 2) * 2);
    expect(produced("tanner", 4, migrated, "leather")).toBe((1 + 1) * 4);
  });
});
