import { describe, expect, it } from "vitest";
import { volumeFromClientX } from "./volumeSlider";

describe("volumeFromClientX", () => {
  const left = 100;
  const width = 216;
  const thumb = 16;

  it("maps the knob center from silent to full", () => {
    expect(volumeFromClientX(left + thumb / 2, left, width, thumb)).toBe(0);
    expect(volumeFromClientX(left + width / 2, left, width, thumb)).toBe(0.5);
    expect(volumeFromClientX(left + width - thumb / 2, left, width, thumb)).toBe(1);
  });

  it("clamps past either end", () => {
    expect(volumeFromClientX(left - 40, left, width, thumb)).toBe(0);
    expect(volumeFromClientX(left + width + 40, left, width, thumb)).toBe(1);
  });

  it("returns 0 when the track is narrower than the knob", () => {
    expect(volumeFromClientX(50, 0, 10, 16)).toBe(0);
  });
});
