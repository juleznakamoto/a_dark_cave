/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { gameActionOutlineButtonClassName } from "@/components/CooldownButton";
import {
  DESTROYED_CHROME_ENABLED,
  destroyedChromeMaskStyle,
  GAME_CHROME_RULE_BOTTOM,
  gameChromeBoxClassName,
  gameChromeDialogClassName,
  destroyedChromeTinyMaskStyle,
  gameChromeSlotClassName,
  gameChromeTinyClassName,
  gameChromeTooltipClassName,
} from "./gameChrome";

describe("destroyed chrome switch", () => {
  it("is a code flag, not hardcoded per surface", () => {
    expect(typeof DESTROYED_CHROME_ENABLED).toBe("boolean");
  });

  it("keeps seams and outline buttons in sync with the flag", () => {
    const box = gameChromeBoxClassName();
    const outline = gameActionOutlineButtonClassName(false);
    const mask = destroyedChromeMaskStyle("gatherWood");

    const tooltip = gameChromeTooltipClassName();
    const dialog = gameChromeDialogClassName();
    const slot = gameChromeSlotClassName();

    if (DESTROYED_CHROME_ENABLED) {
      expect(GAME_CHROME_RULE_BOTTOM).toContain("game-chrome-rule--bottom");
      expect(box).toContain("game-chrome-rule--box");
      expect(box).toContain("border-transparent");
      expect(outline).toContain("border-orange-950");
      expect(outline).not.toContain("game-chrome-rule--box");
      expect(outline).not.toContain("border-transparent");
      expect(tooltip).toContain("game-chrome-rule--tooltip");
      expect(tooltip).toContain("border-transparent");
      expect(dialog).toContain("game-chrome-rule--dialog");
      expect(slot).toContain("game-chrome-rule--slot");
      expect(slot).toContain("game-chrome-rule--compact");
      expect(gameChromeTinyClassName()).toContain("game-chrome-rule--compact");
      expect(slot).toContain("border-transparent");
      expect(slot).toContain("border");
      expect(mask["--adc-chrome-mask-x"]).toMatch(/^\d+px$/);
    } else {
      expect(GAME_CHROME_RULE_BOTTOM).toBe("border-b border-border");
      expect(box).toBe("");
      expect(outline).not.toContain("game-chrome-rule--box");
      expect(outline).toContain("border-orange-950");
      expect(tooltip).toBe("");
      expect(dialog).toBe("");
      expect(slot).toBe("");
      expect(gameChromeTinyClassName()).toBe("");
      expect(mask).toEqual({});
    }
  });

  it("gives different mask phases to different seeds", () => {
    if (!DESTROYED_CHROME_ENABLED) return;
    expect(destroyedChromeMaskStyle("gatherWood")).not.toEqual(
      destroyedChromeMaskStyle("buildWoodenHut"),
    );
  });

  it("gives tiny −/+, queue, and preset controls the same busy-stretch treatment", () => {
    if (!DESTROYED_CHROME_ENABLED) return;
    expect(destroyedChromeTinyMaskStyle("unassign-gatherer")).not.toEqual(
      destroyedChromeTinyMaskStyle("assign-gatherer"),
    );
    expect(destroyedChromeTinyMaskStyle("unassign-gatherer")).not.toEqual(
      destroyedChromeTinyMaskStyle("unassign-hunter"),
    );
    expect(destroyedChromeTinyMaskStyle("unassign-gatherer")).toEqual(
      destroyedChromeMaskStyle("unassign-gatherer", { small: true }),
    );
    expect(destroyedChromeTinyMaskStyle("preset-slot-1")["--adc-chrome-mask-x"]).toMatch(
      /^\d+px$/,
    );
  });

  it("drops 0 / 0-1 / 0-2 / 0-3 box corners as madness stage rises", () => {
    if (!DESTROYED_CHROME_ENABLED) return;
    const corners = ["tl", "tr", "bl", "br"] as const;
    const missing = (seed: string, stage: 1 | 2 | 3 | 4) => {
      const style = destroyedChromeMaskStyle(seed);
      const mask = Number(style[`--adc-chrome-c-${stage}`] ?? 15);
      return corners.filter((_, bit) => ((mask >> bit) & 1) === 0);
    };
    const seeds = [
      "gatherWood",
      "buildWoodenHut",
      "chrome-demo-dialog",
      "claim-item",
      "unassign-gatherer",
    ];
    for (const seed of seeds) {
      expect(missing(seed, 1)).toHaveLength(0);
      expect(missing(seed, 2).length).toBeGreaterThanOrEqual(0);
      expect(missing(seed, 2).length).toBeLessThanOrEqual(1);
      expect(missing(seed, 3).length).toBeLessThanOrEqual(2);
      expect(missing(seed, 4).length).toBeLessThanOrEqual(3);
      expect(missing(seed, 4).length).toBeGreaterThanOrEqual(missing(seed, 3).length);
      expect(missing(seed, 3)).toEqual(
        expect.arrayContaining(missing(seed, 2)),
      );
    }
    const extremeMissing = new Set(
      seeds.map((seed) => missing(seed, 4).join(",")),
    );
    expect(extremeMissing.size).toBeGreaterThan(1);
    const packed = destroyedChromeMaskStyle("gatherWood");
    expect(packed["--adc-chrome-c-1"]).toBe("15");
    expect(packed["--adc-chrome-c-tl-4"]).toBeUndefined();
  });

  it("keeps at least two corners on tiny −/+/slot/preset squares at Extreme", () => {
    if (!DESTROYED_CHROME_ENABLED) return;
    const missing = (seed: string, stage: 1 | 2 | 3 | 4, small: boolean) => {
      const style = destroyedChromeMaskStyle(seed, small ? { small: true } : undefined);
      const mask = Number(style[`--adc-chrome-c-${stage}`] ?? 15);
      return [0, 1, 2, 3].filter((bit) => ((mask >> bit) & 1) === 0).length;
    };
    const seeds = [
      "unassign-gatherer",
      "assign-hunter",
      "preset-slot-1",
      "chrome-demo-slot-used",
      "preset-save",
      "chrome-demo-preset-1",
    ];
    for (const seed of seeds) {
      expect(missing(seed, 4, true)).toBeLessThanOrEqual(2);
      expect(missing(seed, 4, true)).toBeGreaterThanOrEqual(missing(seed, 3, true));
    }
    const tinyExtreme = seeds.map((seed) => missing(seed, 4, true));
    expect(Math.max(...tinyExtreme)).toBe(2);
  });
});
