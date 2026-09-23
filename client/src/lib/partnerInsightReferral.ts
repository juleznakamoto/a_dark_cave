import {
  partnerInsightSourceFromSignals,
  type PartnerInsightSource,
} from "@shared/partnerInsightReferral";

/**
 * True for a new player who arrived from itch.io, Bored.com, or Incremental DB.
 * Checked at Make Fire, while `utm_source` is still on the URL.
 */
export function readPartnerInsightReferral(): PartnerInsightSource | null {
  if (typeof window === "undefined") return null;
  const parentOrigin = window.location.ancestorOrigins?.item(0) ?? null;
  return partnerInsightSourceFromSignals({
    utmSource: new URLSearchParams(window.location.search).get("utm_source"),
    referrer: typeof document !== "undefined" ? document.referrer : null,
    parentOrigin,
  });
}
