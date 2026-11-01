/** Opening curse offer for a new run, normal or Cruel Mode. Madness is applied. Other effects are display-only until wired. */
export const CURSE_IDS = [
  "blazesmith",
  "full_larders",
  "sturdy_hands",
  "cunning_trader",
  "avid_apprentices",
] as const;

export type CurseId = (typeof CURSE_IDS)[number];

/** Ids from before the cards were renamed. They still select the same curses. */
const LEGACY_CURSE_IDS: Record<string, CurseId> = {
  firecrafter: "blazesmith",
  crowded_graves: "full_larders",
  loud_omens: "sturdy_hands",
};

/** Most curses one playthrough can offer. */
export const CURSE_CHOICE_MAX = 5;

/** Madness added for each chosen curse. */
export const CURSE_MADNESS = 3;

/** Madness from the curses currently chosen. Unknown ids do not count. */
export function getCurseMadness(ids: unknown): number {
  return sanitizeChosenCurses(ids).length * CURSE_MADNESS;
}

export function isCurseId(id: string): id is CurseId {
  return (CURSE_IDS as readonly string[]).includes(id);
}

function resolveCurseId(id: string): CurseId | null {
  if (isCurseId(id)) return id;
  return LEGACY_CURSE_IDS[id] ?? null;
}

/** Missing or invalid values become 1. Never above the cap. */
export function clampCurseChoices(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(CURSE_CHOICE_MAX, Math.max(1, Math.floor(n)));
}

/**
 * Opening allowance for a loaded save.
 * A run starts with 1. Each completed game adds one, up to 5.
 * Older saves have no stored count, so finished games already on the save
 * (win counter, game_stats, or win flags) count the same way.
 * A stored count that is already higher is kept.
 */
export function resolveCurseChoicesFromSave(
  stored: unknown,
  completedGames: unknown,
): number {
  const wins = Math.max(0, Math.floor(Number(completedGames) || 0));
  const fromCompletions = Math.min(CURSE_CHOICE_MAX, 1 + wins);
  return Math.max(clampCurseChoices(stored), fromCompletions);
}

/** The opening offer waits until at least one game has been finished. */
export function shouldOpenCurseOffer(completedGames: unknown): boolean {
  return Math.max(0, Math.floor(Number(completedGames) || 0)) > 0;
}

/** A completed game grants one more curse choice. Starting over does not. */
export function grantCurseChoiceForCompletedGame(current: unknown): number {
  return Math.min(
    CURSE_CHOICE_MAX,
    clampCurseChoices(current) + 1,
  );
}

/** Keep known ids, map renamed ids, drop duplicates, and preserve offer order. */
export function sanitizeChosenCurses(ids: unknown): CurseId[] {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<CurseId>();
  for (const id of ids) {
    if (typeof id !== "string") continue;
    const resolved = resolveCurseId(id);
    if (resolved) seen.add(resolved);
  }
  return CURSE_IDS.filter((id) => seen.has(id));
}

/**
 * Saves written before the rename stored these under cruel* keys.
 * A present new key wins, including an empty choice list.
 */
type LegacyCurseSave = {
  chosenCurses?: unknown;
  chosenCruelCurses?: unknown;
  curseOfferPending?: unknown;
  cruelCurseOfferPending?: unknown;
  curseChoices?: unknown;
  cruelCurseChoices?: unknown;
};

export function readStoredChosenCurses(saved: LegacyCurseSave): unknown {
  return saved.chosenCurses !== undefined
    ? saved.chosenCurses
    : saved.chosenCruelCurses;
}

export function readStoredCurseOfferPending(saved: LegacyCurseSave): boolean {
  if (typeof saved.curseOfferPending === "boolean") return saved.curseOfferPending;
  return saved.cruelCurseOfferPending === true;
}

export function readStoredCurseChoices(saved: LegacyCurseSave): unknown {
  return saved.curseChoices !== undefined
    ? saved.curseChoices
    : saved.cruelCurseChoices;
}
