import { GameState } from "@shared/schema";
import { getGameActions } from "./rules/actionsRegistry";

const CRAFT_UPGRADE_KEYS = ["craftTorches", "craftBoneTotems", "craftLeatherTotems"] as const;

/**
 * Get the produce amount for craft upgrade keys (for "Produce x at a time" tooltip).
 * Returns the scaled amount from the action's effects for the current state.
 */
export function getCraftProduceAmount(
  upgradeKey: string,
  state: GameState,
): number | undefined {
  if (!CRAFT_UPGRADE_KEYS.includes(upgradeKey as (typeof CRAFT_UPGRADE_KEYS)[number])) {
    return undefined;
  }
  const action = getGameActions()[upgradeKey];
  if (!action?.effects) return undefined;
  const effects =
    typeof action.effects === "function" ? action.effects(state) : action.effects;
  if (upgradeKey === "craftTorches") {
    const torchEffect = effects["resources.torch"];
    if (typeof torchEffect === "string" && torchEffect.startsWith("random(")) {
      const m = torchEffect.match(/random\((\d+),(\d+)\)/);
      return m ? parseInt(m[1], 10) : undefined;
    }
  }
  if (upgradeKey === "craftBoneTotems") return effects["resources.bone_totem"];
  if (upgradeKey === "craftLeatherTotems") return effects["resources.leather_totem"];
  return undefined;
}
