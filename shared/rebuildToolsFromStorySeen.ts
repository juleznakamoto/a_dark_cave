/**
 * Rebuild permanent craftable tools from `story.seen` flags (migration 026 mapping).
 * Only sets tools to `true` from provable craft flags — never removes owned tools.
 */

export const TOOL_REBUILD_FROM_STORY_SEEN = [
  { toolKey: "stone_axe", seenKeys: ["hasStoneAxe", "actionCraftStoneAxe"] },
  { toolKey: "stone_pickaxe", seenKeys: ["hasStonePickaxe", "actionCraftStonePickaxe"] },
  { toolKey: "iron_axe", seenKeys: ["hasIronAxe", "actionCraftIronAxe"] },
  { toolKey: "iron_pickaxe", seenKeys: ["hasIronPickaxe", "actionCraftIronPickaxe"] },
  { toolKey: "iron_lantern", seenKeys: ["hasIronLantern", "actionCraftIronLantern"] },
  { toolKey: "steel_axe", seenKeys: ["hasSteelAxe", "actionCraftSteelAxe"] },
  { toolKey: "steel_pickaxe", seenKeys: ["hasSteelPickaxe", "actionCraftSteelPickaxe"] },
  { toolKey: "steel_lantern", seenKeys: ["hasSteelLantern", "actionCraftSteelLantern"] },
  { toolKey: "obsidian_axe", seenKeys: ["hasObsidianAxe", "actionCraftObsidianAxe"] },
  {
    toolKey: "obsidian_pickaxe",
    seenKeys: ["hasObsidianPickaxe", "actionCraftObsidianPickaxe"],
  },
  {
    toolKey: "obsidian_lantern",
    seenKeys: ["hasObsidianLantern", "actionCraftObsidianLantern"],
  },
  { toolKey: "adamant_axe", seenKeys: ["hasAdamantAxe", "actionCraftAdamantAxe"] },
  {
    toolKey: "adamant_pickaxe",
    seenKeys: ["hasAdamantPickaxe", "actionCraftAdamantPickaxe"],
  },
  {
    toolKey: "adamant_lantern",
    seenKeys: ["hasAdamantLantern", "actionCraftAdamantLantern"],
  },
  {
    toolKey: "blacksteel_axe",
    seenKeys: ["hasBlacksteelAxe", "actionCraftBlacksteelAxe"],
  },
  {
    toolKey: "blacksteel_pickaxe",
    seenKeys: ["hasBlacksteelPickaxe", "actionCraftBlacksteelPickaxe"],
  },
  {
    toolKey: "blacksteel_lantern",
    seenKeys: ["hasBlacksteelLantern", "actionCraftBlacksteelLantern"],
  },
  { toolKey: "blacksmith_hammer", seenKeys: ["blacksmithHammerChoice"] },
] as const;

function asSeenRecord(storySeen: unknown): Record<string, unknown> | null {
  if (!storySeen || typeof storySeen !== "object" || Array.isArray(storySeen)) {
    return null;
  }
  return storySeen as Record<string, unknown>;
}

/** Overlay craft-flag-derived owned tools onto a tools slice (add-only). */
export function overlayToolsFromStorySeen<T extends Record<string, boolean>>(
  tools: T,
  storySeen: unknown,
): T {
  const seen = asSeenRecord(storySeen);
  if (!seen) return tools;

  const result = { ...tools };
  for (const { toolKey, seenKeys } of TOOL_REBUILD_FROM_STORY_SEEN) {
    if (seenKeys.some((key) => seen[key] === true)) {
      (result as Record<string, boolean>)[toolKey] = true;
    }
  }
  return result;
}
