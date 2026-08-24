/**
 * One-shot silver/gold loot: Steam / Galaxy / CrazyGames (BTP=1) grant
 * exactly double the web amount.
 */
export function btpLootAmount(
  baseAmount: number,
  state: { BTP?: number },
): number {
  return state.BTP === 1 ? baseAmount * 2 : baseAmount;
}
