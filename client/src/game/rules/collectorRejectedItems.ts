import type { GameState } from "@shared/schema";

/** Clothing/relic ids the wandering collector trades in. */
export const COLLECTOR_ITEMS = [
  "bloodstained_belt",
  "tarnished_amulet",
  "fang_charm",
  "muttering_amulet",
  "cracked_crown",
  "ring_of_drowned",
  "red_mask",
  "bone_necklace",
  "wooden_figure",
  "bone_dice",
  "blackened_mirror",
  "shadow_flute",
  "hollow_king_scepter",
  "unnamed_book",
] as const;

export type CollectorItemId = (typeof COLLECTOR_ITEMS)[number];

export const COLLECTOR_MAX_OFFERS = 4;

const COLLECTOR_CLOTHING_ITEMS = new Set<string>([
  "bloodstained_belt",
  "tarnished_amulet",
  "fang_charm",
  "muttering_amulet",
  "cracked_crown",
  "ring_of_drowned",
  "red_mask",
  "bone_necklace",
]);

const COLLECTOR_REJECTED_SEEN_PREFIX = "collectorRejected_";

export function collectorRejectedSeenKey(itemId: string): string {
  return `${COLLECTOR_REJECTED_SEEN_PREFIX}${itemId}`;
}

export function isCollectorItem(itemId: string): itemId is CollectorItemId {
  return (COLLECTOR_ITEMS as readonly string[]).includes(itemId);
}

export function getCollectorItemCategory(
  itemId: string,
): "clothing" | "relics" {
  return COLLECTOR_CLOTHING_ITEMS.has(itemId) ? "clothing" : "relics";
}

export function isCollectorItemOwned(
  state: GameState,
  itemId: string,
): boolean {
  if (state.clothing && (state.clothing as Record<string, boolean>)[itemId]) {
    return true;
  }
  if (state.relics && (state.relics as Record<string, boolean>)[itemId]) {
    return true;
  }
  return false;
}

export function isCollectorItemRejected(
  state: GameState,
  itemId: string,
): boolean {
  return Boolean(state.story?.seen?.[collectorRejectedSeenKey(itemId)]);
}

/** Merge a rejected-item flag into an existing `story.seen` object. */
export function markCollectorItemRejectedInSeen(
  seen: Record<string, boolean | number> | undefined,
  itemId: string,
): Record<string, boolean | number> {
  return {
    ...(seen || {}),
    [collectorRejectedSeenKey(itemId)]: true,
  };
}

/** Story patch that marks an item as rejected (left behind / refused). */
export function collectorItemRejectedStoryPatch(
  state: GameState,
  itemId: string,
): Pick<GameState, "story"> {
  return {
    story: {
      ...state.story,
      seen: markCollectorItemRejectedInSeen(state.story?.seen, itemId),
    },
  };
}

export function clearCollectorItemRejectedInSeen(
  seen: Record<string, boolean | number> | undefined,
  itemId: string,
): Record<string, boolean | number> {
  const next = { ...(seen || {}) };
  delete next[collectorRejectedSeenKey(itemId)];
  return next;
}

export function getOwnedCollectorItems(state: GameState): CollectorItemId[] {
  return COLLECTOR_ITEMS.filter((itemId) => isCollectorItemOwned(state, itemId));
}

/** Rejected items the player does not currently own (collector can sell these). */
export function getRejectedCollectorItems(state: GameState): CollectorItemId[] {
  return COLLECTOR_ITEMS.filter(
    (itemId) =>
      isCollectorItemRejected(state, itemId) &&
      !isCollectorItemOwned(state, itemId),
  );
}

/** Deterministic pick of up to `max` items, shifted by visit count. */
export function selectCollectorOfferItems(
  items: readonly string[],
  visitCount: number,
  max = COLLECTOR_MAX_OFFERS,
): string[] {
  if (items.length === 0) return [];
  const sortedItems = [...items].sort();
  const startIndex = (visitCount * 2) % sortedItems.length;
  const selected: string[] = [];
  for (let i = 0; i < max && i < sortedItems.length; i++) {
    selected.push(sortedItems[(startIndex + i) % sortedItems.length]);
  }
  return selected;
}
