/**
 * Open the full game's Steam store page.
 *
 * Steam desktop (live `steamBridge`): `ISteamFriends::ActivateGameOverlayToStore`.
 * Web / overlay failure: the same store URL used by footer and demo CTAs.
 */
import {
  type SteamStoreUtmContent,
  steamStoreUrl,
} from "@/lib/gameFooterSocialLinks";
import { hasSteamBridge, steamActivateOverlayToStore } from "@/lib/steam";

export function openFullGameStoreUrl(utmContent: SteamStoreUtmContent): void {
  window.open(steamStoreUrl(utmContent), "_blank", "noopener,noreferrer");
}

export async function openFullGameStore(
  utmContent: SteamStoreUtmContent,
): Promise<void> {
  if (hasSteamBridge()) {
    const opened = await steamActivateOverlayToStore();
    if (opened) return;
  }
  openFullGameStoreUrl(utmContent);
}
