import {
  consumeShopDiscountsInGameState,
  resolveAppliedShopDiscountOptions,
  shopDiscountFlagsFromPaymentMetadata,
  type ShopDiscountGameState,
  type ShopDiscountMetadataFlags,
  type ShopDiscountRequest,
} from "../shared/shopDiscountEligibility";
import { userOwnsShopItemFromPurchaseRows } from "../shared/shopPurchaseEligibility";
import { SHOP_ITEMS } from "../shared/shopItems";

type PurchaseRow = { item_id: string };

export async function fetchUserPurchaseItemRows(
  supabase: {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => Promise<{
          data: PurchaseRow[] | null;
          error: { message?: string } | null;
        }>;
      };
    };
  },
  userId: string,
): Promise<PurchaseRow[]> {
  const { data, error } = await supabase
    .from("purchases")
    .select("item_id")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message || "Failed to load purchases");
  }
  return data ?? [];
}

export async function userAlreadyOwnsShopItem(
  supabase: Parameters<typeof fetchUserPurchaseItemRows>[0],
  userId: string,
  itemId: string,
): Promise<boolean> {
  const rows = await fetchUserPurchaseItemRows(supabase, userId);
  return userOwnsShopItemFromPurchaseRows(itemId, rows);
}

export async function fetchShopDiscountGameState(
  supabase: {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (
          col: string,
          val: string,
        ) => {
          maybeSingle: () => Promise<{
            data: { game_state?: ShopDiscountGameState } | null;
            error: { message?: string } | null;
          }>;
        };
      };
    };
  },
  userId: string,
): Promise<ShopDiscountGameState | null> {
  const { data, error } = await supabase
    .from("game_saves")
    .select("game_state")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load game save");
  }
  return data?.game_state ?? null;
}

export async function resolveServerShopDiscountOptions(
  supabase: Parameters<typeof fetchShopDiscountGameState>[0],
  userId: string | undefined,
  itemId: string,
  requested: ShopDiscountRequest,
): Promise<ShopDiscountOptionsResolved> {
  if (!userId) {
    return {};
  }
  const gameState = await fetchShopDiscountGameState(supabase, userId);
  return resolveAppliedShopDiscountOptions(gameState, itemId, requested);
}

type ShopDiscountOptionsResolved = ShopDiscountRequest;

export function assertShopDiscountMetadataAllowed(
  gameState: ShopDiscountGameState | null,
  itemId: string,
  metadata: Record<string, string | undefined>,
): { ok: true } | { ok: false; error: string } {
  const applied = shopDiscountFlagsFromPaymentMetadata(metadata);
  const eligible = resolveAppliedShopDiscountOptions(
    gameState,
    itemId,
    applied,
  );

  if (applied.tradersGratitude && !eligible.tradersGratitude) {
    return { ok: false, error: "Trader's Gratitude discount not eligible" };
  }
  if (applied.tradersSonGratitude && !eligible.tradersSonGratitude) {
    return { ok: false, error: "Trader's Son discount not eligible" };
  }
  if (applied.playlightFirstPurchase && !eligible.playlightFirstPurchase) {
    return { ok: false, error: "Playlight discount not eligible" };
  }
  if (applied.cruelModeJourneyComplete && !eligible.cruelModeJourneyComplete) {
    return { ok: false, error: "Journey complete discount not eligible" };
  }

  return { ok: true };
}

export async function persistShopDiscountConsumption(
  supabase: {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (
          col: string,
          val: string,
        ) => {
          maybeSingle: () => Promise<{
            data: { game_state?: ShopDiscountGameState } | null;
            error: unknown;
          }>;
        };
      };
      update: (payload: Record<string, unknown>) => {
        eq: (col: string, val: string) => Promise<{ error: unknown }>;
      };
    };
  },
  userId: string,
  applied: ShopDiscountMetadataFlags,
): Promise<void> {
  const hasDiscount =
    applied.tradersGratitude ||
    applied.tradersSonGratitude ||
    applied.playlightFirstPurchase ||
    applied.cruelModeJourneyComplete;
  if (!hasDiscount) {
    return;
  }

  const { data, error } = await supabase
    .from("game_saves")
    .select("game_state")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data?.game_state) {
    return;
  }

  const updatedState = consumeShopDiscountsInGameState(data.game_state, applied);
  await supabase
    .from("game_saves")
    .update({
      game_state: updatedState,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

export async function assertCanPurchaseShopItem(
  supabase: Parameters<typeof userAlreadyOwnsShopItem>[0],
  userId: string,
  itemId: string,
): Promise<void> {
  const item = SHOP_ITEMS[itemId];
  if (!item) {
    throw new Error("Invalid item");
  }
  if (!item.canPurchaseMultipleTimes) {
    const owned = await userAlreadyOwnsShopItem(supabase, userId, itemId);
    if (owned) {
      throw new Error("Item already purchased");
    }
  }
}
