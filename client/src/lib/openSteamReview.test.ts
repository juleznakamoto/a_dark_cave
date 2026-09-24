/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STEAM_DEMO_APP_ID, STEAM_FULL_APP_ID } from "@shared/steamReview";

const { hasSteamBridge, steamActivateOverlayToReview } = vi.hoisted(() => ({
  hasSteamBridge: vi.fn(() => false),
  steamActivateOverlayToReview: vi.fn(async () => false),
}));

vi.mock("@/lib/steam", () => ({
  hasSteamBridge,
  steamActivateOverlayToReview,
}));

import { openSteamReview, steamGameReviewAppId } from "./openSteamReview";

describe("openSteamReview", () => {
  beforeEach(() => {
    hasSteamBridge.mockReset();
    hasSteamBridge.mockReturnValue(false);
    steamActivateOverlayToReview.mockReset();
    steamActivateOverlayToReview.mockResolvedValue(false);
    vi.stubGlobal("open", vi.fn());
  });

  it("opens the review form when the Steam overlay is unavailable", async () => {
    await openSteamReview(STEAM_DEMO_APP_ID);
    expect(steamActivateOverlayToReview).not.toHaveBeenCalled();
    expect(window.open).toHaveBeenCalledWith(
      "https://store.steampowered.com/recommended/recommendgame/4971800",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("uses the Steam overlay when the desktop bridge is live", async () => {
    hasSteamBridge.mockReturnValue(true);
    steamActivateOverlayToReview.mockResolvedValue(true);

    await openSteamReview(STEAM_FULL_APP_ID);

    expect(steamActivateOverlayToReview).toHaveBeenCalledWith(STEAM_FULL_APP_ID);
    expect(window.open).not.toHaveBeenCalled();
  });

  it("falls back to the review URL when the overlay call fails", async () => {
    hasSteamBridge.mockReturnValue(true);
    steamActivateOverlayToReview.mockResolvedValue(false);

    await openSteamReview(STEAM_FULL_APP_ID);

    expect(window.open).toHaveBeenCalledWith(
      "https://store.steampowered.com/recommended/recommendgame/4882240",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("does nothing for an unknown app id", async () => {
    hasSteamBridge.mockReturnValue(true);
    await openSteamReview(480);
    expect(steamActivateOverlayToReview).not.toHaveBeenCalled();
    expect(window.open).not.toHaveBeenCalled();
  });

  it("targets the full game outside the playtest build", () => {
    expect(steamGameReviewAppId()).toBe(STEAM_FULL_APP_ID);
  });
});
