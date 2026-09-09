import React from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { YELLOW_CORNER_DISC_CLASS } from "@/components/game/gameChrome";
import { useGameStore } from "@/game/state";
import type { ShopOpenSource } from "@/game/shopOpenSource";
import { cn } from "@/lib/utils";

/** Forest Buy row: special gold sinks only, not bulk food/wood/stone/… */
export const FOREST_GOLD_SHOP_ACTION_IDS = [
  "tradeGoldForEmberBomb",
  "tradeGoldForAshfireBomb",
  "tradeGoldForVoidBomb",
  "tradeGoldForVeinfireElixir",
  "tradeGoldForInsightPotion",
] as const;

const FOREST_GOLD_SHOP_ACTION_ID_SET = new Set<string>(FOREST_GOLD_SHOP_ACTION_IDS);

export function shouldShowGoldShopPlus({
  goldUnaffordable,
  traderUnlocked,
  steamEditionActive,
}: {
  goldUnaffordable: boolean;
  traderUnlocked: boolean;
  steamEditionActive: boolean;
}): boolean {
  return goldUnaffordable && traderUnlocked && !steamEditionActive;
}

export function shouldShowForestGoldShopPlus(
  actionId: string,
  args: Parameters<typeof shouldShowGoldShopPlus>[0],
): boolean {
  return FOREST_GOLD_SHOP_ACTION_ID_SET.has(actionId) && shouldShowGoldShopPlus(args);
}

export function openGoldShopFilter(source: ShopOpenSource): void {
  const store = useGameStore.getState();
  store.setShopFilter("gold");
  store.setShopDialogOpen(true, source);
}

export function GoldShopBadge({
  testId,
  onOpen,
}: {
  testId: string;
  onOpen: () => void;
}) {
  const { t } = useTranslation("ui");
  const label = t("timedEvent.buyGold", { defaultValue: "Buy Gold" });

  return (
    <div className="button-corner-badge-18">
      <button
        type="button"
        className={cn(
          YELLOW_CORNER_DISC_CLASS,
          "h-full w-full hover:bg-yellow-600 transition-colors cursor-pointer",
        )}
        data-testid={testId}
        aria-label={label}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onOpen();
        }}
      >
        <Plus className="h-3 w-3 stroke-[3]" />
      </button>
    </div>
  );
}
