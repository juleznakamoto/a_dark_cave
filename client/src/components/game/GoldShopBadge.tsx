import React from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGameStore } from "@/game/state";
import type { ShopOpenSource } from "@/game/shopOpenSource";

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
    <div className="absolute bottom-[-10px] right-[-7px] z-[30] pointer-events-auto">
      <button
        type="button"
        className="flex h-4 w-4 items-center justify-center rounded-full bg-yellow-700 text-white shadow-sm border border-yellow-500/60 hover:bg-yellow-600 transition-colors cursor-pointer"
        data-testid={testId}
        aria-label={label}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onOpen();
        }}
      >
        <Plus className="h-2.5 w-2.5 stroke-[3]" />
      </button>
    </div>
  );
}
