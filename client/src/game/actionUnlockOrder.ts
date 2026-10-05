/**
 * Buildings and one-time crafts stay in the order the player first saw them.
 * A newly unlocked button is appended. It does not take its catalog slot.
 *
 * Catalog order is only the tie-break when several of those buttons appear together.
 * Repeatable crafts, jobs, mining, exploring, and trading keep their catalog order.
 */

/** Heartfire is first in the build catalog, but it unlocks after other buildings. */
export const BUILD_HEARTFIRE_ACTION_ID = "buildHeartfire";

export const BUILD_ACTION_APPEND_LAST_IDS = [BUILD_HEARTFIRE_ACTION_ID] as const;

export type UnlockOrderOptions = {
  /**
   * Ids that should follow the other buttons added from this same list.
   * Already recorded ids stay where they are.
   */
  appendLastIds?: readonly string[];
};

export function listsEqual(
  a: readonly string[],
  b: readonly string[],
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function sanitizeActionUnlockOrder(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const id of value) {
    if (typeof id !== "string" || id.length === 0 || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/**
 * Keep `remembered`, then append visible ids that are not recorded yet.
 * `appendLastIds` go after the other new ids from this list.
 */
export function mergeUnlockOrder(
  remembered: readonly string[],
  visibleIds: readonly string[],
  options?: UnlockOrderOptions,
): string[] {
  if (visibleIds.length === 0) return remembered as string[];

  const seen = new Set(remembered);
  const appendLast = new Set(options?.appendLastIds ?? []);
  const head: string[] = [];
  const tail: string[] = [];
  for (const id of visibleIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    if (appendLast.has(id)) tail.push(id);
    else head.push(id);
  }
  if (head.length === 0 && tail.length === 0) return remembered as string[];
  return [...remembered, ...head, ...tail];
}

export function orderByUnlock<T>(
  visibleInCatalogOrder: readonly T[],
  remembered: readonly string[],
  getId: (item: T) => string,
  options?: UnlockOrderOptions,
): T[] {
  const visibleIds = visibleInCatalogOrder.map(getId);
  const order = mergeUnlockOrder(remembered, visibleIds, options);
  const byId = new Map<string, T>();
  for (const item of visibleInCatalogOrder) {
    byId.set(getId(item), item);
  }
  const ordered: T[] = [];
  const placed = new Set<string>();
  for (const id of order) {
    const item = byId.get(id);
    if (!item || placed.has(id)) continue;
    placed.add(id);
    ordered.push(item);
  }
  return ordered;
}

/**
 * Repeatable crafts stay in catalog order. One-time crafts follow them,
 * in the order the player first saw those crafts.
 */
export function orderCraftOnceRow<T extends { id: string }>(
  visibleInCatalogOrder: readonly T[],
  isOnce: (id: string) => boolean,
  orderOnce: (onceInCatalogOrder: readonly T[]) => readonly T[],
): T[] {
  const repeatable: T[] = [];
  const once: T[] = [];
  for (const item of visibleInCatalogOrder) {
    if (isOnce(item.id)) once.push(item);
    else repeatable.push(item);
  }
  if (once.length === 0) return visibleInCatalogOrder as T[];
  return [...repeatable, ...orderOnce(once)];
}
