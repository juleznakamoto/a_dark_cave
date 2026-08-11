import { isLocalOnlyEdition } from "@/lib/edition";
import { logger } from "@/lib/logger";
import { getOrCreateAnalyticsSessionId } from "@/lib/sessionTracker";
import {
  intentHasCampaignParams,
  parseStartupIntent,
  type StartupLocation,
} from "@/game/startupIntent";
import { hasUtmAttribution, type UtmAttribution } from "@shared/utmAttribution";

const SENT_KEY = "utm_landing_sent";

/** In-memory guard so remounts cannot double-fire while a send is in flight. */
let inFlight = false;

function alreadySent(): boolean {
  try {
    return sessionStorage.getItem(SENT_KEY) === "1";
  } catch {
    return false;
  }
}

function markSent(): void {
  try {
    sessionStorage.setItem(SENT_KEY, "1");
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Fire once per browser tab session when the landing URL carries UTM / legacy `c`.
 * Safe to call from start screen and game boot; skips Steam/local-only editions.
 * Marks sent only after the browser accepts the beacon or fetch succeeds.
 */
export function reportUtmLanding(
  location: StartupLocation = typeof window !== "undefined"
    ? window.location
    : { pathname: "/", search: "", hash: "" },
  attribution?: UtmAttribution | null,
): void {
  if (typeof window === "undefined") return;
  if (isLocalOnlyEdition()) return;
  if (alreadySent() || inFlight) return;

  const intent = parseStartupIntent(location);
  const attr =
    attribution && hasUtmAttribution(attribution)
      ? attribution
      : intent.utmAttribution;

  if (!attr || !intentHasCampaignParams({ ...intent, utmAttribution: attr })) {
    return;
  }

  const sid = getOrCreateAnalyticsSessionId();
  const payload = JSON.stringify({
    sid,
    source: attr.source,
    medium: attr.medium,
    campaign: attr.campaign,
    content: attr.content,
    term: attr.term,
  });

  inFlight = true;

  try {
    const blob = new Blob([payload], { type: "application/json" });
    if (typeof navigator.sendBeacon === "function") {
      const queued = navigator.sendBeacon("/api/utm/landing", blob);
      if (queued) {
        markSent();
      }
      inFlight = false;
      return;
    }

    void fetch("/api/utm/landing", {
      method: "POST",
      body: payload,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    })
      .then((res) => {
        if (res.ok) {
          markSent();
        }
      })
      .catch((error) => {
        logger.debug("[UTM] Failed to report landing:", error);
      })
      .finally(() => {
        inFlight = false;
      });
  } catch (error) {
    inFlight = false;
    logger.debug("[UTM] Failed to report landing:", error);
  }
}
