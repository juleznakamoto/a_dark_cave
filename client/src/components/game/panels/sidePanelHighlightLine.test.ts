/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildHighlightLineGradient,
  highlightLineHoles,
  syncSidePanelHighlightLines,
  syncSidePanelNewItemLines,
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

  it("fades the ends and skips the center gap for the dotted line", () => {
    const holes = highlightLineHoles("xxxxg", measure);
    const gradient = buildHighlightLineGradient(120, 15, holes, {
      color: "#000",
      centerGap: false,
    });
    expect(gradient.startsWith("linear-gradient(to right, transparent 0px")).toBe(
      true,
    );
    expect(gradient).toContain("#000 3px");
    expect(gradient).toContain("transparent 26px");
    expect(gradient).toContain("transparent 38px");
    expect(gradient).not.toContain("transparent 56px");
    expect(gradient.endsWith("transparent 120px)")).toBe(true);
  });
});

describe("syncSidePanelHighlightLines", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function stubMeasurement() {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 80,
      height: 14,
      top: 0,
      left: 0,
      bottom: 14,
      right: 80,
      x: 0,
      y: 0,
      toJSON() {
        return {};
      },
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      font: "",
      measureText: () => ({
        width: 8,
        actualBoundingBoxDescent: 0,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: 8,
      }),
    } as unknown as CanvasRenderingContext2D);
  }

  it("clears the gradient on a node that lost the highlight class", () => {
    stubMeasurement();
    const root = document.createElement("div");
    const name = document.createElement("span");
    name.className = "side-panel-highlight-line";
    name.textContent = "Palisade";
    root.append(name);

    const painted = syncSidePanelHighlightLines(root, []);
    expect(name.style.backgroundImage).toContain("linear-gradient");

    name.className = "";
    syncSidePanelHighlightLines(root, painted);
    expect(name.style.backgroundImage).toBe("");
  });

  it("paints the line again when the name stays highlighted", () => {
    stubMeasurement();
    const root = document.createElement("div");
    const name = document.createElement("span");
    name.className = "side-panel-highlight-line";
    name.textContent = "Palisade";
    root.append(name);

    const painted = syncSidePanelHighlightLines(root, []);
    const again = syncSidePanelHighlightLines(root, painted);
    expect(name.style.backgroundImage).toContain("linear-gradient");
    expect(again).toEqual([name]);
  });

  it("cuts the dotted line around a descending letter and clears it when the class leaves", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 80,
      height: 14,
      top: 0,
      left: 0,
      bottom: 14,
      right: 80,
      x: 0,
      y: 0,
      toJSON() {
        return {};
      },
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      font: "",
      measureText: (char: string) => ({
        width: 8,
        actualBoundingBoxDescent: char === "g" ? 3 : 0,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: 8,
      }),
    } as unknown as CanvasRenderingContext2D);
    const root = document.createElement("div");
    const name = document.createElement("span");
    name.className = "side-panel-new-item-line";
    name.textContent = "Jägerhütte";
    root.append(name);

    const painted = syncSidePanelNewItemLines(root, []);
    const mask = name.style.getPropertyValue("--side-panel-new-item-mask");
    expect(mask).toContain("transparent 14px");
    expect(mask).toContain("transparent 26px");
    expect(mask).not.toContain("currentColor");

    name.className = "";
    syncSidePanelNewItemLines(root, painted);
    expect(name.style.getPropertyValue("--side-panel-new-item-mask")).toBe("");
  });
});
