import { SHOP_ITEMS } from "./shopItems";

export function isNonRepeatableShopItem(itemId: string): boolean {
  const item = SHOP_ITEMS[itemId];
  return !!item && !item.canPurchaseMultipleTimes;
}

export function userOwnsShopItemFromPurchaseRows(
  itemId: string,
  rows: Array<{ item_id: string }>,
): boolean {
  if (!isNonRepeatableShopItem(itemId)) {
    return false;
  }
  return rows.some((row) => row.item_id === itemId);
}
