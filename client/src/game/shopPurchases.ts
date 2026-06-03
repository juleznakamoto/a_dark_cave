import { getSupabaseClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { useGameStore } from '@/game/state';
import { SHOP_ITEMS } from '@shared/shopItems';
import { getSessionUser } from '@/game/auth';

export type PurchaseRow = { id: string | number; item_id: string };

/**
 * Extract itemId from purchaseId.
 * Format: purchase-{itemId}-{suffix}
 */
export function purchaseIdToItemId(purchaseId: string): string | null {
  if (!purchaseId.startsWith('purchase-')) return null;
  const withoutPrefix = purchaseId.substring('purchase-'.length);
  if (withoutPrefix.includes('-temp-')) {
    return withoutPrefix.substring(0, withoutPrefix.indexOf('-temp-'));
  }
  const parts = withoutPrefix.split('-');
  if (parts.length >= 6) {
    return parts.slice(0, -5).join('-') || null;
  }
  return parts.slice(0, -1).join('-') || null;
}

export function purchaseIdsFromRows(rows: PurchaseRow[]): string[] {
  return rows.map((p) => `purchase-${p.item_id}-${p.id}`);
}

/** Fetch purchase rows for the current session user (anonymous or registered). */
export async function fetchPurchaseRowsForSessionUser(): Promise<
  PurchaseRow[] | null
> {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }

  const client = await getSupabaseClient();
  const { data, error } = await client
    .from('purchases')
    .select('id, item_id')
    .eq('user_id', user.id);

  if (error) {
    throw error;
  }
  return data ?? [];
}

/**
 * Merge feast activation counts from DB purchases into game state (idempotent).
 */
export function applyFeastActivationsFromPurchaseRows(rows: PurchaseRow[]): void {
  const state = useGameStore.getState();
  const currentFeastActivations = state.feastActivations || {};
  const newFeastActivations = { ...currentFeastActivations };
  let hasNewActivations = false;

  rows.forEach((purchase) => {
    const purchaseId = `purchase-${purchase.item_id}-${purchase.id}`;
    const item = SHOP_ITEMS[purchase.item_id];

    if (
      item?.rewards.feastActivations &&
      !item.bundleComponents &&
      !(purchaseId in currentFeastActivations)
    ) {
      newFeastActivations[purchaseId] = item.rewards.feastActivations;
      hasNewActivations = true;
    }
  });

  if (hasNewActivations) {
    useGameStore.setState({ feastActivations: newFeastActivations });
  }
}

/** Rehydrate shop entitlements from Supabase after load or refresh. */
export async function rehydratePurchasesFromSupabase(): Promise<string[]> {
  try {
    const rows = await fetchPurchaseRowsForSessionUser();
    if (!rows || rows.length === 0) {
      return [];
    }

    applyFeastActivationsFromPurchaseRows(rows);
    return purchaseIdsFromRows(rows);
  } catch (error) {
    logger.error('[SHOP] Failed to rehydrate purchases:', error);
    return [];
  }
}
