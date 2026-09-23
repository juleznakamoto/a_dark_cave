/** Partner sites that receive the 10,000 first-purchase Insight bonus. */
export const PARTNER_INSIGHT_SOURCES = ["itch", "bored", "incrementaldb"] as const;

export type PartnerInsightSource = (typeof PARTNER_INSIGHT_SOURCES)[number];

/** `story.seen` flags. One is set on Make Fire and cleared after the first paid purchase. */
export const PARTNER_INSIGHT_SEEN_KEYS = {
  itch: "itchFirstPurchaseInsightActive",
  bored: "boredFirstPurchaseInsightActive",
  incrementaldb: "incrementaldbFirstPurchaseInsightActive",
} as const;

const UTM_SOURCE_TO_PARTNER: Record<string, PartnerInsightSource> = {
  itch: "itch",
  itchio: "itch",
  "itch.io": "itch",
  "itch-io": "itch",
  bored: "bored",
  "bored.com": "bored",
  incrementaldb: "incrementaldb",
  "incremental.db": "incrementaldb",
  "incremental-db": "incrementaldb",
  incremental_db: "incrementaldb",
};

function hostIs(hostname: string, root: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return host === root || host.endsWith(`.${root}`);
}

function partnerFromUrl(raw: string | null | undefined): PartnerInsightSource | null {
  if (!raw) return null;
  let hostname: string;
  try {
    hostname = new URL(raw).hostname;
  } catch {
    return null;
  }
  if (hostIs(hostname, "itch.io")) return "itch";
  if (hostIs(hostname, "bored.com")) return "bored";
  if (
    hostIs(hostname, "incrementaldb.com") ||
    hostIs(hostname, "incremental.db")
  ) {
    return "incrementaldb";
  }
  return null;
}

/**
 * Playlight uses `?utm_source=playlight`. These partners use the same idea:
 * a tagged landing URL, or the page that linked (or framed) the game.
 */
export function partnerInsightSourceFromSignals(input: {
  utmSource?: string | null;
  referrer?: string | null;
  parentOrigin?: string | null;
}): PartnerInsightSource | null {
  const utm = input.utmSource?.trim().toLowerCase();
  if (utm && UTM_SOURCE_TO_PARTNER[utm]) {
    return UTM_SOURCE_TO_PARTNER[utm];
  }
  return partnerFromUrl(input.referrer) ?? partnerFromUrl(input.parentOrigin);
}

export function getActivePartnerInsightSource(seen: {
  [key: string]: boolean | number | undefined;
} | null | undefined): PartnerInsightSource | null {
  if (!seen) return null;
  for (const source of PARTNER_INSIGHT_SOURCES) {
    if (seen[PARTNER_INSIGHT_SEEN_KEYS[source]] === true) return source;
  }
  return null;
}

export function pendingPartnerInsightSource(state: {
  story?: { seen?: Record<string, boolean | number | undefined> };
  hasMadeNonFreePurchase?: boolean;
}): PartnerInsightSource | null {
  if (state.hasMadeNonFreePurchase === true) return null;
  return getActivePartnerInsightSource(state.story?.seen);
}

/** Flags written into `story.seen` once the first paid purchase is done. */
export function clearedPartnerInsightSeenFlags(): Record<
  (typeof PARTNER_INSIGHT_SEEN_KEYS)[PartnerInsightSource],
  false
> {
  return {
    itchFirstPurchaseInsightActive: false,
    boredFirstPurchaseInsightActive: false,
    incrementaldbFirstPurchaseInsightActive: false,
  };
}
