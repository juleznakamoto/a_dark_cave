/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const editionMocks = vi.hoisted(() => ({
  isLocalOnlyEdition: vi.fn(() => false),
}));

vi.mock("@/lib/edition", () => ({
  isLocalOnlyEdition: () => editionMocks.isLocalOnlyEdition(),
}));

describe("initSessionTracker", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    editionMocks.isLocalOnlyEdition.mockReturnValue(false);
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does not ping /api/session/ping on Steam / CrazyGames", async () => {
    editionMocks.isLocalOnlyEdition.mockReturnValue(true);
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal("navigator", {
      ...navigator,
      sendBeacon,
    });

    const { initSessionTracker } = await import("./sessionTracker");
    initSessionTracker();
    await vi.advanceTimersByTimeAsync(2000);

    expect(sendBeacon).not.toHaveBeenCalled();
  });
});
