/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyChromeVisualStage,
  clearChromeVisualStage,
} from "./chromeStageTransition";
import {
  ADC_CHROME_FROM_PROP,
  ADC_CHROME_PREV_STAGE_ATTR,
  ADC_CHROME_SOLID_PROP,
  ADC_CHROME_STAGE_ATTR,
  ADC_CHROME_TO_PROP,
} from "./madnessVisualStage";

describe("applyChromeVisualStage", () => {
  afterEach(() => {
    clearChromeVisualStage(document.documentElement);
    vi.unstubAllGlobals();
  });

  it("snaps the first paint onto the stage attrs and fade vars", () => {
    applyChromeVisualStage(document.documentElement, 3);
    expect(document.documentElement.getAttribute(ADC_CHROME_STAGE_ATTR)).toBe(
      "3",
    );
    expect(
      document.documentElement.getAttribute(ADC_CHROME_PREV_STAGE_ATTR),
    ).toBe("3");
    expect(
      document.documentElement.style.getPropertyValue(ADC_CHROME_FROM_PROP),
    ).toBe("0");
    expect(
      document.documentElement.style.getPropertyValue(ADC_CHROME_TO_PROP),
    ).toBe("1");
    expect(
      document.documentElement.style.getPropertyValue(ADC_CHROME_SOLID_PROP),
    ).toBe("0");
  });

  it("keeps fading one element when another element changes stage", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    const first = document.createElement("div");
    const second = document.createElement("div");
    document.body.append(first, second);
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });

    applyChromeVisualStage(first, 1);
    applyChromeVisualStage(first, 2);
    const fadeFirst = frames[frames.length - 1];
    applyChromeVisualStage(second, 4);
    fadeFirst(performance.now() + 500);

    const toCrack = Number(first.style.getPropertyValue(ADC_CHROME_TO_PROP));
    const fromCrack = Number(first.style.getPropertyValue(ADC_CHROME_FROM_PROP));
    expect(toCrack).toBeGreaterThan(0.4);
    expect(toCrack).toBeLessThan(0.6);
    expect(fromCrack).toBeGreaterThan(0.4);
    expect(fromCrack).toBeLessThan(0.6);
    expect(second.getAttribute(ADC_CHROME_STAGE_ATTR)).toBe("4");

    first.remove();
    second.remove();
    vi.unstubAllGlobals();
  });

  it("snaps stage 0 to a solid border and drops prev", () => {
    applyChromeVisualStage(document.documentElement, 0);
    expect(document.documentElement.getAttribute(ADC_CHROME_STAGE_ATTR)).toBe(
      "0",
    );
    expect(
      document.documentElement.getAttribute(ADC_CHROME_PREV_STAGE_ATTR),
    ).toBeNull();
    expect(
      document.documentElement.style.getPropertyValue(ADC_CHROME_TO_PROP),
    ).toBe("0");
    expect(
      document.documentElement.style.getPropertyValue(ADC_CHROME_SOLID_PROP),
    ).toBe("1");
  });
});
