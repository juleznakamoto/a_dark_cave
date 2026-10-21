import {
  getCollectorItemCategory,
  isCollectorItem,
} from "./collectorRejectedItems";
import {
  renderItemTooltip,
  SIDE_PANEL_ITEM_TOOLTIP_DISPLAY,
} from "./itemTooltips";

/** Item id on a collector buy/sell choice (`buy_bone_dice`, `sell_fang_charm`). */
export function collectorTradeItemId(choiceId: string): string | null {
  if (choiceId.startsWith("buy_")) {
    const itemId = choiceId.slice("buy_".length);
    return itemId.length > 0 ? itemId : null;
  }
  if (choiceId.startsWith("sell_") && choiceId !== "sell_nothing") {
    const itemId = choiceId.slice("sell_".length);
    return itemId.length > 0 ? itemId : null;
  }
  return null;
}

/** Same effects and description as the side-panel item tooltip. */
export function composeCollectorItemTooltip(choiceId: string) {
  const itemId = collectorTradeItemId(choiceId);
  // leatherbound_book is a Chainmaster resell, not in COLLECTOR_ITEMS.
  if (
    !itemId ||
    (!isCollectorItem(itemId) && itemId !== "leatherbound_book")
  ) {
    return null;
  }
  const category =
    itemId === "leatherbound_book"
      ? "relics"
      : getCollectorItemCategory(itemId);
  const itemType = category === "weapons" ? "weapon" : "blessing";
  return renderItemTooltip(
    itemId,
    itemType,
    undefined,
    SIDE_PANEL_ITEM_TOOLTIP_DISPLAY,
  );
}
