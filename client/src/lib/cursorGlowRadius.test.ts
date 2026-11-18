import { describe, expect, it } from "vitest";
import { cursorGlowRadius } from "./cursorGlowRadius";

describe("cursorGlowRadius", () => {
  it("keeps the desktop radius as a fraction of screen height", () => {
    expect(cursorGlowRadius(0.35, 1920, 1080)).toBeCloseTo(0.35);
    expect(cursorGlowRadius(0.35, 768, 1024)).toBeCloseTo(0.35);
  });

  it("shrinks to half of that fraction of the shorter edge on a phone", () => {
    expect(cursorGlowRadius(0.35, 390, 844)).toBeCloseTo(0.175 * (390 / 844));
    expect(cursorGlowRadius(0.35, 844, 390)).toBeCloseTo(0.175);
    expect(cursorGlowRadius(0.35, 767, 1024)).toBeCloseTo(0.175 * (767 / 1024));
  });
});
