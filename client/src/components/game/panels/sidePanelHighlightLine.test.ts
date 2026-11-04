import { describe, expect, it } from "vitest";
import {
  buildHighlightLineGradient,
  highlightLineHoles,
} from "./sidePanelHighlightLine";

function measure(char: string) {
  const width = char === "g" ? 8 : 7;
  return {
    width,
    descent: char === "g" ? 3 : 0,
    left: 0,
    right: width,
  };
}

describe("highlightLineHoles", () => {
  it("opens a gap around a descending letter and leaves the others solid", () => {
    expect(highlightLineHoles("Lodge", measure)).toEqual([
      { start: 7 + 7 + 7 - 2, end: 7 + 7 + 7 + 8 + 2 },
    ]);
    expect(highlightLineHoles("Cabin", measure)).toEqual([]);
  });
});

describe("buildHighlightLineGradient", () => {
  it("fades the ends and leaves the center open", () => {
    const gradient = buildHighlightLineGradient(100, 15, []);
    expect(gradient.startsWith("linear-gradient(to right, transparent 0px")).toBe(true);
    expect(gradient).toContain("transparent 46px");
    expect(gradient).toContain("transparent 54px");
    expect(gradient.endsWith("transparent 100px)")).toBe(true);
  });

  it("keeps a gap around the g as well as the dot", () => {
    const holes = highlightLineHoles("xxxxg", measure);
    const gradient = buildHighlightLineGradient(120, 15, holes);
    expect(gradient).toContain("transparent 26px");
    expect(gradient).toContain("transparent 38px");
    expect(gradient).toContain("transparent 56px");
    expect(gradient).toContain("transparent 64px");
  });
});
