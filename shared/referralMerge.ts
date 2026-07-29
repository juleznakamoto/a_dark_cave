/** Referral list entry as stored on game state. */
export type ReferralMergeEntry = {
  userId: string;
  claimed: boolean;
  timestamp: number;
};

export type ReferralMergeResult = {
  referrals: ReferralMergeEntry[];
  referralCount: number;
  referredUsers: string[];
};

function normalizeEntry(
  entry: Partial<ReferralMergeEntry> | null | undefined,
): ReferralMergeEntry | null {
  if (!entry?.userId || typeof entry.userId !== "string") return null;
  return {
    userId: entry.userId,
    claimed: entry.claimed === true,
    timestamp:
      typeof entry.timestamp === "number" && Number.isFinite(entry.timestamp)
        ? entry.timestamp
        : 0,
  };
}

function mergeEntry(
  a: ReferralMergeEntry,
  b: ReferralMergeEntry,
): ReferralMergeEntry {
  return {
    userId: a.userId,
    claimed: a.claimed || b.claimed,
    timestamp: Math.max(a.timestamp, b.timestamp),
  };
}

/**
 * Union-merge referral lists by userId.
 * Used on load (client) and mirrored in SQL save protection so full-document
 * replace cannot wipe server-written invite rewards.
 */
export function mergeReferralLists(
  localRefs: ReadonlyArray<Partial<ReferralMergeEntry> | null | undefined>,
  cloudRefs: ReadonlyArray<Partial<ReferralMergeEntry> | null | undefined>,
  opts?: {
    localReferralCount?: number;
    cloudReferralCount?: number;
  },
): ReferralMergeResult {
  const byUserId = new Map<string, ReferralMergeEntry>();

  for (const raw of localRefs) {
    const entry = normalizeEntry(raw);
    if (entry) byUserId.set(entry.userId, entry);
  }
  for (const raw of cloudRefs) {
    const entry = normalizeEntry(raw);
    if (!entry) continue;
    const existing = byUserId.get(entry.userId);
    byUserId.set(entry.userId, existing ? mergeEntry(existing, entry) : entry);
  }

  const referrals = Array.from(byUserId.values()).sort(
    (a, b) => a.timestamp - b.timestamp,
  );
  const referralCount = Math.max(
    opts?.localReferralCount ?? 0,
    opts?.cloudReferralCount ?? 0,
    referrals.length,
  );

  return {
    referrals,
    referralCount,
    referredUsers: referrals.map((entry) => entry.userId),
  };
}
