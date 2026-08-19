import React from "react";
import type { MerchantTradeData } from "@/game/types";
import { getEffectDescription } from "@/i18n/resolveGameText";
import { getUiTooltip } from "@/i18n/tooltipLabels";
import { composeActionTooltip } from "./actionTooltipLayout";
import {
  bookEffects,
  clothingEffects,
  toolEffects,
  weaponEffects,
} from "./effects";
import { CLARITY_ELIXIR_MADNESS_REDUCTION } from "./eventsMerchant";
import {
  renderItemTooltip,
  type ItemTooltipDisplay,
} from "./itemTooltips";

const EFFECTS_ONLY_DISPLAY: ItemTooltipDisplay = {
  showTitle: false,
  showDescription: false,
  showEffects: true,
};

type MerchantItemTooltipType = "weapon" | "tool" | "blessing" | "book";

function merchantBuyResourceToItemType(
  buyResource: string | undefined,
): MerchantItemTooltipType | null {
  switch (buyResource) {
    case "tool":
      return "tool";
    case "weapon":
      return "weapon";
    case "book":
      return "book";
    case "schematic":
    case "relic":
      return "blessing";
    default:
      return null;
  }
}

function itemTypeToEffectCategory(
  itemType: MerchantItemTooltipType,
): "weapons" | "tools" | "clothing" | "books" {
  switch (itemType) {
    case "weapon":
      return "weapons";
    case "tool":
      return "tools";
    case "book":
      return "books";
    case "blessing":
      return "clothing";
  }
}

function lookupMerchantItemEffect(
  itemId: string,
  itemType: MerchantItemTooltipType,
) {
  switch (itemType) {
    case "weapon":
      return weaponEffects[itemId];
    case "tool":
      return toolEffects[itemId];
    case "book":
      return bookEffects[itemId];
    case "blessing":
      return clothingEffects[itemId];
  }
}

type MerchantItemTrade = Pick<MerchantTradeData, "buyItem"> &
  Partial<Pick<MerchantTradeData, "buyResource">>;

export function getMerchantSpecialItemTooltipParts(
  trade: MerchantItemTrade,
): { effects: React.ReactNode | null; description?: string } {
  const itemId = trade.buyItem;
  if (!itemId) return { effects: null };

  if (itemId === "clarity_elixir") {
    return {
      effects: (
        <div>
          {getUiTooltip("buildings.madnessReduction", "-{{amount}} Madness", {
            amount: CLARITY_ELIXIR_MADNESS_REDUCTION,
          })}
        </div>
      ),
      description: getUiTooltip(
        "clarityElixirDescription",
        "A draught that eases the grip of madness.",
      ),
    };
  }

  const itemType = merchantBuyResourceToItemType(trade.buyResource);
  if (!itemType) return { effects: null };

  const effect = lookupMerchantItemEffect(itemId, itemType);
  if (!effect) return { effects: null };

  const effects = renderItemTooltip(
    itemId,
    itemType,
    undefined,
    EFFECTS_ONLY_DISPLAY,
  );
  const description = getEffectDescription(
    itemTypeToEffectCategory(itemType),
    itemId,
    effect.description,
  );

  return { effects, description };
}

/** Building-style tooltip: cost, effects, description. Null if this is not a special item. */
export function composeMerchantSpecialItemTooltip(
  trade: MerchantItemTrade,
  costHeader: React.ReactNode | undefined,
): React.ReactNode | null {
  if (!trade.buyItem) return null;

  const { effects, description } = getMerchantSpecialItemTooltipParts(trade);
  if (effects == null && !description) return null;

  return composeActionTooltip({
    header: costHeader,
    effects,
    description,
    style: { width: "12rem" },
  });
}
