/**
 * Open the Steam "Write a review" form for this edition.
 *
 * Steam desktop (live `steamBridge`): overlay web page.
 * Web / overlay failure: the same store URL in a new tab.
 */
import { isSteamPlaytestBuild } from "@/lib/edition";
import { hasSteamBridge, steamActivateOverlayToReview } from "@/lib/steam";
import {
  STEAM_FULL_APP_ID,
  STEAM_PLAYTEST_APP_ID,
  steamReviewPageUrl,
} from "@shared/steamReview";

/** Full game, or the playtest app when this shell is the playtest build. */
export function steamGameReviewAppId(): number {
  return isSteamPlaytestBuild ? STEAM_PLAYTEST_APP_ID : STEAM_FULL_APP_ID;
}

export async function openSteamReview(appId: number): Promise<void> {
  const url = steamReviewPageUrl(appId);
  if (!url) return;
  if (hasSteamBridge()) {
    const opened = await steamActivateOverlayToReview(appId);
    if (opened) return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
