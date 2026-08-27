/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NOTO_SANS_SYMBOLS_2_FONT_FACE_CSS,
  NOTO_SYMBOL_COMPAT_CODEPOINTS,
  mountNotoSansSymbols2FontFace,
} from "./notoSansSymbols2FontFace";

describe("Noto symbol compat face", () => {
  afterEach(() => {
    document.getElementById("noto-symbols-font")?.remove();
    document.documentElement.classList.remove("symbols-font-loaded");
  });

  it("covers feast, fog, mining-boost, and achievement-ring glyphs omitted by Symbols 2", () => {
    expect(NOTO_SYMBOL_COMPAT_CODEPOINTS).toEqual(
      expect.arrayContaining([0x27e1, 0x224b, 0x26f0, 0x27c1, 0x29d7]),
    );
  });

  it("registers the compat woff2 ahead of the Symbols 2 slices", () => {
    const css = NOTO_SANS_SYMBOLS_2_FONT_FACE_CSS;
    expect(css.indexOf("Noto Symbol Compat")).toBeGreaterThanOrEqual(0);
    expect(css.indexOf("noto-symbol-compat.woff2")).toBeGreaterThanOrEqual(0);
    expect(css.indexOf("U+27E1")).toBeGreaterThanOrEqual(0);
    expect(css.indexOf("U+27C1")).toBeGreaterThanOrEqual(0);
    expect(css.indexOf("U+29D7")).toBeGreaterThanOrEqual(0);
    expect(css.indexOf("Noto Symbol Compat")).toBeLessThan(
      css.indexOf("Noto Sans Symbols 2"),
    );
    expect(css).toContain("font-display: swap");
    expect(css).toContain("ascent-override: 106.9%");
    expect(css).toContain("descent-override: 63%");
  });

  it("does not prefetch the compat file on mount", () => {
    const load = vi.fn(() => Promise.resolve([]));
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { load },
    });

    mountNotoSansSymbols2FontFace();

    const feast = String.fromCodePoint(0x27e1);
    const loadArgs = load.mock.calls as Array<[string, string?]>;
    expect(loadArgs.some(([, text]) => text?.includes(feast))).toBe(false);
  });
});
