import { FIRA_SANS_FONT_FACE_CSS } from "./firaSansFontFace";
import { NOTO_SANS_SYMBOLS_2_FONT_FACE_CSS } from "./notoSansSymbols2FontFace";
import { logger } from "./logger";

/**
 * Builds a self-contained `@font-face` CSS string with every font binary inlined
 * as a base64 `data:` URL.
 *
 * `html-to-image` rasterizes the cloned DOM by loading an SVG (with the markup in
 * a `<foreignObject>`) into an `<img>`. In that mode the browser refuses to fetch
 * external resources, so any `@font-face` pointing at a font file URL renders with
 * a fallback face. Passing this inlined CSS as `fontEmbedCSS` guarantees the
 * resource icons and title text use the real game fonts in the exported PNG.
 */

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

/** Strip CSS `url()` quotes so `./fonts/x` and `'./fonts/x'` match the same. */
function unwrapCssUrl(url: string): string {
  return url.trim().replace(/^['"]|['"]$/g, "");
}

/**
 * Same-origin font files, including CrazyGames relative `./fonts/…` / `fonts/…`
 * from `publicUrl("/fonts/…")` when Vite `base` is `./`.
 * `includes("/fonts/")` misses a leading `fonts/` (no slash before the folder).
 */
export function isShareImageFontSrcUrl(url: string): boolean {
  const cleaned = unwrapCssUrl(url);
  if (!cleaned || cleaned.startsWith("data:")) return false;
  return /(?:^|\/)fonts\//.test(cleaned);
}

export function collectShareImageFontSrcUrls(css: string): string[] {
  return [
    ...new Set(
      Array.from(css.matchAll(/url\(([^)]+)\)/g), (match) =>
        unwrapCssUrl(match[1]),
      ).filter(isShareImageFontSrcUrl),
    ),
  ];
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: "cors", cache: "force-cache" });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return `data:font/woff2;base64,${arrayBufferToBase64(buffer)}`;
  } catch (error) {
    logger.warn(`Could not inline font for share image: ${url}`, error);
    return null;
  }
}

async function inlineFontFaceCss(css: string): Promise<string> {
  let next = css;
  const remoteUrls = collectShareImageFontSrcUrls(css);
  const inlined = await Promise.all(
    remoteUrls.map(async (url) => [url, await fetchAsDataUrl(url)] as const),
  );
  for (const [url, dataUrl] of inlined) {
    if (dataUrl) next = next.split(url).join(dataUrl);
  }
  return next;
}

async function buildFontEmbedCss(): Promise<string> {
  const [firaCss, notoCss] = await Promise.all([
    inlineFontFaceCss(FIRA_SANS_FONT_FACE_CSS),
    inlineFontFaceCss(NOTO_SANS_SYMBOLS_2_FONT_FACE_CSS),
  ]);
  return [firaCss, notoCss].join("\n");
}

let cachedFontEmbedCss: Promise<string> | null = null;

/** Inlined `@font-face` CSS for the share image (computed once, then cached). */
export function getShareFontEmbedCss(): Promise<string> {
  if (!cachedFontEmbedCss) {
    cachedFontEmbedCss = buildFontEmbedCss().catch((error) => {
      logger.error("Failed to build share image font CSS", error);
      cachedFontEmbedCss = null;
      return "";
    });
  }
  return cachedFontEmbedCss;
}
