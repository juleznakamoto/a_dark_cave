/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { shrinkTooltipFrame } from "./tooltipShrinkWrap";

function installLayout(
  el: HTMLElement,
  layout: (styleWidth: string) => { width: number; height: number },
) {
  Object.defineProperty(el, "offsetWidth", {
    configurable: true,
    get: () => layout(el.style.width).width,
  });
  Object.defineProperty(el, "offsetHeight", {
    configurable: true,
    get: () => layout(el.style.width).height,
  });
}

describe("shrinkTooltipFrame", () => {
  it("leaves a tip alone when it is already as narrow as its text", () => {
    const el = document.createElement("div");
    el.textContent = "Cycle";
    installLayout(el, () => ({ width: 120, height: 20 }));

    shrinkTooltipFrame(el);

    expect(el.style.width).toBe("");
  });

  it("does nothing while the tip has no layout size", () => {
    const el = document.createElement("div");
    el.textContent = "Cycle";
    installLayout(el, () => ({ width: 0, height: 0 }));

    shrinkTooltipFrame(el);

    expect(el.style.width).toBe("");
  });

  it("drops the unused width when a hard line break already fits", () => {
    const el = document.createElement("div");
    el.textContent = "Temporary production bonuses not active\nwhile sleeping";
    installLayout(el, (styleWidth) => {
      if (styleWidth === "min-content") return { width: 90, height: 40 };
      if (styleWidth.endsWith("px")) {
        return { width: Number.parseFloat(styleWidth), height: 40 };
      }
      return { width: 280, height: 40 };
    });

    shrinkTooltipFrame(el);

    expect(el.style.width).toBe("91px");
  });

  it("shrinks a soft wrap to the longest line, not the max-width cap", () => {
    const el = document.createElement("div");
    el.textContent = "Temporary production bonuses not active while sleeping";
    installLayout(el, (styleWidth) => {
      if (styleWidth === "min-content") return { width: 40, height: 96 };
      if (styleWidth.endsWith("px")) {
        const width = Number.parseFloat(styleWidth);
        return { width, height: width < 220 ? 96 : 40 };
      }
      return { width: 320, height: 40 };
    });

    shrinkTooltipFrame(el);

    const width = Number.parseFloat(el.style.width);
    expect(width).toBeGreaterThanOrEqual(220);
    expect(width).toBeLessThanOrEqual(222);
  });

  it("ignores the clipped screen-reader copy when shrinking a soft wrap", () => {
    const el = document.createElement("div");
    el.textContent = "Ein stiller Raum, in dem Schreiber sorgsam jede Arbeitskraft verzeichnen";
    installLayout(el, (styleWidth) => {
      if (styleWidth === "min-content") return { width: 40, height: 120 };
      if (styleWidth.endsWith("px")) {
        const width = Number.parseFloat(styleWidth);
        return { width, height: width < 250 ? 120 : 80 };
      }
      return { width: 288, height: 80 };
    });
    const clone = document.createElement("span");
    clone.style.position = "absolute";
    clone.style.overflow = "hidden";
    clone.style.whiteSpace = "nowrap";
    clone.style.clip = "rect(0px, 0px, 0px, 0px)";
    el.appendChild(clone);
    Object.defineProperty(clone, "offsetWidth", { configurable: true, get: () => 1 });
    Object.defineProperty(clone, "offsetHeight", { configurable: true, get: () => 1 });
    Object.defineProperty(clone, "scrollWidth", { configurable: true, get: () => 628 });
    Object.defineProperty(clone, "clientWidth", { configurable: true, get: () => 1 });

    shrinkTooltipFrame(el);

    const width = Number.parseFloat(el.style.width);
    expect(width).toBeGreaterThanOrEqual(250);
    expect(width).toBeLessThanOrEqual(252);
  });

  it("stays wide enough for a row that cannot wrap", () => {
    const el = document.createElement("div");
    el.textContent = "Stone";
    const row = document.createElement("div");
    el.appendChild(row);
    installLayout(el, (styleWidth) => {
      if (styleWidth === "min-content") return { width: 20, height: 40 };
      if (styleWidth.endsWith("px")) {
        return { width: Number.parseFloat(styleWidth), height: 40 };
      }
      return { width: 300, height: 40 };
    });
    Object.defineProperty(row, "scrollWidth", {
      configurable: true,
      get: () => 180,
    });
    Object.defineProperty(row, "clientWidth", {
      configurable: true,
      get: () => {
        if (el.style.width === "min-content") return 20;
        if (el.style.width.endsWith("px")) return Number.parseFloat(el.style.width);
        return 300;
      },
    });

    shrinkTooltipFrame(el);

    const width = Number.parseFloat(el.style.width);
    expect(width).toBeGreaterThanOrEqual(180);
    expect(width).toBeLessThanOrEqual(182);
  });
});
