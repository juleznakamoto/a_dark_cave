import { describe, expect, it } from "vitest";
import {
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
  });
});
