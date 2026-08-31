import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PRESS_BOILERPLATE_LONG,
  PRESS_BOILERPLATE_SHORT,
  PRESS_CAPSULES,
  PRESS_LOCKED_LINE,
  PRESS_PERMISSIONS,
  PRESS_SCREENSHOTS,
  countWords,
  getPressPageInnerHtml,
} from "./pressKit";

const PRESS_KIT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../client/public/press-kit",
);

const FORBIDDEN = [
  /\bMTX\b/i,
  /\bIAP\b/i,
  /in-game purchase/i,
  /optional unlock/i,
  /free to play/i,
  /Steam is free/i,
  /free on Steam/i,
  /free Steam (edition|version|game)/i,
];

function assertPressSafe(text: string) {
  for (const pattern of FORBIDDEN) {
    expect(text).not.toMatch(pattern);
  }
  expect(text).not.toContain("\u2014");
}

describe("press kit copy", () => {
  it("keeps the locked line short and quote-ready", () => {
    expect(PRESS_LOCKED_LINE).toBe(
      "Dark story-driven minimalist incremental village builder",
    );
    expect(countWords(PRESS_LOCKED_LINE)).toBeLessThanOrEqual(12);
    assertPressSafe(PRESS_LOCKED_LINE);
  });

  it("keeps short boilerplate near 50 words", () => {
    const words = countWords(PRESS_BOILERPLATE_SHORT);
    expect(words).toBeGreaterThanOrEqual(40);
    expect(words).toBeLessThanOrEqual(60);
    assertPressSafe(PRESS_BOILERPLATE_SHORT);
    expect(PRESS_BOILERPLATE_SHORT).toMatch(/Play for free in your browser/);
    expect(PRESS_BOILERPLATE_SHORT).toMatch(/paid Steam edition/);
    expect(PRESS_BOILERPLATE_SHORT).toMatch(/free demo/);
  });

  it("keeps long boilerplate near 150 words", () => {
    const words = countWords(PRESS_BOILERPLATE_LONG);
    expect(words).toBeGreaterThanOrEqual(120);
    expect(words).toBeLessThanOrEqual(180);
    assertPressSafe(PRESS_BOILERPLATE_LONG);
    expect(PRESS_BOILERPLATE_LONG).toMatch(/A Dark Room/);
    expect(PRESS_BOILERPLATE_LONG).toMatch(/Kittens Game/);
    expect(PRESS_BOILERPLATE_LONG).toMatch(/19 to 26 October 2026/);
    expect(PRESS_BOILERPLATE_LONG).toMatch(/support@a-dark-cave\.com/);
  });

  it("allows monetized video in the permissions line", () => {
    expect(PRESS_PERMISSIONS).toMatch(/monetize/i);
    expect(PRESS_PERMISSIONS).not.toMatch(/review key/i);
    assertPressSafe(PRESS_PERMISSIONS);
  });

  it("names screenshots a_dark_cave_screenshot_01…", () => {
    expect(PRESS_SCREENSHOTS).toHaveLength(11);
    PRESS_SCREENSHOTS.forEach((asset, index) => {
      const n = String(index + 1).padStart(2, "0");
      expect(asset.fileName).toBe(`a_dark_cave_screenshot_${n}.jpg`);
    });
  });

  it("includes wide, square, and library capsules", () => {
    const names = PRESS_CAPSULES.map((asset) => asset.fileName);
    expect(names).toEqual([
      "a_dark_cave_main_capsule.jpg",
      "a_dark_cave_square_capsule.jpg",
      "a_dark_cave_library_capsule.jpg",
    ]);
  });

  it("ships first-HTML with boilerplate and the zip link", () => {
    const html = getPressPageInnerHtml();
    expect(html).toContain(PRESS_LOCKED_LINE);
    expect(html).toContain("Short boilerplate");
    expect(html).toContain("/press-kit/a_dark_cave_press_kit.zip");
    expect(html).toContain("support@a-dark-cave.com");
  });
});

describe("press kit files", () => {
  it("has the zip and named screenshot files on disk", () => {
    expect(
      existsSync(join(PRESS_KIT_DIR, "a_dark_cave_press_kit.zip")),
    ).toBe(true);
    expect(
      statSync(join(PRESS_KIT_DIR, "a_dark_cave_press_kit.zip")).size,
    ).toBeGreaterThan(1000);
    expect(
      existsSync(
        join(PRESS_KIT_DIR, "screenshots", "a_dark_cave_screenshot_01.jpg"),
      ),
    ).toBe(true);
    expect(
      existsSync(
        join(PRESS_KIT_DIR, "video", "a_dark_cave_gameplay_trailer.mp4"),
      ),
    ).toBe(true);
  });
});
