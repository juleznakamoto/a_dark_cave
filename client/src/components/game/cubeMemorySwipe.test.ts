import { describe, expect, it } from "vitest";
import {
  CUBE_MEMORY_SWIPE_MIN_PX,
  cubeMemorySwipeDirection,
} from "./cubeMemorySwipe";

describe("cubeMemorySwipeDirection", () => {
  it("treats a leftward finger move as next", () => {
    expect(cubeMemorySwipeDirection(-80, 10)).toBe("next");
  });

  it("treats a rightward finger move as previous", () => {
    expect(cubeMemorySwipeDirection(80, -10)).toBe("previous");
  });

  it("ignores a short drag and a mostly vertical drag", () => {
    expect(cubeMemorySwipeDirection(CUBE_MEMORY_SWIPE_MIN_PX - 1, 0)).toBe(
      null,
    );
    expect(cubeMemorySwipeDirection(-80, 80)).toBe(null);
    expect(cubeMemorySwipeDirection(20, -90)).toBe(null);
  });
});