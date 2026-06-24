import { NOTO_SANS_SYMBOLS_2_FONT_FACE_CSS } from "./notoSansSymbols2FontFace";
import { logger } from "./logger";

/**
 * Builds a self-contained `@font-face` CSS string with every font binary inlined
 * as a base64 `data:` URL.
 *
 * `html-to-image` rasterizes the cloned DOM by loading an SVG (with the markup in
 * a `<foreignObject>`) into an `<img>`. In that mode the browser refuses to fetch
 * external resources, so any `@font-face` pointing at a remote/URL `src` (Inter on
 * our own origin, Noto Sans Symbols 2 on fonts.gstatic.com) renders with a fallback
 * face. Passing this inlined CSS as `fontEmbedCSS` guarantees the resource icons and
 * title text use the real game fonts in the exported PNG.
 */

const INTER_FONT_URL = "/fonts/inter.woff2";

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

async function buildFontEmbedCss(): Promise<string> {
  const parts: string[] = [];

  const interDataUrl = await fetchAsDataUrl(INTER_FONT_URL);
  if (interDataUrl) {
    parts.push(
      `@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:swap;src:url(${interDataUrl}) format('woff2');}`,
    );
  }

  // Replace each Noto woff2 URL in the shared CSS with an inlined data URL,
  // keeping the original unicode-range slicing intact.
  let notoCss = NOTO_SANS_SYMBOLS_2_FONT_FACE_CSS;
  const remoteUrls = Array.from(
    new Set(
      Array.from(
        notoCss.matchAll(/url\(([^)]+)\)/g),
      )
        .map((match) => match[1])
        .filter((url) => url.startsWith("http") || url.startsWith("/fonts/")),
    ),
  );
  const inlined = await Promise.all(
    remoteUrls.map(async (url) => [url, await fetchAsDataUrl(url)] as const),
  );
  for (const [url, dataUrl] of inlined) {
    if (dataUrl) notoCss = notoCss.split(url).join(dataUrl);
  }
  parts.push(notoCss);

  return parts.join("\n");
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
