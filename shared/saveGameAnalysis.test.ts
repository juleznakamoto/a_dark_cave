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
        flags: { villageUnlocked: true, gameStarted: true },
        story: { seen: { hasStoneAxe: true } },
        buildings: {},
        resources: { wood: 1 },
        villagers: {},
        stats: { luck: 0, strength: 0, knowledge: 0, madness: 0 },
      },
    });
    expect(result.issues).toHaveLength(0);
  });

  it("detects missing villageUnlocked despite stone axe / huts", () => {
    const result = analyzeSaveGameRow({
      ...baseRow,
      game_state: {
        playTime: 120_000,
        tools: { stone_axe: true },
        buildings: { woodenHut: 3 },
        flags: { gameStarted: true, villagerCapsEnabled: true },
      },
    });
    expect(result.issues.some((i) => i.kind === "missing_unlock_flags")).toBe(
      true,
    );
  });

  it("detects tool craft mismatch when some tools are wiped", () => {
    const result = analyzeSaveGameRow({
      ...baseRow,
      game_state: {
        playTime: 120_000,
        tools: { stone_axe: true, iron_axe: false },
        flags: { villageUnlocked: true, gameStarted: true },
        story: { seen: { hasStoneAxe: true, hasIronAxe: true } },
      },
    });
    expect(result.issues.some((i) => i.kind === "tool_craft_mismatch")).toBe(
      true,
    );
    expect(
      result.issues.find((i) => i.kind === "tool_craft_mismatch")?.detail,
    ).toContain("iron_axe");
  });

  it("does not flag blacksmithHammerChoice without hammer (leave is valid)", () => {
    const result = analyzeSaveGameRow({
      ...baseRow,
      game_state: {
        playTime: 120_000,
        tools: { stone_axe: true, blacksmith_hammer: false },
        flags: {
          villageUnlocked: true,
          forestUnlocked: true,
          gameStarted: true,
        },
        story: {
          seen: { hasStoneAxe: true, blacksmithHammerChoice: true },
        },
      },
    });
    expect(result.issues.some((i) => i.kind === "tool_craft_mismatch")).toBe(
      false,
    );
  });

  it("detects wiped weapons from craft story flags", () => {
    const result = analyzeSaveGameRow({
      ...baseRow,
      game_state: {
        playTime: 120_000,
        tools: { stone_axe: true },
        weapons: { war_bow: false },
        flags: {
          villageUnlocked: true,
          forestUnlocked: true,
          gameStarted: true,
        },
        story: { seen: { hasStoneAxe: true, hasWarBow: true } },
      },
    });
    expect(result.issues.some((i) => i.kind === "wiped_weapons")).toBe(true);
  });

  it("does not flag leftover button upgrades without Book of Ascension", () => {
    // Older clients tracked mastery clicks/levels for everyone. The book only
    // applies the bonus; upgrades without it are not a wipe.
    const result = analyzeSaveGameRow({
      ...baseRow,
      game_state: {
        playTime: 60_000,
        books: { book_of_ascension: false },
        buttonUpgrades: {
          hunt: { clicks: 64, level: 3 },
          chopWood: { clicks: 134, level: 3 },
          caveExplore: { clicks: 10, level: 2 },
        },
      },
    });
    expect(result.issues).toHaveLength(0);
  });

  it("detects missing foundational slices on progressed saves", () => {
    const result = analyzeSaveGameRow({
      ...baseRow,
      game_state: {
        playTime: 10 * 60_000,
        tools: { stone_axe: true },
        flags: { villageUnlocked: true, gameStarted: true },
        story: { seen: { hasStoneAxe: true } },
      },
    });
    expect(
      result.issues.some((i) => i.kind === "missing_foundational_slices"),
    ).toBe(true);
    expect(
      result.issues.find((i) => i.kind === "missing_foundational_slices")
        ?.detail,
    ).toEqual(expect.stringContaining("buildings"));
  });

  it("detects missing buildings when villagers remain", () => {
    const result = analyzeSaveGameRow({
      ...baseRow,
      game_state: {
        playTime: 60_000,
        villagers: { free: 2 },
        tools: { stone_axe: true },
        flags: { villageUnlocked: true, gameStarted: true },
      },
    });
    expect(
      result.issues.some((i) => i.kind === "missing_buildings_with_progress"),
    ).toBe(true);
  });

  it("detects wiped craft clothing", () => {
    const result = analyzeSaveGameRow({
      ...baseRow,
      game_state: {
        playTime: 60_000,
        clothing: { explorer_pack: false },
        story: { seen: { hasExplorerPack: true } },
      },
    });
    expect(result.issues.some((i) => i.kind === "wiped_craft_clothing")).toBe(
      true,
    );
  });

  it("detects missing gameStarted despite unlock evidence", () => {
    const result = analyzeSaveGameRow({
      ...baseRow,
      game_state: {
        playTime: 60_000,
        tools: { stone_axe: true },
        flags: { villageUnlocked: true, gameStarted: false },
        story: { seen: { hasStoneAxe: true } },
      },
    });
    expect(result.issues.some((i) => i.kind === "missing_game_started")).toBe(
      true,
    );
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

  it("flags clients not on the current build SHA", () => {
    const summary = analyzeSaveGames(
      [
        {
          ...baseRow,
          user_id: "current",
          game_state: {
            playTime: 0,
            clientBuildSha: "abc123",
            tools: { stone_axe: true },
            flags: { villageUnlocked: true, gameStarted: true },
            story: { seen: { hasStoneAxe: true } },
          },
        },
        {
          ...baseRow,
          user_id: "outdated",
          game_state: {
            playTime: 0,
            clientBuildSha: "old999",
            tools: { stone_axe: true },
            flags: { villageUnlocked: true, gameStarted: true },
            story: { seen: { hasStoneAxe: true } },
          },
        },
        {
          ...baseRow,
          user_id: "unknown",
          game_state: {
            playTime: 0,
            tools: { stone_axe: true },
            flags: { villageUnlocked: true, gameStarted: true },
            story: { seen: { hasStoneAxe: true } },
          },
        },
      ],
      { currentBuildSha: "abc123" },
    );

    expect(summary.currentBuildSha).toBe("abc123");
    expect(summary.onCurrentVersion).toBe(1);
    expect(summary.notOnCurrentVersion).toBe(2);
    expect(summary.rowsWithIssues).toBe(0);

    const byUser = Object.fromEntries(
      summary.rows.map((row) => [row.user_id, row]),
    );
    expect(byUser.current.isCurrentVersion).toBe(true);
    expect(byUser.outdated.isCurrentVersion).toBe(false);
    expect(byUser.outdated.clientBuildSha).toBe("old999");
    expect(byUser.unknown.isCurrentVersion).toBe(false);
    expect(byUser.unknown.clientBuildSha).toBeNull();
  });

  it("hasCraftToolStoryFlags respects flag list", () => {
    expect(hasCraftToolStoryFlags({ hasSteelAxe: true })).toBe(true);
    expect(hasCraftToolStoryFlags({ fireLit: true })).toBe(false);
  });

  it("analyzeSaveGames summarizes rows without v2 sidecar compare", () => {
    const summary = analyzeSaveGames([
      {
        ...baseRow,
        game_state: { playTime: 0, resources: { wood: 1 } },
      },
    ]);
    expect(summary.scanned).toBe(1);
    expect(summary.rowsWithIssues).toBe(0);
    expect(summary.rows).toHaveLength(1);
  });
});
