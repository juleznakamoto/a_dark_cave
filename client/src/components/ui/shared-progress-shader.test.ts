/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import {
  resolveSharedProgressShaderCellClip,
  resolveSharedProgressShaderDisplayBox,
  scheduleSharedProgressShaderPrewarm,
  nextSharedProgressHoverExtraSeconds,
  SHARED_PROGRESS_BAR_REST_OPACITY,
  SHARED_PROGRESS_SHADER_COLOR_TOKENS,
  sharedProgressSegmentOpacity,
} from "./shared-progress-shader";

describe("shared progress shader", () => {
  it("exports a palette used by Estate upgrade bars", () => {
    expect(SHARED_PROGRESS_SHADER_COLOR_TOKENS.length).toBeGreaterThan(0);
  });

  it("holds estate and wave bars at 80% until that bar is hovered", () => {
    const host = document.createElement("div");
    const bar = document.createElement("div");
    bar.setAttribute("data-progress-dim", "");
    const segment = document.createElement("div");
    const plain = document.createElement("div");
    bar.appendChild(segment);
    host.append(bar, plain);
    document.body.appendChild(host);

    expect(SHARED_PROGRESS_BAR_REST_OPACITY).toBe(0.8);
    expect(sharedProgressSegmentOpacity(segment)).toBe(0.8);
    expect(sharedProgressSegmentOpacity(plain)).toBe(1);

    const hover = vi.spyOn(bar, "matches").mockImplementation(
      (selector) => selector === ":hover",
    );
    expect(sharedProgressSegmentOpacity(segment)).toBe(1);
    hover.mockRestore();
    host.remove();
  });

  it("adds 1000% of the resting clock while hovered, and keeps it after", () => {
    expect(nextSharedProgressHoverExtraSeconds(0, 1, false)).toBe(0);
    expect(nextSharedProgressHoverExtraSeconds(0.2, 1, false)).toBe(0.2);
    // A 100ms frame at scale 0.15 moves the resting clock 0.015.
    // Hover adds 1000% of that (0.15). A long stall stays capped at one frame.
    expect(nextSharedProgressHoverExtraSeconds(0, 0.1, true)).toBeCloseTo(0.15);
    expect(nextSharedProgressHoverExtraSeconds(0.15, 0.1, false)).toBeCloseTo(
      0.15,
    );
    expect(nextSharedProgressHoverExtraSeconds(0, 5, true)).toBeCloseTo(0.15);
  });

  it("prewarm is safe to call when WebGL is missing", () => {
    expect(() => scheduleSharedProgressShaderPrewarm()).not.toThrow();
    expect(() => scheduleSharedProgressShaderPrewarm()).not.toThrow();
    expect(() =>
      scheduleSharedProgressShaderPrewarm({ immediate: true }),
    ).not.toThrow();
  });
});

describe("resolveSharedProgressShaderDisplayBox", () => {
  it("grows with the host when the canvas was pinned to an earlier height", () => {
    // Estate first visit: sleep + huntress. Later Tireless Worker unlocks
    // and the host grows; the canvas CSS size stays at the first pin.
    expect(
      resolveSharedProgressShaderDisplayBox(
        { width: 320, height: 640 },
        { width: 320, height: 280 },
      ),
    ).toEqual({ width: 320, height: 640 });
  });

  it("uses the host when both boxes are measurable", () => {
    expect(
      resolveSharedProgressShaderDisplayBox(
        { width: 400, height: 200 },
        { width: 400, height: 200 },
      ),
    ).toEqual({ width: 400, height: 200 });
  });

  it("falls back to the canvas while the host is hidden (0×0)", () => {
    expect(
      resolveSharedProgressShaderDisplayBox(
        { width: 0, height: 0 },
        { width: 320, height: 280 },
      ),
    ).toEqual({ width: 320, height: 280 });
  });
});

describe("resolveSharedProgressShaderCellClip", () => {
  it("insets the fill 1 CSS px from the left to match the segment rim", () => {
    expect(
      resolveSharedProgressShaderCellClip(
        { left: 40, bottom: 10, width: 80, height: 16 },
        2,
      ),
    ).toEqual({ left: 42, bottom: 10, width: 78, height: 16 });
  });
});
