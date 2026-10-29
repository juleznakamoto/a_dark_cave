import { describe, expect, it } from "vitest";
import { getPopulationProduction } from "@/game/population";
import { createInitialState, defaultGameState } from "@/game/store/createInitialState";
import { isSteamBuild } from "@/lib/edition";
import {
  applyGameStateLoadMigrations,
  hydrateLoadedGameState,
} from "@/game/stateHelpers";
import { gameStateSchema, type GameState } from "@shared/schema";
import { getBuildingTooltipEffectLines, getBuildingUpgradeMarginalEffectLines } from "./buildingTooltipSections";
import { villageBuildActions } from "./villageBuildActions";
import {
  WEB_FOUNDRY_TANNERY_PRODUCTION_SEEN_KEY,
  foundryTanneryAmount,
  usesWebFoundryTanneryProduction,
  webFoundryTanneryProductionForNewGame,
} from "./foundryTanneryProduction";

function stateWith(btp: number, webRates: boolean): GameState {
  const state = createInitialState();
  state.BTP = btp;
  if (webRates) {
    state.story.seen[WEB_FOUNDRY_TANNERY_PRODUCTION_SEEN_KEY] = true;
  } else {
    delete state.story.seen[WEB_FOUNDRY_TANNERY_PRODUCTION_SEEN_KEY];
  }
  return state;
}

