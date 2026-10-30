/** Opening Cruel Mode curse offer. Effects are display-only until wired. */
export const CRUEL_CURSE_IDS = [
  "ashen_harvest",
  "crowded_graves",
  "loud_omens",
] as const;

export type CruelCurseId = (typeof CRUEL_CURSE_IDS)[number];

export function isCruelCurseId(id: string): id is CruelCurseId {
  return (CRUEL_CURSE_IDS as readonly string[]).includes(id);
}

/** Keep known ids, drop duplicates, and preserve offer order. */
export function sanitizeChosenCruelCurses(ids: unknown): CruelCurseId[] {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<CruelCurseId>();
  for (const id of ids) {
    if (typeof id === "string" && isCruelCurseId(id)) seen.add(id);
  }
  return CRUEL_CURSE_IDS.filter((id) => seen.has(id));
}
