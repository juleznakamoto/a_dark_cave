import { describe, expect, it } from "vitest";
import {
  resolveSharedProgressShaderDisplayBox,
  scheduleSharedProgressShaderPrewarm,
  SHARED_PROGRESS_SHADER_COLOR_TOKENS,
} from "./shared-progress-shader";

describe("shared progress shader", () => {
  it("exports a palette used by Estate upgrade bars", () => {
    expect(SHARED_PROGRESS_SHADER_COLOR_TOKENS.length).toBeGreaterThan(0);
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
