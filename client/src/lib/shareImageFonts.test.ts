import { describe, expect, it } from "vitest";
import {
  collectShareImageFontSrcUrls,
  isShareImageFontSrcUrl,
} from "./shareImageFonts";
import { NOTO_SANS_SYMBOLS_2_FONT_FACE_CSS } from "./notoSansSymbols2FontFace";

describe("share image font URL matching", () => {
  it("accepts root-absolute /fonts/ paths", () => {
    expect(isShareImageFontSrcUrl("/fonts/noto-symbol-compat.woff2")).toBe(
      true,
    );
  });

  it("accepts CrazyGames relative ./fonts/ from publicUrl + base ./", () => {
    expect(
      isShareImageFontSrcUrl("./fonts/noto-symbol-compat.woff2"),
    ).toBe(true);
  });

  it("accepts fonts/ with no slash before the folder", () => {
    expect(isShareImageFontSrcUrl("fonts/noto-symbol-compat.woff2")).toBe(
      true,
    );
  });

  it("accepts quoted CrazyGames urls from url('…')", () => {
    expect(
      isShareImageFontSrcUrl("'./fonts/noto-symbol-compat.woff2'"),
    ).toBe(true);
  });

  it("rejects non-font css urls", () => {
    expect(isShareImageFontSrcUrl("/icons/coin.svg")).toBe(false);
    expect(isShareImageFontSrcUrl("data:font/woff2;base64,AA==")).toBe(false);
  });

  it("collects the compat face from generated Noto css", () => {
    const urls = collectShareImageFontSrcUrls(NOTO_SANS_SYMBOLS_2_FONT_FACE_CSS);
    expect(urls.some((url) => url.includes("noto-symbol-compat.woff2"))).toBe(
      true,
    );
  });

  it("collects compat from CrazyGames-shaped css", () => {
    const css = `@font-face { src: url(./fonts/noto-symbol-compat.woff2) format('woff2'); }`;
    expect(collectShareImageFontSrcUrls(css)).toEqual([
      "./fonts/noto-symbol-compat.woff2",
    ]);
  });
});
