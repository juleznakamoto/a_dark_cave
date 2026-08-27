/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NOTO_SANS_SYMBOLS_2_FONT_FACE_CSS,
  NOTO_SYMBOL_COMPAT_CODEPOINTS,
  excludeCodepointsFromUnicodeRange,
  mountNotoSansSymbols2FontFace,
} from "./notoSansSymbols2FontFace";

describe("Noto symbol compat face", () => {
  afterEach(() => {
    document.getElementById("noto-symbols-font")?.remove();
    document.documentElement.classList.remove("symbols-font-loaded");
  });

  it("covers feast, fog, and mining-boost glyphs omitted by Symbols 2", () => {
    expect(NOTO_SYMBOL_COMPAT_CODEPOINTS).toEqual(
      expect.arrayContaining([0x27e1, 0x224b, 0x26f0]),
    );
  });

  it("punches claimed-but-missing glyphs out of Symbols 2 ranges", () => {
    expect(
      excludeCodepointsFromUnicodeRange(
        "U+27C0-27FF, U+2193, U+2000-206F",
        new Set([0x27e1, 0x2193, 0x2058, 0x2059]),
      ),
    ).toBe("U+27C0-27E0, U+27E2-27FF, U+2000-2057, U+205A-206F");
  });

  it("registers the compat woff2 and leaves feast only on that face", () => {
    const css = NOTO_SANS_SYMBOLS_2_FONT_FACE_CSS;
    const compatIdx = css.indexOf("Noto Symbol Compat");
    const symbolsIdx = css.indexOf("Noto Sans Symbols 2");
    expect(compatIdx).toBeGreaterThanOrEqual(0);
    expect(css.indexOf("noto-symbol-compat.woff2")).toBeGreaterThanOrEqual(0);
    expect(compatIdx).toBeLessThan(symbolsIdx);
    expect(css.slice(compatIdx, symbolsIdx)).toContain("U+27E1");
    expect(css.slice(symbolsIdx)).not.toContain("U+27E1");
    expect(css.slice(symbolsIdx)).not.toContain("U+27C0-27FF");
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
