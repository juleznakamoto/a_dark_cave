/** Entry sources for opening the real-money Trader / ShopDialog. */
export const SHOP_OPEN_SOURCES = [
  "tab",
  "footer",
  "gratitude",
  "url",
  "timedevent-buy-gold",
  "event",
] as const;

export type ShopOpenSource = (typeof SHOP_OPEN_SOURCES)[number];

/** button_clicks id written when the shop opens from this source. */
export function shopOpenButtonId(source: ShopOpenSource): string {
  return `shop-open-${source}`;
}
