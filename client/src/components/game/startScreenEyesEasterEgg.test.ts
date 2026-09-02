import { describe, expect, it } from "vitest";
import {
  eyesEasterEggCenterFraction,
  isInEyesEasterEggHotZone,
} from "./startScreenEyesEasterEgg";

describe("start-screen eyes easter egg", () => {
  it("places the left side in the upper-left quadrant center", () => {
    expect(eyesEasterEggCenterFraction("left")).toEqual({ x: 0.25, y: 0.25 });
  });

  it("places the right side in the upper-right quadrant center", () => {
    expect(eyesEasterEggCenterFraction("right")).toEqual({ x: 0.75, y: 0.25 });
  });

  it("hits the chosen side and misses the opposite side", () => {
    const width = 1000;
    const height = 800;
    const leftCenter = { x: 250, y: 200 };
    const rightCenter = { x: 750, y: 200 };

    expect(
      isInEyesEasterEggHotZone(
        leftCenter.x,
        leftCenter.y,
        width,
        height,
        "left",
      ),
    ).toBe(true);
    expect(
      isInEyesEasterEggHotZone(
        rightCenter.x,
        rightCenter.y,
        width,
        height,
        "left",
      ),
    ).toBe(false);
    expect(
      isInEyesEasterEggHotZone(
        rightCenter.x,
        rightCenter.y,
        width,
        height,
        "right",
      ),
    ).toBe(true);
    expect(
      isInEyesEasterEggHotZone(
        leftCenter.x,
        leftCenter.y,
        width,
        height,
        "right",
      ),
    ).toBe(false);
  });
});
