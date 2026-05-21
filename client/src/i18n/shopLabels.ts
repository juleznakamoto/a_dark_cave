import type { ShopItem } from "@shared/shopItems";
import {
  getShopActivationMessage,
  getShopItemDescription,
  getShopItemName,
} from "./resolveGameText";

export function resolveShopItemName(item: ShopItem): string {
  return getShopItemName(item.id, item.name);
}

export function resolveShopItemDescription(
  item: ShopItem,
  options?: Record<string, string | number>,
): string {
  const fallback =
    item.description ||
    (item.category === "bundle" ? "" : item.description);
  return getShopItemDescription(item.id, fallback, options);
}

export function resolveShopActivationMessage(
  item: ShopItem,
  options?: Record<string, string | number>,
): string | undefined {
  return getShopActivationMessage(item.id, item.activationMessage, options);
}
