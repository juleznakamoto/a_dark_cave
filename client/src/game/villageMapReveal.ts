/** How long a new mark fades in. The thick border holds for the first 3s, then fades over the last 1s. */
export const VILLAGE_MAP_FADE_IN_MS = 4000;

export type VillageMapReveal = {
  /** Slot ids whose current mark fades in. */
  fadeIn: Record<string, true>;
  /** Previous tier to fade out at that same slot. Set only for an upgrade. */
  fadeOutTier: Record<string, number>;
};

/** Marks that are new since the map was last shown, and upgrades of a mark already shown. */
export function diffVillageMapReveal(
  slots: readonly { id: string; tier: number }[],
  seen: Record<string, number> | undefined,
): VillageMapReveal {
  const previous = seen ?? {};
  const fadeIn: Record<string, true> = {};
  const fadeOutTier: Record<string, number> = {};
  for (const slot of slots) {
    const prior = previous[slot.id];
    if (prior === undefined) {
      fadeIn[slot.id] = true;
      continue;
    }
    if (prior !== slot.tier) {
      fadeIn[slot.id] = true;
      fadeOutTier[slot.id] = prior;
    }
  }
  return { fadeIn, fadeOutTier };
}

/**
 * Reveal for marks that appeared or upgraded since `shown`.
 * Marks already fading stay in the result so their animation is not cut off.
 */
export function revealForMapChange(
  current: VillageMapReveal | null,
  marks: readonly { id: string; tier: number }[],
  shown: Record<string, number> | undefined,
): { reveal: VillageMapReveal; shown: Record<string, number> } {
  const delta = diffVillageMapReveal(marks, shown);
  const nextShown = villageMapSeenFromSlots(marks);
  if (Object.keys(delta.fadeIn).length === 0) {
    return { reveal: current ?? { fadeIn: {}, fadeOutTier: {} }, shown: nextShown };
  }
  return {
    reveal: {
      fadeIn: { ...(current?.fadeIn ?? {}), ...delta.fadeIn },
      fadeOutTier: { ...(current?.fadeOutTier ?? {}), ...delta.fadeOutTier },
    },
    shown: nextShown,
  };
}

export function villageMapSeenFromSlots(
  slots: readonly { id: string; tier: number }[],
): Record<string, number> {
  const seen: Record<string, number> = {};
  for (const slot of slots) seen[slot.id] = slot.tier;
  return seen;
}

/** Wall, traps, moat, and chitin are map marks too, even though they are not slots. */
export function villageMapFeatureMarks(build: {
  wall: number;
  traps: number;
  moat: boolean;
  chitin: boolean;
}): { id: string; tier: number }[] {
  const marks: { id: string; tier: number }[] = [];
  if (build.wall > 0) marks.push({ id: "palisades", tier: build.wall });
  if (build.traps > 0) marks.push({ id: "traps", tier: build.traps });
  if (build.moat) marks.push({ id: "fortifiedMoat", tier: 1 });
  if (build.chitin) marks.push({ id: "chitinPlating", tier: 1 });
  return marks;
}

/** True when the map has a building or fortification the player has not opened the map on yet. */
export function hasUnseenVillageMapMarks(
  marks: readonly { id: string; tier: number }[],
  seen: Record<string, number> | undefined,
): boolean {
  return Object.keys(diffVillageMapReveal(marks, seen).fadeIn).length > 0;
}
