import { describe, expect, it } from "vitest";
import { ANCIENT_WISDOM_BOOKS, itemChartConfig } from "./item";

describe("item Ancient Wisdom", () => {
  it("requires all four books, including the Book of Chainmaster", () => {
    const seg = itemChartConfig.rings
      .flat()
      .find((s) => s.segmentId === "3-ancient_books");

    expect(seg?.maxCount).toBe(4);
    expect(ANCIENT_WISDOM_BOOKS).toEqual([
      "book_of_ascension",
      "book_of_trials",
      "book_of_chainmaster",
      "book_of_absolution",
    ]);
  });
});
