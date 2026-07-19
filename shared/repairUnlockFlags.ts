/**
 * Repair / infer permanent tab-unlock flags from progression evidence.
 *
 * Same corruption class as the tools wipe: a load/sign-in path can drop or partial-write
 * `flags`, leaving `villageUnlocked` / `forestUnlocked` / `bastionUnlocked` false while
 * buildings, tools, and weapons prove the player already unlocked those tabs.
 *
 * Add-only: never clears a true unlock flag.
 */

export type UnlockFlagSlice = {
  villageUnlocked?: boolean;
  forestUnlocked?: boolean;
  bastionUnlocked?: boolean;
  gameStarted?: boolean;
  hasFortress?: boolean;
};

export type UnlockProgressEvidence = {
  flags?: UnlockFlagSlice | null;
  tools?: Record<string, boolean | undefined> | null;
  weapons?: Record<string, boolean | undefined> | null;
  buildings?: Record<string, number | undefined> | null;
  story?: { seen?: Record<string, unknown> | null } | null;
};

function seenTrue(
  seen: Record<string, unknown> | null | undefined,
  key: string,
): boolean {
  return seen?.[key] === true;
}

function buildingCount(
  buildings: Record<string, number | undefined> | null | undefined,
  key: string,
): number {
  const n = buildings?.[key];
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function owned(
  slice: Record<string, boolean | undefined> | null | undefined,
  key: string,
): boolean {
  return slice?.[key] === true;
}

/** Progress that proves the Village tab was unlocked (stone axe / village buildings). */
export function hasVillageUnlockEvidence(state: UnlockProgressEvidence): boolean {
  if (state.flags?.villageUnlocked) return true;
  if (owned(state.tools, "stone_axe")) return true;
  const seen = state.story?.seen;
  if (seenTrue(seen, "hasStoneAxe") || seenTrue(seen, "actionCraftStoneAxe")) {
    return true;
  }
  if (buildingCount(state.buildings, "woodenHut") >= 1) return true;
  if (buildingCount(state.buildings, "stoneHut") >= 1) return true;
  if (buildingCount(state.buildings, "clerksHut") >= 1) return true;
  if (buildingCount(state.buildings, "blacksmith") >= 1) return true;
  if (buildingCount(state.buildings, "darkEstate") >= 1) return true;
  return false;
}

/** Progress that proves the Forest tab was unlocked (crude bow craft chain). */
export function hasForestUnlockEvidence(state: UnlockProgressEvidence): boolean {
  if (state.flags?.forestUnlocked) return true;
  // Forest unlocks on craftCrudeBow — not Hunter Cabin (that's a village building).
  if (owned(state.weapons, "crude_bow")) return true;
  if (owned(state.weapons, "huntsman_bow")) return true;
  if (owned(state.weapons, "long_bow")) return true;
  if (owned(state.weapons, "war_bow")) return true;
  const seen = state.story?.seen;
  if (
    seenTrue(seen, "hasCrudeBow") ||
    seenTrue(seen, "actionCraftCrudeBow") ||
    seenTrue(seen, "forestUnlocked")
  ) {
    return true;
  }
  return false;
}

/** Progress that proves the Bastion tab was unlocked. */
export function hasBastionUnlockEvidence(state: UnlockProgressEvidence): boolean {
  if (state.flags?.bastionUnlocked) return true;
  if (state.flags?.hasFortress) return true;
  if (buildingCount(state.buildings, "bastion") >= 1) return true;
  if (buildingCount(state.buildings, "watchtower") >= 1) return true;
  if (buildingCount(state.buildings, "palisades") >= 1) return true;
  return false;
}

export function isVillageTabVisible(state: UnlockProgressEvidence): boolean {
  return hasVillageUnlockEvidence(state);
}

export function isForestTabVisible(state: UnlockProgressEvidence): boolean {
  return hasForestUnlockEvidence(state);
}

export function isBastionTabVisible(state: UnlockProgressEvidence): boolean {
  return hasBastionUnlockEvidence(state);
}

/**
 * Merge schema defaults + saved flags, then set unlock flags true when progress proves them.
 */
export function repairUnlockFlags<T extends UnlockProgressEvidence>(
  state: T,
  defaultFlags: UnlockFlagSlice,
): T & { flags: UnlockFlagSlice } {
  const next: UnlockFlagSlice = {
    ...defaultFlags,
    ...(state.flags ?? {}),
  };

  if (hasVillageUnlockEvidence({ ...state, flags: next })) {
    next.villageUnlocked = true;
  }
  if (hasForestUnlockEvidence({ ...state, flags: next })) {
    next.forestUnlocked = true;
  }
  if (hasBastionUnlockEvidence({ ...state, flags: next })) {
    next.bastionUnlocked = true;
  }
  if (
    !next.gameStarted &&
    (next.villageUnlocked || next.forestUnlocked || next.bastionUnlocked)
  ) {
    next.gameStarted = true;
  }

  return { ...state, flags: next };
}
