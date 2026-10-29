import { describe, expect, it } from "vitest";
import {
  TEXT_SCALE_MOBILE_BREAKPOINT_PX,
  TEXT_SCALE_ZOOM_FACTOR,
  textScaleIdFromStorage,
  textScaleZoomFactor,
} from "./textScaleZoom";

describe("textScaleZoom", () => {
  it("maps Small / Medium / Large / Extra Large to 100% / 110% / 125% / 150%", () => {
    expect(TEXT_SCALE_ZOOM_FACTOR.small).toBe(1);
    expect(TEXT_SCALE_ZOOM_FACTOR.medium).toBe(1.1);
    expect(TEXT_SCALE_ZOOM_FACTOR.large).toBe(1.25);
    expect(TEXT_SCALE_ZOOM_FACTOR.xLarge).toBe(1.5);
    expect(textScaleZoomFactor("medium")).toBe(1.1);
    expect(textScaleZoomFactor("xLarge")).toBe(1.5);
    expect(textScaleZoomFactor("nope")).toBeNull();
  });

  it("reads the current storage id and remaps the legacy key", () => {
    expect(textScaleIdFromStorage("large", "normal", 1280)).toBe("large");
    expect(textScaleIdFromStorage("xLarge", null, 1280)).toBe("xLarge");
    expect(textScaleIdFromStorage("extraLarge", null, 1280)).toBe("large");
    expect(textScaleIdFromStorage(null, "extraLarge", 1280)).toBe("large");
    expect(textScaleIdFromStorage(null, "large", 1280)).toBe("medium");
    expect(textScaleIdFromStorage(null, "normal", 1280)).toBe("small");
  });

  it("defaults to medium on desktop and small on a narrow window", () => {
    expect(textScaleIdFromStorage(null, null, 1280)).toBe("medium");
    expect(
      textScaleIdFromStorage(null, null, TEXT_SCALE_MOBILE_BREAKPOINT_PX - 1),
    ).toBe("small");
    expect(textScaleIdFromStorage(null, null, 0)).toBe("medium");
  });
});
