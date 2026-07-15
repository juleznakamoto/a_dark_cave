import { describe, expect, it } from "vitest";
import {
  analyzeSaveGameRow,
  analyzeSaveGames,
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
});
