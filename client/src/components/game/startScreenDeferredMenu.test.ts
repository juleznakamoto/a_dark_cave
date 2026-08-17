import { describe, expect, it } from "vitest";
import { shouldOpenDeferredStartMenu } from "./startScreenDeferredMenu";

describe("shouldOpenDeferredStartMenu", () => {
  it("opens when the requesting click is still current", () => {
    expect(shouldOpenDeferredStartMenu(false, 1, 1)).toBe(true);
  });

  it("stays closed if Light Fire already started", () => {
    expect(shouldOpenDeferredStartMenu(true, 1, 1)).toBe(false);
  });

  it("stays closed if a newer click invalidated the request", () => {
    expect(shouldOpenDeferredStartMenu(false, 1, 2)).toBe(false);
  });
});
