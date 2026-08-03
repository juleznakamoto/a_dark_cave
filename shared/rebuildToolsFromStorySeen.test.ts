import { describe, expect, it } from "vitest";
import { overlayToolsFromStorySeen } from "./rebuildToolsFromStorySeen";

describe("overlayToolsFromStorySeen", () => {
  it("sets tool keys from craft story flags", () => {
    const tools = { stone_axe: false, iron_pickaxe: false } as Record<string, boolean>;
    const result = overlayToolsFromStorySeen(tools, {
      hasStoneAxe: true,
      actionCraftIronPickaxe: true,
    });

    expect(result.stone_axe).toBe(true);
    expect(result.iron_pickaxe).toBe(true);
  });

  it("does not unset owned tools", () => {
    const tools = { stone_axe: true, iron_axe: false } as Record<string, boolean>;
    const result = overlayToolsFromStorySeen(tools, {});

    expect(result.stone_axe).toBe(true);
  });

  it("does not treat blacksmithHammerChoice as ownership", () => {
    const tools = { blacksmith_hammer: false } as Record<string, boolean>;
    const result = overlayToolsFromStorySeen(tools, {
      blacksmithHammerChoice: true,
    });

    // Flag is set on both take and leave; never infer the tool from it.
    expect(result.blacksmith_hammer).toBe(false);
  });
});
