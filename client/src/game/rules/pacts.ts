/** Opening pact offer for a new run, normal or Cruel Mode. Each chosen pact adds madness and its two boons. */
export const PACT_IDS = [
  "blazesmith",
  "full_larders",
  "sturdy_hands",
  "cunning_trader",
  "avid_apprentices",
] as const;

export type PactId = (typeof PACT_IDS)[number];

/** Ids from before the cards were renamed. They still select the same pacts. */
const LEGACY_PACT_IDS: Record<string, PactId> = {
  firecrafter: "blazesmith",
  crowded_graves: "full_larders",
  loud_omens: "sturdy_hands",
};

/** Most pacts one playthrough can offer. */
export const PACT_CHOICE_MAX = 5;

/** Madness added for each chosen pact. */
export const PACT_MADNESS = 3;

/** Madness from the pacts currently chosen. Unknown ids do not count. */
export function getPactMadness(ids: unknown): number {
  return sanitizeChosenPacts(ids).length * PACT_MADNESS;
}

export function isPactId(id: string): id is PactId {
  return (PACT_IDS as readonly string[]).includes(id);
}

function resolvePactId(id: string): PactId | null {
  if (isPactId(id)) return id;
  return LEGACY_PACT_IDS[id] ?? null;
}

/** Missing or invalid values become 1. Never above the cap. */
export function clampPactChoices(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(PACT_CHOICE_MAX, Math.max(1, Math.floor(n)));
}

/**
 * Opening allowance for a loaded save.
 * A run starts with 1. Finished games already on the save add one each, up to 5.
 * A Cruel Mode finish grants two when that win is awarded. This backfill
 * cannot tell those wins apart, so a stored count that is already higher is kept.
 */
export function resolvePactChoicesFromSave(
  stored: unknown,
  completedGames: unknown,
): number {
  const wins = Math.max(0, Math.floor(Number(completedGames) || 0));
  const fromCompletions = Math.min(PACT_CHOICE_MAX, 1 + wins);
  return Math.max(clampPactChoices(stored), fromCompletions);
}

/** The opening offer waits until at least one game has been finished. */
export function shouldOpenPactOffer(completedGames: unknown): boolean {
  return Math.max(0, Math.floor(Number(completedGames) || 0)) > 0;
}

/** A finished game grants one pact choice. Cruel Mode grants two. Starting over does not. */
export function grantPactChoiceForCompletedGame(
  current: unknown,
  cruelMode = false,
): number {
  const granted = cruelMode ? 2 : 1;
  return Math.min(PACT_CHOICE_MAX, clampPactChoices(current) + granted);
}

/** Keep known ids, map renamed ids, drop duplicates, and preserve offer order. */
export function sanitizeChosenPacts(ids: unknown): PactId[] {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<PactId>();
  for (const id of ids) {
    if (typeof id !== "string") continue;
    const resolved = resolvePactId(id);
    if (resolved) seen.add(resolved);
  }
  return PACT_IDS.filter((id) => seen.has(id));
}

/**
 * Saves written before the pact rename used curse* keys, and before that cruel* keys.
 * A present newer key wins, including an empty choice list.
 */
type LegacyPactSave = {
  chosenPacts?: unknown;
  chosenCurses?: unknown;
  chosenCruelCurses?: unknown;
  pactOfferPending?: unknown;
  curseOfferPending?: unknown;
  cruelCurseOfferPending?: unknown;
  pactChoices?: unknown;
  curseChoices?: unknown;
  cruelCurseChoices?: unknown;
};

export function readStoredChosenPacts(saved: LegacyPactSave): unknown {
  if (saved.chosenPacts !== undefined) return saved.chosenPacts;
  if (saved.chosenCurses !== undefined) return saved.chosenCurses;
  return saved.chosenCruelCurses;
}

export function readStoredPactOfferPending(saved: LegacyPactSave): boolean {
  if (typeof saved.pactOfferPending === "boolean") return saved.pactOfferPending;
  if (typeof saved.curseOfferPending === "boolean") return saved.curseOfferPending;
  return saved.cruelCurseOfferPending === true;
}

export function readStoredPactChoices(saved: LegacyPactSave): unknown {
  if (saved.pactChoices !== undefined) return saved.pactChoices;
  if (saved.curseChoices !== undefined) return saved.curseChoices;
  return saved.cruelCurseChoices;
}
