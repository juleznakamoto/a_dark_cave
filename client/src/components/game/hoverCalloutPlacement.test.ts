import { describe, expect, it } from "vitest";
import {
  CALLOUT_GAP_PX,
  CALLOUT_VIEWPORT_PAD_PX,
  calloutArrowCss,
  fallbackCalloutArrow,
  placeCalloutInViewport,
} from "./hoverCalloutPlacement";

const VIEW = { viewportWidth: 400, viewportHeight: 300 };

describe("placeCalloutInViewport", () => {
  it("centers a bottom callout on a mid-screen trigger", () => {
    const placed = placeCalloutInViewport({
      side: "bottom",
      arrowAlign: "center",
      trigger: { left: 180, top: 8, width: 28, height: 28 },
      width: 120,
      height: 28,
      ...VIEW,
    });

    expect(placed.left).toBe(180 + 14 - 60);
    expect(placed.top).toBe(8 + 28 + CALLOUT_GAP_PX);
    expect(placed.arrowLeft).toBe(60);
    expect(placed.arrowTop).toBe(0);
  });

  it("shifts a right-edge bottom callout left so it stays on screen", () => {
    const placed = placeCalloutInViewport({
      side: "bottom",
      arrowAlign: "center",
      trigger: { left: 368, top: 8, width: 28, height: 28 },
      width: 160,
      height: 28,
      ...VIEW,
    });

    expect(placed.left + 160).toBeLessThanOrEqual(
      VIEW.viewportWidth - CALLOUT_VIEWPORT_PAD_PX,
    );
    expect(placed.left).toBe(
      VIEW.viewportWidth - 160 - CALLOUT_VIEWPORT_PAD_PX,
    );
    expect(placed.arrowLeft).toBeGreaterThan(80);
    expect(placed.left + placed.arrowLeft).toBeCloseTo(368 + 14, 5);
  });

  it("shifts a left-edge top callout right so it stays on screen", () => {
    const placed = placeCalloutInViewport({
      side: "top",
      arrowAlign: "center",
      trigger: { left: 4, top: 260, width: 40, height: 24 },
      width: 140,
      height: 28,
      ...VIEW,
    });

    expect(placed.left).toBe(CALLOUT_VIEWPORT_PAD_PX);
    expect(placed.top).toBeGreaterThanOrEqual(CALLOUT_VIEWPORT_PAD_PX);
    expect(placed.left + placed.arrowLeft).toBeCloseTo(4 + 20, 5);
  });
});

describe("fallbackCalloutArrow", () => {
  it("puts the arrow on the edge that faces the trigger", () => {
    expect(fallbackCalloutArrow("bottom", "center")).toEqual({
      left: "50%",
      top: "0%",
    });
    expect(fallbackCalloutArrow("top", "center")).toEqual({
      left: "50%",
      top: "100%",
    });
    expect(fallbackCalloutArrow("left", "center")).toEqual({
      left: "100%",
      top: "50%",
    });
    expect(fallbackCalloutArrow("right", "center")).toEqual({
      left: "0%",
      top: "50%",
    });
  });

  it("honors start and end alignment", () => {
    expect(fallbackCalloutArrow("bottom", "start")).toEqual({
      left: "25%",
      top: "0%",
    });
    expect(fallbackCalloutArrow("left", "end")).toEqual({
      left: "100%",
      top: "75%",
    });
  });
});

describe("calloutArrowCss", () => {
  it("uses percentages for both placed and fallback arrows", () => {
    const placed = placeCalloutInViewport({
      side: "bottom",
      arrowAlign: "center",
      trigger: { left: 180, top: 8, width: 28, height: 28 },
      width: 120,
      height: 28,
      ...VIEW,
    });

    expect(calloutArrowCss("bottom", "center", placed)).toEqual({
      left: "50%",
      top: "0%",
    });
    expect(calloutArrowCss("top", "start", null)).toEqual({
      left: "25%",
      top: "100%",
    });
  });

  it("keeps a clamped arrow as a percentage of the callout box", () => {
    const placed = placeCalloutInViewport({
      side: "bottom",
      arrowAlign: "center",
      trigger: { left: 368, top: 8, width: 28, height: 28 },
      width: 160,
      height: 28,
      ...VIEW,
    });
    const css = calloutArrowCss("bottom", "center", placed);
    expect(css.left.endsWith("%")).toBe(true);
    expect(css.top).toBe("0%");
    expect(Number.parseFloat(css.left)).toBeCloseTo(
      (placed.arrowLeft / placed.width) * 100,
      5,
    );
  });
});
