// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  DEFAULT_TEXT_SCALE,
  LARGE_CONTROL_SCALE_FACTOR,
  LARGE_TEXT_DELTA_PX,
  MEDIUM_CONTROL_SCALE_FACTOR,
  MEDIUM_TEXT_DELTA_PX,
  TEXT_SCALE_MOBILE_BREAKPOINT_PX,
  TEXT_SCALE_STORAGE_KEY,
  applyTextScaleToDocument,
  getControlScaleFactor,
  getPlatformDefaultTextScale,
  getStoredTextScale,
  getTextScaleDeltaPx,
  isEnlargedTextScale,
  normalizeTextScale,
  setStoredTextScale,
  setTextScale,
} from "./textScale";

function stubInnerWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
}

describe("textScale", () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    localStorage.clear();
    stubInnerWidth(1024);
    document.documentElement.classList.remove(
      "adc-text-large",
      "adc-text-xlarge",
    );
    document.documentElement.style.removeProperty("--adc-text-delta");
    document.documentElement.style.removeProperty("--adc-control-scale");
  });

  afterEach(() => {
    localStorage.clear();
    stubInnerWidth(originalInnerWidth);
    document.documentElement.classList.remove(
      "adc-text-large",
      "adc-text-xlarge",
    );
    document.documentElement.style.removeProperty("--adc-text-delta");
    document.documentElement.style.removeProperty("--adc-control-scale");
  });

  it("defaults to medium on desktop and small on mobile when unset", () => {
    stubInnerWidth(1024);
    expect(getPlatformDefaultTextScale()).toBe("medium");
    expect(normalizeTextScale(null)).toBe("medium");
    expect(getStoredTextScale()).toBe("medium");

    stubInnerWidth(TEXT_SCALE_MOBILE_BREAKPOINT_PX - 1);
    expect(getPlatformDefaultTextScale()).toBe("small");
    expect(normalizeTextScale(null)).toBe("small");
    expect(getStoredTextScale()).toBe("small");
  });

  it("keeps DEFAULT_TEXT_SCALE as small for SSR fallback", () => {
    expect(DEFAULT_TEXT_SCALE).toBe("small");
  });

  it("maps non-colliding legacy ids", () => {
    expect(normalizeTextScale("normal")).toBe("small");
    expect(normalizeTextScale("extraLarge")).toBe("large");
    // Current option id; old "large" (+2px) is remapped only via legacy key.
    expect(normalizeTextScale("large")).toBe("large");
  });

  it("migrates legacy localStorage into v2 key", () => {
    localStorage.setItem("adc-text-scale", "extraLarge");
    expect(getStoredTextScale()).toBe("large");
    expect(localStorage.getItem(TEXT_SCALE_STORAGE_KEY)).toBe("large");
    expect(localStorage.getItem("adc-text-scale")).toBeNull();

    localStorage.clear();
    localStorage.setItem("adc-text-scale", "large");
    expect(getStoredTextScale()).toBe("medium");
    expect(localStorage.getItem(TEXT_SCALE_STORAGE_KEY)).toBe("medium");
  });

  it("persists and reads medium and large scale", () => {
    setStoredTextScale("medium");
    expect(localStorage.getItem(TEXT_SCALE_STORAGE_KEY)).toBe("medium");
    expect(getStoredTextScale()).toBe("medium");

    setStoredTextScale("large");
    expect(localStorage.getItem(TEXT_SCALE_STORAGE_KEY)).toBe("large");
    expect(getStoredTextScale()).toBe("large");
  });

  it("applies CSS variables and html classes for medium", () => {
    applyTextScaleToDocument("medium");
    expect(document.documentElement.classList.contains("adc-text-large")).toBe(
      true,
    );
    expect(
      document.documentElement.classList.contains("adc-text-xlarge"),
    ).toBe(false);
    expect(
      document.documentElement.style.getPropertyValue("--adc-text-delta"),
    ).toBe(`${MEDIUM_TEXT_DELTA_PX}px`);
    expect(
      document.documentElement.style.getPropertyValue("--adc-control-scale"),
    ).toBe(String(MEDIUM_CONTROL_SCALE_FACTOR));
  });

  it("applies CSS variables and html classes for large", () => {
    applyTextScaleToDocument("large");
    expect(document.documentElement.classList.contains("adc-text-large")).toBe(
      true,
    );
    expect(
      document.documentElement.classList.contains("adc-text-xlarge"),
    ).toBe(true);
    expect(
      document.documentElement.style.getPropertyValue("--adc-text-delta"),
    ).toBe(`${LARGE_TEXT_DELTA_PX}px`);
    expect(
      document.documentElement.style.getPropertyValue("--adc-control-scale"),
    ).toBe(String(LARGE_CONTROL_SCALE_FACTOR));
  });

  it("setTextScale updates storage and document", () => {
    setTextScale("medium");
    expect(getStoredTextScale()).toBe("medium");
    expect(getTextScaleDeltaPx("medium")).toBe(MEDIUM_TEXT_DELTA_PX);
    expect(getControlScaleFactor("medium")).toBe(MEDIUM_CONTROL_SCALE_FACTOR);
    expect(isEnlargedTextScale("medium")).toBe(true);

    setTextScale("large");
    expect(getStoredTextScale()).toBe("large");
    expect(getTextScaleDeltaPx("large")).toBe(LARGE_TEXT_DELTA_PX);
    expect(getControlScaleFactor("large")).toBe(LARGE_CONTROL_SCALE_FACTOR);
    expect(isEnlargedTextScale("large")).toBe(true);

    setTextScale("small");
    expect(getStoredTextScale()).toBe("small");
    expect(isEnlargedTextScale("small")).toBe(false);
    expect(document.documentElement.classList.contains("adc-text-large")).toBe(
      false,
    );
    expect(
      document.documentElement.classList.contains("adc-text-xlarge"),
    ).toBe(false);
    expect(
      document.documentElement.style.getPropertyValue("--adc-text-delta"),
    ).toBe("0px");
    expect(
      document.documentElement.style.getPropertyValue("--adc-control-scale"),
    ).toBe("1");
  });
});
