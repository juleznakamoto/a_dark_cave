import { describe, expect, it } from "vitest";
import {
  parseWindowFullscreenPreference,
  serializeWindowFullscreenPreference,
} from "./windowState";

describe("window fullscreen preference", () => {
  it("defaults to fullscreen when nothing was saved", () => {
    expect(parseWindowFullscreenPreference(null)).toBe(true);
    expect(parseWindowFullscreenPreference("")).toBe(true);
    expect(parseWindowFullscreenPreference("not-json")).toBe(true);
    expect(parseWindowFullscreenPreference('{"fullscreen":"yes"}')).toBe(true);
  });

  it("restores the mode the window was closed in", () => {
    expect(parseWindowFullscreenPreference('{"fullscreen":false}')).toBe(false);
    expect(parseWindowFullscreenPreference('{"fullscreen":true}\n')).toBe(true);
    expect(
      parseWindowFullscreenPreference(serializeWindowFullscreenPreference(false)),
    ).toBe(false);
  });
});