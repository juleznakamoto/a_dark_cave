import { describe, expect, it } from "vitest";
import { resolveDesktopColumnResize, holdDesktopOtherWidth } from "./panelResize";

describe("resolveDesktopColumnResize", () => {
  it("grows a side into the middle column while the middle is above its minimum", () => {
    expect(
      resolveDesktopColumnResize({
        panel: "sidePanel",
        desiredPx: 500,
        mainWidthPx: 1600,
        otherWidthPx: 400,
      }),
    ).toEqual({ draggedPx: 500, otherPx: null });
  });

  it("shrinks the opposite side once the middle column is at its minimum", () => {
    expect(
      resolveDesktopColumnResize({
        panel: "sidePanel",
        desiredPx: 500,
        mainWidthPx: 1400,
        otherWidthPx: 450,
      }),
    ).toEqual({ draggedPx: 500, otherPx: 388 });

    expect(
      resolveDesktopColumnResize({
        panel: "log",
        desiredPx: 500,
        mainWidthPx: 1400,
        otherWidthPx: 500,
      }),
    ).toEqual({ draggedPx: 500, otherPx: 388 });
  });

  it("stops at the dragged side's own maximum", () => {
    expect(
      resolveDesktopColumnResize({
        panel: "sidePanel",
        desiredPx: 800,
        mainWidthPx: 1400,
        otherWidthPx: 450,
      }),
    ).toEqual({ draggedPx: 600, otherPx: 288 });
  });

  it("stops when the opposite side reaches its minimum", () => {
    expect(
      resolveDesktopColumnResize({
        panel: "sidePanel",
        desiredPx: 600,
        mainWidthPx: 1100,
        otherWidthPx: 400,
      }),
    ).toEqual({ draggedPx: 388, otherPx: 200 });
  });

  it("does not give width back to the opposite side when this side shrinks", () => {
    expect(
      resolveDesktopColumnResize({
        panel: "log",
        desiredPx: 300,
        mainWidthPx: 1600,
        otherWidthPx: 400,
      }),
    ).toEqual({ draggedPx: 300, otherPx: null });
  });

  it("clamps the dragged side to its minimum", () => {
    expect(
      resolveDesktopColumnResize({
        panel: "sidePanel",
        desiredPx: 100,
        mainWidthPx: 1600,
        otherWidthPx: 400,
      }),
    ).toEqual({ draggedPx: 240, otherPx: null });
  });
});

describe("holdDesktopOtherWidth", () => {
  it("keeps a shrink that an earlier move already required", () => {
    expect(holdDesktopOtherWidth(null, 288)).toBe(288);
    expect(holdDesktopOtherWidth(260, 288)).toBe(260);
    expect(holdDesktopOtherWidth(null, null)).toBeNull();
  });
});
