/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
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
