/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STEAM_STORE_UTM_CONTENT, steamStoreUrl } from "./gameFooterSocialLinks";

const { hasSteamBridge, steamActivateOverlayToStore } = vi.hoisted(() => ({
  hasSteamBridge: vi.fn(() => false),
  steamActivateOverlayToStore: vi.fn(async () => false),
}));

vi.mock("@/lib/steam", () => ({
  hasSteamBridge,
  steamActivateOverlayToStore,
}));

import { openFullGameStore } from "./openFullGameStore";

describe("openFullGameStore", () => {
  beforeEach(() => {
    hasSteamBridge.mockReturnValue(false);
    steamActivateOverlayToStore.mockResolvedValue(false);
    vi.stubGlobal("open", vi.fn());
  });

  it("opens the store URL when Steam overlay is unavailable", async () => {
    await openFullGameStore(STEAM_STORE_UTM_CONTENT.gameHeader);
    expect(steamActivateOverlayToStore).not.toHaveBeenCalled();
    expect(window.open).toHaveBeenCalledWith(
      steamStoreUrl(STEAM_STORE_UTM_CONTENT.gameHeader),
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("uses the Steam overlay when the desktop bridge is live", async () => {
    hasSteamBridge.mockReturnValue(true);
    steamActivateOverlayToStore.mockResolvedValue(true);

    await openFullGameStore(STEAM_STORE_UTM_CONTENT.demoTimeUp);

    expect(steamActivateOverlayToStore).toHaveBeenCalledTimes(1);
    expect(window.open).not.toHaveBeenCalled();
  });

  it("falls back to the store URL when the overlay call fails", async () => {
    hasSteamBridge.mockReturnValue(true);
    steamActivateOverlayToStore.mockResolvedValue(false);

    await openFullGameStore(STEAM_STORE_UTM_CONTENT.demoTimeUp);

    expect(window.open).toHaveBeenCalledWith(
      steamStoreUrl(STEAM_STORE_UTM_CONTENT.demoTimeUp),
      "_blank",
      "noopener,noreferrer",
    );
  });
});
