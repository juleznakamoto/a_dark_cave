import { clothingEffects, toolEffects, weaponEffects } from "./effects";
import { getEffectDescription } from "@/i18n/resolveGameText";

/** craftBlacksteelPickaxe → blacksteel_pickaxe */
export function craftActionIdToItemKey(actionId: string): string {
  return actionId
    .replace(/^craft/, "")
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

/** Localized item flavour text shown on craft buttons when Book of Craftsmanship is owned. */
export function getCraftItemDescription(actionId: string): string | undefined {
  const itemKey = craftActionIdToItemKey(actionId);

  const weapon = weaponEffects[itemKey];
  if (weapon?.description) {
    return getEffectDescription("weapons", itemKey, weapon.description);
  }

  const tool = toolEffects[itemKey];
  if (tool?.description) {
    return getEffectDescription("tools", itemKey, tool.description);
  }

  const clothing = clothingEffects[itemKey];
  if (clothing?.description) {
    return getEffectDescription("clothing", itemKey, clothing.description);
  }

  return undefined;
}
