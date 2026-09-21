/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import {
  chromeStageFadeWeights,
  chromeStageShouldDissolve,
  getMadnessVisualStage,
  MADNESS_STAGE_TEXT_CLASS,
  madnessForVisualStage,
  parseChromeDistortionQuery,
  parseMadnessVisualStage,
} from "./madnessVisualStage";

describe("getMadnessVisualStage", () => {
  it("maps madness onto the side-panel bands", () => {
    expect(getMadnessVisualStage(0)).toBe(0);
    expect(getMadnessVisualStage(9)).toBe(0);
    expect(getMadnessVisualStage(10)).toBe(1);
    expect(getMadnessVisualStage(19)).toBe(1);
    expect(getMadnessVisualStage(20)).toBe(2);
    expect(getMadnessVisualStage(29)).toBe(2);
    expect(getMadnessVisualStage(30)).toBe(3);
    expect(getMadnessVisualStage(39)).toBe(3);
    expect(getMadnessVisualStage(40)).toBe(4);
    expect(getMadnessVisualStage(80)).toBe(4);
  });

  it("uses the band floor as the slider sample value", () => {
    expect(madnessForVisualStage(4)).toBe(40);
    expect(getMadnessVisualStage(madnessForVisualStage(3))).toBe(3);
  });
});

describe("parseMadnessVisualStage", () => {
  it("reads 0–4 and ignores anything else", () => {
    expect(parseMadnessVisualStage("0")).toBe(0);
    expect(parseMadnessVisualStage("4")).toBe(4);
    expect(parseMadnessVisualStage("5")).toBeNull();
    expect(parseMadnessVisualStage(null)).toBeNull();
  });
});

describe("chromeStageShouldDissolve", () => {
  it("skips the first paint and no-ops", () => {
    expect(chromeStageShouldDissolve(null, 4)).toBe(false);
    expect(chromeStageShouldDissolve(2, 2)).toBe(false);
  });

  it("dissolves every real stage change, including none", () => {
    expect(chromeStageShouldDissolve(0, 2)).toBe(true);
    expect(chromeStageShouldDissolve(3, 0)).toBe(true);
    expect(chromeStageShouldDissolve(1, 4)).toBe(true);
    expect(chromeStageShouldDissolve(4, 2)).toBe(true);
  });
});

describe("chromeStageFadeWeights", () => {
  it("crossfades two cracked stages without a solid border", () => {
    expect(chromeStageFadeWeights(4, 3, 0)).toEqual({
      fromCrack: 1,
      toCrack: 0,
      solid: 0,
    });
    expect(chromeStageFadeWeights(4, 3, 0.5)).toEqual({
      fromCrack: 0.5,
      toCrack: 0.5,
      solid: 0,
    });
    expect(chromeStageFadeWeights(4, 3, 1)).toEqual({
      fromCrack: 0,
      toCrack: 1,
      solid: 0,
    });
  });

  it("mixes cracks with the solid border when none is involved", () => {
    expect(chromeStageFadeWeights(4, 0, 0.5)).toEqual({
      fromCrack: 0.5,
      toCrack: 0,
      solid: 0.5,
    });
    expect(chromeStageFadeWeights(0, 4, 0.5)).toEqual({
      fromCrack: 0,
      toCrack: 0.5,
      solid: 0.5,
    });
  });
});

describe("MADNESS_STAGE_TEXT_CLASS", () => {
  it("only uses pulse classes that exist in CSS", () => {
    expect(MADNESS_STAGE_TEXT_CLASS[1]).toBe(
      "madness-pulse-light text-violet-200",
    );
    expect(MADNESS_STAGE_TEXT_CLASS[4]).toBe(
      "madness-pulse-extreme text-violet-500",
    );
    expect(Object.values(MADNESS_STAGE_TEXT_CLASS).join(" ")).not.toMatch(
      /madness-light|madness-medium|madness-intense|madness-extreme(?!-)/,
    );
  });
});

describe("parseChromeDistortionQuery", () => {
  it("reads 0–4 and band names", () => {
    expect(parseChromeDistortionQuery("?distortion=0")).toBe(0);
    expect(parseChromeDistortionQuery("?distortion=4")).toBe(4);
    expect(parseChromeDistortionQuery("?devSave=bastion&distortion=2")).toBe(2);
    expect(parseChromeDistortionQuery("?distortion=extreme")).toBe(4);
    expect(parseChromeDistortionQuery("?distortion=Light")).toBe(1);
  });

  it("ignores missing or invalid values", () => {
    expect(parseChromeDistortionQuery("")).toBeNull();
    expect(parseChromeDistortionQuery("?devSave=bastion")).toBeNull();
    expect(parseChromeDistortionQuery("?distortion=5")).toBeNull();
    expect(parseChromeDistortionQuery("?distortion=")).toBeNull();
  });
});