function production(
  actionId: "buildPrimeFoundry" | "buildMasterworkFoundry" | "buildMasterTannery" | "buildHighTannery",
  state: GameState,
) {
  const effects = villageBuildActions[actionId].productionEffects;
  if (typeof effects !== "function") {
    throw new Error(`${actionId} productionEffects is not a function`);
  }
  return effects(state);
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
  it("gives new Steam games the web flag and leaves every other new game unmarked", () => {
    expect(webFoundryTanneryProductionForNewGame(true)).toBe(true);
    expect(webFoundryTanneryProductionForNewGame(false)).toBeUndefined();
    expect(
      createInitialState().story.seen[WEB_FOUNDRY_TANNERY_PRODUCTION_SEEN_KEY] ===
        true,
    ).toBe(isSteamBuild);
    expect(
      defaultGameState.story.seen[WEB_FOUNDRY_TANNERY_PRODUCTION_SEEN_KEY] ===
        true,
    ).toBe(isSteamBuild);
  });

  it("keeps the BTP bonus on a save that has no web-rate flag", () => {
    const state = stateWith(1, false);
    expect(usesWebFoundryTanneryProduction(state)).toBe(false);
    expect(production("buildPrimeFoundry", state)).toEqual({
      steel_forger: { steel: 2 },
    });
    expect(production("buildMasterworkFoundry", state)).toEqual({
      steel_forger: { steel: 3 },
    });
    expect(production("buildMasterTannery", state)).toEqual({
      tanner: { leather: 2 },
    });
    expect(production("buildHighTannery", state)).toEqual({
      tanner: { leather: 3 },
    });
    expect(tooltipLines("buildPrimeFoundry", state)).toEqual([
      "Unlocks Steel Forgers",
      "Steel Forger: +2 Steel",
    ]);
    expect(tooltipLines("buildMasterworkFoundry", state)).toEqual([
      "Unlocks Steel Forgers",
      "Unlocks Blacksteel Forgers",
      "Steel Forger: +3 Steel",
    ]);
    expect(tooltipLines("buildMasterTannery", state)).toEqual([
      "Unlocks Tanners",
      "Tanner: +2 Leather",
    ]);
    expect(tooltipLines("buildHighTannery", state)).toEqual([
      "Unlocks Tanners",
      "Tanner: +3 Leather",
    ]);
    expect(
      getBuildingUpgradeMarginalEffectLines("masterworkFoundry", state),
    ).toEqual(["Unlocks Blacksteel Forgers", "Steel Forger: +3 Steel"]);
    expect(getBuildingUpgradeMarginalEffectLines("highTannery", state)).toEqual([
      "Tanner: +3 Leather",
    ]);
  });

  it("uses web rates when the flag is set, including while BTP is on", () => {
    const state = stateWith(1, true);
    expect(production("buildPrimeFoundry", state).steel_forger.steel).toBe(1);
    expect(production("buildMasterworkFoundry", state).steel_forger.steel).toBe(2);
    expect(production("buildMasterTannery", state).tanner.leather).toBe(1);
    expect(production("buildHighTannery", state).tanner.leather).toBe(2);
    expect(tooltipLines("buildPrimeFoundry", state)).toContain(
      "Steel Forger: +1 Steel",
    );
    expect(tooltipLines("buildMasterworkFoundry", state)).toContain(
      "Steel Forger: +2 Steel",
    );
    expect(
      getBuildingUpgradeMarginalEffectLines("masterworkFoundry", state),
    ).toEqual(["Unlocks Blacksteel Forgers", "Steel Forger: +2 Steel"]);
    expect(tooltipLines("buildMasterTannery", state)).toContain(
      "Tanner: +1 Leather",
    );
    expect(tooltipLines("buildHighTannery", state)).toContain(
      "Tanner: +2 Leather",
    );
  });

  it("matches web rates for BTP 0 whether or not the flag is set", () => {
    for (const webRates of [false, true]) {
      const state = stateWith(0, webRates);
      expect(foundryTanneryAmount(state, 1)).toBe(1);
      expect(foundryTanneryAmount(state, 2)).toBe(2);
      expect(production("buildPrimeFoundry", state).steel_forger.steel).toBe(1);
      expect(production("buildHighTannery", state).tanner.leather).toBe(2);
    }
  });

  it("ignores anything other than an exact true flag", () => {
    const state = stateWith(1, false);
    state.story.seen[WEB_FOUNDRY_TANNERY_PRODUCTION_SEEN_KEY] = 1;
    expect(usesWebFoundryTanneryProduction(state)).toBe(false);
    expect(foundryTanneryAmount(state, 1)).toBe(2);
    expect(foundryTanneryAmount({ BTP: 1, story: { seen: {}, merchantPurchases: 0, heavySleeperHours: 0 } }, 2)).toBe(3);
  });

  it("pays the building bonus through villager production and leaves job costs alone", () => {
    const legacy = stateWith(1, false);
    legacy.buildings.primeFoundry = 1;
    legacy.buildings.masterworkFoundry = 1;
    legacy.buildings.masterTannery = 1;
    legacy.buildings.highTannery = 1;
    legacy.villagers.steel_forger = 2;
    legacy.villagers.tanner = 3;

    const web = stateWith(1, true);
    web.buildings = { ...legacy.buildings };
    web.villagers = { ...legacy.villagers };

    // Base 1 plus both foundry tiers. Legacy BTP adds +1 on each tier.
    expect(produced("steel_forger", 2, legacy, "steel")).toBe((1 + 2 + 3) * 2);
    expect(produced("steel_forger", 2, web, "steel")).toBe((1 + 1 + 2) * 2);
    expect(produced("steel_forger", 2, legacy, "iron")).toBe(-10);
    expect(produced("steel_forger", 2, web, "iron")).toBe(-10);
    expect(produced("steel_forger", 2, legacy, "coal")).toBe(-10);
    expect(produced("steel_forger", 2, web, "coal")).toBe(-10);
    expect(produced("steel_forger", 2, legacy, "food")).toBe(-10);
    expect(produced("steel_forger", 2, web, "food")).toBe(-10);

    expect(produced("tanner", 3, legacy, "leather")).toBe((1 + 2 + 3) * 3);
    expect(produced("tanner", 3, web, "leather")).toBe((1 + 1 + 2) * 3);
    expect(produced("tanner", 3, legacy, "fur")).toBe(-30);
    expect(produced("tanner", 3, web, "fur")).toBe(-30);
  });

  it("does not change the basic foundry, basic tannery, or unrelated buildings", () => {
    const state = stateWith(1, false);
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
    const legacy = stateWith(1, false);
    const web = stateWith(1, true);
    expect(tooltipLines("buildPrimeFoundry", legacy, true)).toContain(
      "Steel Forger: +1 Steel",
    );
    expect(tooltipLines("buildPrimeFoundry", web, true)).toContain(
      "Steel Forger: +0 Steel",
    );
    expect(tooltipLines("buildHighTannery", legacy, true)).toContain(
      "Tanner: +1 Leather",
    );
    expect(tooltipLines("buildHighTannery", web, true)).toContain(
      "Tanner: +1 Leather",
    );
  });

  it("does not stamp web rates onto an existing save when it is loaded", () => {
    const legacy = gameStateSchema.parse({
      BTP: 1,
      playTime: 60_000,
      buildings: { primeFoundry: 1, highTannery: 1 },
      story: { seen: { firstWolfAttack: true } },
    });
    expect(
      legacy.story.seen[WEB_FOUNDRY_TANNERY_PRODUCTION_SEEN_KEY],
    ).toBeUndefined();

    const hydrated = hydrateLoadedGameState(legacy);
    const migrated = applyGameStateLoadMigrations(hydrated);

    expect(
      migrated.story.seen[WEB_FOUNDRY_TANNERY_PRODUCTION_SEEN_KEY],
    ).toBeUndefined();
    expect(migrated.BTP).toBe(1);
    expect(migrated.buildings.primeFoundry).toBe(1);
    expect(production("buildPrimeFoundry", migrated).steel_forger.steel).toBe(2);
    expect(production("buildHighTannery", migrated).tanner.leather).toBe(3);
    expect(produced("steel_forger", 2, migrated, "steel")).toBe((1 + 2) * 2);
  });

  it("keeps web rates on a new Steam save after it is loaded again", () => {
    const fresh = gameStateSchema.parse({
      BTP: 1,
      playTime: 5_000,
      buildings: { masterworkFoundry: 1, masterTannery: 1 },
      story: { seen: { [WEB_FOUNDRY_TANNERY_PRODUCTION_SEEN_KEY]: true } },
    });
    const hydrated = hydrateLoadedGameState(fresh);
    const migrated = applyGameStateLoadMigrations(hydrated);

    expect(migrated.story.seen[WEB_FOUNDRY_TANNERY_PRODUCTION_SEEN_KEY]).toBe(
      true,
    );
    expect(production("buildMasterworkFoundry", migrated).steel_forger.steel).toBe(
      2,
    );
    expect(production("buildMasterTannery", migrated).tanner.leather).toBe(1);
    expect(produced("tanner", 4, migrated, "leather")).toBe((1 + 1) * 4);
  });
});
