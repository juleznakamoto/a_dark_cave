/**
 * Actions / grant paths whose warehouse-limited resource gains may exceed storage.
 * Production, crafting, and explore/mine/chop stay soft-capped.
 */

/** Forest gold→warehouse buys (bombs / Veinfire / Insight keep their own hard caps). */
export const FOREST_WAREHOUSE_OVERCAP_TRADE_IDS = [
  "tradeGoldForFood",
  "tradeGoldForWood",
  "tradeGoldForStone",
  "tradeGoldForIron",
  "tradeGoldForLeather",
  "tradeGoldForSteel",
  "tradeGoldForObsidian",
  "tradeGoldForAdamant",
  "tradeGoldForBlacksteel",
  "tradeGoldForTorch",
] as const;

export function actionAllowsResourceOvercap(actionId: string): boolean {
  return (FOREST_WAREHOUSE_OVERCAP_TRADE_IDS as readonly string[]).includes(
    actionId,
  );
}
