import { describe, expect, it } from "vitest";
import {
  analyzeSaveGameRow,
  analyzeSaveGames,
  compareLegacyAndV2Saves,
  compareLegacyVsV2Row,
  computeCurrentPopulationFromGameState,
  computeMaxPopulationFromGameState,
  hasCraftToolStoryFlags,
} from "./saveGameAnalysis";

describe("saveGameAnalysis", () => {
  const baseRow = {
    user_id: "user-1",
    updated_at: "2026-07-15T10:00:00.000Z",
    created_at: "2026-07-15T09:00:00.000Z",
    game_state: { playTime: 60_000, resources: { wood: 5 } },
  };

  it("detects missing tools with craft story flags", () => {
    const result = analyzeSaveGameRow({
      ...baseRow,
      game_state: {
        playTime: 120_000,
        story: { seen: { hasStoneAxe: true } },
      },
    });
    expect(result.issues.some((i) => i.kind === "missing_tools_with_craft_flags")).toBe(
      true,
    );
  });

  it("detects wiped tools (key present, zero owned, craft flags)", () => {
    const result = analyzeSaveGameRow({
      ...baseRow,
      game_state: {
        playTime: 120_000,
        tools: { stone_axe: false, stone_pickaxe: false },
        story: { seen: { actionCraftStoneAxe: true } },
      },
    });
    expect(result.issues.some((i) => i.kind === "wiped_tools")).toBe(true);
  });

  it("passes clean save with owned tools and craft flags", () => {
    const result = analyzeSaveGameRow({
      ...baseRow,
      game_state: {
        playTime: 120_000,
        tools: { stone_axe: true },
        story: { seen: { hasStoneAxe: true } },
      },
    });
    expect(result.issues).toHaveLength(0);
  });

  it("detects wiped buildings (key present, zero total, build flags)", () => {
    const result = analyzeSaveGameRow({
      ...baseRow,
      game_state: {
        playTime: 120_000,
        buildings: { woodenHut: 0, cabin: 0 },
        story: { seen: { actionBuildWoodenHut: true } },
      },
    });
    expect(result.issues.some((i) => i.kind === "wiped_buildings")).toBe(true);
    expect(result.buildings_total).toBe(0);
  });

  it("detects missing buildings key with village story evidence", () => {
    const result = analyzeSaveGameRow({
      ...baseRow,
      game_state: {
        playTime: 120_000,
        story: { seen: { hasVillagers: true } },
      },
    });
    expect(
      result.issues.some((i) => i.kind === "missing_buildings_with_build_flags"),
    ).toBe(true);
  });

  it("passes clean save with buildings and build flags", () => {
    const result = analyzeSaveGameRow({
      ...baseRow,
      game_state: {
        playTime: 120_000,
        buildings: { woodenHut: 3 },
        story: { seen: { actionBuildWoodenHut: true } },
      },
    });
    expect(result.issues).toHaveLength(0);
    expect(result.buildings_total).toBe(3);
  });

  it("does not flag null or undefined resources (treated as 0 at runtime)", () => {
    const result = analyzeSaveGameRow({
      ...baseRow,
      game_state: {
        playTime: 0,
        resources: { stone: null, wood: undefined, gold: 1 },
      },
    });
    expect(result.issues.some((i) => i.kind === "non_numeric_resource")).toBe(false);
  });

  it("flags non-number resource types", () => {
    const result = analyzeSaveGameRow({
      ...baseRow,
      game_state: {
        playTime: 0,
        resources: { stone: "5", wood: 1 },
      },
    });
    expect(result.issues.some((i) => i.kind === "non_numeric_resource")).toBe(true);
  });

  it("detects villagers over housing cap from live counts, not cached fields", () => {
    const gs = {
      playTime: 60_000,
      villagers: { gatherer: 6 },
      buildings: { woodenHut: 2 },
      current_population: 0,
      total_population: 99,
    };
    expect(computeCurrentPopulationFromGameState(gs)).toBe(6);
    expect(computeMaxPopulationFromGameState(gs)).toBe(4);
    const result = analyzeSaveGameRow({ ...baseRow, game_state: gs });
    expect(result.issues.some((i) => i.kind === "population_mismatch")).toBe(true);
  });

  it("does not count stale expedition locks without in-flight execution", () => {
    const gs = {
      playTime: 60_000,
      villagers: { gatherer: 6 },
      buildings: { woodenHut: 2 },
      expeditionVillagers: { exploreCave: 20 },
      executionStartTimes: {},
    };
    expect(computeCurrentPopulationFromGameState(gs)).toBe(6);
    const result = analyzeSaveGameRow({ ...baseRow, game_state: gs });
    expect(result.issues.some((i) => i.kind === "population_mismatch")).toBe(true);
  });

  it("counts expedition villagers only while their action is in flight", () => {
    const updatedAt = "2026-07-15T15:00:00.000Z";
    const updatedMs = Date.parse(updatedAt);
    const gs = {
      playTime: 60_000,
      villagers: { gatherer: 3, free: 2 },
      buildings: { woodenHut: 2 },
      expeditionVillagers: { exploreCave: 3 },
      executionStartTimes: { exploreCave: updatedMs - 30_000 },
      executionDurations: { exploreCave: 60 },
    };
    expect(computeCurrentPopulationFromGameState(gs, updatedMs)).toBe(8);
  });

  it("ignores overdue expedition locks when analyzing cloud saves", () => {
    const updatedAt = "2026-07-15T15:00:00.000Z";
    const updatedMs = Date.parse(updatedAt);
    const gs = {
      playTime: 60_000,
      villagers: { gatherer: 3, free: 2 },
      buildings: { woodenHut: 2 },
      expeditionVillagers: { exploreCave: 3 },
      executionStartTimes: { exploreCave: updatedMs - 120_000 },
      executionDurations: { exploreCave: 60 },
    };
    expect(computeCurrentPopulationFromGameState(gs, updatedMs)).toBe(5);
  });

  it("ignores stale cached population fields when villager counts fit housing", () => {
    const result = analyzeSaveGameRow({
      ...baseRow,
      game_state: {
        playTime: 60_000,
        villagers: { gatherer: 2 },
        buildings: { woodenHut: 2 },
        current_population: 118,
        total_population: 0,
      },
    });
    expect(result.issues.some((i) => i.kind === "population_mismatch")).toBe(false);
  });

  it("summarizes batch analysis", () => {
    const summary = analyzeSaveGames([
      {
        ...baseRow,
        game_state: { playTime: 0, resources: { wood: 1 } },
      },
      {
        ...baseRow,
        user_id: "user-2",
        game_state: {
          playTime: 0,
          story: { seen: { hasIronAxe: true } },
        },
      },
    ]);
    expect(summary.scanned).toBe(2);
    expect(summary.rowsWithIssues).toBe(1);
    expect(summary.byKind.missing_tools_with_craft_flags).toBe(1);
  });

  it("hasCraftToolStoryFlags respects flag list", () => {
    expect(hasCraftToolStoryFlags({ hasSteelAxe: true })).toBe(true);
    expect(hasCraftToolStoryFlags({ fireLit: true })).toBe(false);
  });

  it("compareLegacyVsV2Row reports missing_v2", () => {
    const result = compareLegacyVsV2Row({
      ...baseRow,
      game_state: {
        playTime: 1000,
        tools: { stone_axe: true },
        buildings: { woodenHut: 1 },
        resources: { wood: 1 },
        villagers: { free: 1 },
        flags: { gameStarted: true },
        weapons: {},
        books: {},
      },
    });
    expect(result.status).toBe("missing_v2");
  });

  it("compareLegacyVsV2Row reports match on full state (playTime floored)", () => {
    const gs = {
      playTime: 1000.9,
      tools: { stone_axe: true },
      buildings: { woodenHut: 1 },
      resources: { wood: 1 },
      villagers: { free: 1 },
      flags: { gameStarted: true },
      weapons: {},
      books: {},
      story: { seen: { fireLit: true } },
    };
    const result = compareLegacyVsV2Row({
      ...baseRow,
      game_state: gs,
      game_state_v2: { ...gs, playTime: 1000.2 },
      save_revision: 3,
      schema_version: 1,
    });
    expect(result.status).toBe("match");
    expect(result.mismatchCount).toBeNull();
    expect(result.save_revision).toBe(3);
  });

  it("compareLegacyVsV2Row flags any top-level key drift, not only critical slices", () => {
    const gs = {
      playTime: 1000,
      tools: { stone_axe: true },
      buildings: {},
      resources: {},
      villagers: {},
      flags: {},
      weapons: {},
      books: {},
      story: { seen: { fireLit: true } },
    };
    const result = compareLegacyVsV2Row({
      ...baseRow,
      game_state: gs,
      game_state_v2: {
        ...gs,
        story: { seen: { fireLit: true, gatherWood: true } },
      },
      save_revision: 1,
      schema_version: 1,
    });
    expect(result.status).toBe("mismatch");
    expect(result.details).toContain("story");
    expect(result.mismatchCount).toBe(1);
  });

  it("compareLegacyVsV2Row reports keys only present on one side", () => {
    const result = compareLegacyVsV2Row({
      ...baseRow,
      game_state: {
        playTime: 1,
        tools: {},
        extraLegacy: true,
      },
      game_state_v2: {
        playTime: 1,
        tools: {},
        extraV2: true,
      },
      save_revision: 1,
      schema_version: 1,
    });
    expect(result.status).toBe("mismatch");
    expect(result.details).toEqual(
      expect.arrayContaining(["extraLegacy (v1-only)", "extraV2 (v2-only)"]),
    );
  });

  it("compareLegacyAndV2Saves summarizes coverage", () => {
    const summary = compareLegacyAndV2Saves([
      {
        ...baseRow,
        game_state: { playTime: 1, tools: {}, buildings: {}, resources: {}, villagers: {}, flags: {}, weapons: {}, books: {} },
      },
      {
        ...baseRow,
        user_id: "user-2",
        game_state: {
          playTime: 1,
          tools: { stone_axe: true },
          buildings: {},
          resources: {},
          villagers: {},
          flags: {},
          weapons: {},
          books: {},
        },
        game_state_v2: {
          playTime: 1,
          tools: { stone_axe: false },
          buildings: {},
          resources: {},
          villagers: {},
          flags: {},
          weapons: {},
          books: {},
        },
        save_revision: 1,
        schema_version: 1,
      },
    ]);
    expect(summary.missingV2).toBe(1);
    expect(summary.mismatch).toBe(1);
    expect(summary.withV2).toBe(1);
    expect(summary.rows).toHaveLength(2);
  });

  it("analyzeSaveGames includes v2Compare without changing legacy issue counts", () => {
    const summary = analyzeSaveGames([
      {
        ...baseRow,
        game_state: { playTime: 0, resources: { wood: 1 } },
      },
    ]);
    expect(summary.rowsWithIssues).toBe(0);
    expect(summary.v2Compare?.missingV2).toBe(1);
  });
});
