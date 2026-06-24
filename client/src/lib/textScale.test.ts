// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  DEFAULT_TEXT_SCALE,
  LARGE_TEXT_SCALE_FACTOR,
  TEXT_SCALE_STORAGE_KEY,
  applyTextScaleToDocument,
  getStoredTextScale,
  getTextScaleFactor,
  normalizeTextScale,
  setStoredTextScale,
  setTextScale,
} from "./textScale";

describe("textScale", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("adc-text-large");
    document.documentElement.style.removeProperty("--adc-text-scale");
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("adc-text-large");
    document.documentElement.style.removeProperty("--adc-text-scale");
  });

  it("normalizes invalid stored values to normal", () => {
    expect(normalizeTextScale(null)).toBe(DEFAULT_TEXT_SCALE);
    expect(normalizeTextScale("xlarge")).toBe(DEFAULT_TEXT_SCALE);
  });

  it("persists and reads large scale", () => {
    setStoredTextScale("large");
    expect(localStorage.getItem(TEXT_SCALE_STORAGE_KEY)).toBe("large");
    expect(getStoredTextScale()).toBe("large");
  });

  it("applies CSS variable and html class for large", () => {
    applyTextScaleToDocument("large");
    expect(document.documentElement.classList.contains("adc-text-large")).toBe(
      true,
    );
    expect(
      document.documentElement.style.getPropertyValue("--adc-text-scale"),
    ).toBe(String(LARGE_TEXT_SCALE_FACTOR));
  });

  it("setTextScale updates storage and document", () => {
    setTextScale("large");
    expect(getStoredTextScale()).toBe("large");
    expect(getTextScaleFactor("large")).toBe(LARGE_TEXT_SCALE_FACTOR);

    setTextScale("normal");
    expect(getStoredTextScale()).toBe("normal");
    expect(document.documentElement.classList.contains("adc-text-large")).toBe(
      false,
    );
    expect(
      document.documentElement.style.getPropertyValue("--adc-text-scale"),
    ).toBe("1");
  });
});
