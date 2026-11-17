/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import { setDevGameModeOverride } from "@/lib/edition";
import { initPlaylight } from "@/lib/playlight";

describe("initPlaylight", () => {
  afterEach(() => {
    setDevGameModeOverride("normal");
    delete (window as Window & { playlightSDK?: unknown }).playlightSDK;
  });

  it("does not load the SDK on the iOS edition", async () => {
    setDevGameModeOverride("ios");
    await initPlaylight();
    expect(
      (window as Window & { playlightSDK?: unknown }).playlightSDK,
    ).toBeUndefined();
    expect(document.getElementById("playlight-sdk-css")).toBeNull();
  });
});
