type BuildingCounts = Record<string, number | undefined>;

function orderMatchesBuildings(
  buildings: BuildingCounts,
  order: readonly string[],
): boolean {
  const tally = new Map<string, number>();
  for (const key of order) tally.set(key, (tally.get(key) ?? 0) + 1);
  const keys = new Set<string>([...Object.keys(buildings), ...tally.keys()]);
  for (const key of keys) {
    const owned = buildings[key] ?? 0;
    if (typeof owned !== "number") continue;
    if (owned !== (tally.get(key) ?? 0)) return false;
  }
  return true;
}

/**
 * Append each new copy, and drop the latest copy when a count falls.
 * An older save already has buildings and an empty list, so it is left alone.
 */
export function noteVillageBuildOrder(
  previous: BuildingCounts,
  updates: BuildingCounts | undefined,
  order: readonly string[] | undefined,
): string[] {
  const current = order ?? [];
  if (!updates) return current as string[];
  if (!orderMatchesBuildings(previous, current)) return current as string[];

  const decreases: string[] = [];
  const increases: string[] = [];
  for (const key of Object.keys(updates)) {
    const nextValue = updates[key];
    if (typeof nextValue !== "number") continue;
    const delta = nextValue - (previous[key] ?? 0);
    if (delta < 0) {
      for (let i = 0; i < -delta; i++) decreases.push(key);
    } else if (delta > 0) {
      for (let i = 0; i < delta; i++) increases.push(key);
    }
  }
  if (decreases.length === 0 && increases.length === 0) return current as string[];

  const updated = current.slice();
  for (const key of decreases) {
    const index = updated.lastIndexOf(key);
    if (index >= 0) updated.splice(index, 1);
  }
  updated.push(...increases);
  return updated;
}
