/**
 * Self-hosted Fira Sans (SIL OFL) under `/fonts/`.
 * Latin + latin-ext + cyrillic subsets for UI weights used in the game.
 * unicode-range lets the browser fetch only scripts that appear on screen.
 */

import { publicUrl } from "./publicUrl";

const FIRA_BASE = publicUrl("/fonts");

/** Weights used on the start screen (body + "Recommended by"). */
const FIRA_START_WEIGHTS = [400, 500] as const;

/** Full in-game UI weights (includes start weights). */
const FIRA_GAME_WEIGHTS = [300, 400, 500, 600, 700, 800] as const;

/** Google Fonts / fontsource unicode-range slices for each script file. */
const FIRA_SCRIPT_RANGES: ReadonlyArray<{ script: string; unicodeRange: string }> = [
  {
    script: "cyrillic",
    unicodeRange: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116",
  },
  {
    script: "latin-ext",
    unicodeRange:
      "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF",
  },
  {
    script: "latin",
    unicodeRange:
      "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  },
];

type FiraFontDisplay = "swap" | "optional";

function buildFiraSansFontFaceCss(
  weights: readonly number[],
  fontDisplay: FiraFontDisplay = "swap",
): string {
  const blocks: string[] = [];
  for (const weight of weights) {
    for (const { script, unicodeRange } of FIRA_SCRIPT_RANGES) {
      blocks.push(`@font-face {
  font-family: 'Fira Sans';
  font-style: normal;
  font-weight: ${weight};
  font-display: ${fontDisplay};
  src: url(${FIRA_BASE}/fira-sans-${script}-${weight}-normal.woff2) format('woff2');
  unicode-range: ${unicodeRange};
}`);
    }
  }
  return blocks.join("\n");
}

/** Full face list for share-image inlining (all game weights × scripts). */
export const FIRA_SANS_FONT_FACE_CSS = buildFiraSansFontFaceCss(FIRA_GAME_WEIGHTS);

/** Start-screen faces: `optional` so a late fetch cannot swap glyphs and shove text. */
const FIRA_START_FONT_FACE_CSS = buildFiraSansFontFaceCss(
  FIRA_START_WEIGHTS,
  "optional",
);

const FIRA_STYLE_ID = "fira-sans-font-face";

type FiraMountStage = "start" | "game";

let mountedStage: FiraMountStage | null = null;

/**
 * Mount Fira Sans @font-face CSS.
 * - `start`: only 400/500 (start screen). Browser still downloads only the
 *   script slices needed for on-screen text via unicode-range (~24KB latin-400
 *   for English). Uses `font-display: optional` and applies `.font-loaded`
 *   immediately so a late fetch cannot swap metrics after first paint.
 * - `game`: full weight set for in-game UI (upgrades the start mount). Waits
 *   for the 400 face before applying `.font-loaded` so GameContainer's first
 *   paint already uses Fira.
 */
export function mountFiraSansFontFace(options?: {
  stage?: FiraMountStage;
  applyFontLoadedClass?: boolean;
}): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();

  const stage = options?.stage ?? "game";
  const applyClass = options?.applyFontLoadedClass ?? false;

  const style = document.getElementById(FIRA_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    const el = document.createElement("style");
    el.id = FIRA_STYLE_ID;
    el.textContent =
      stage === "start" ? FIRA_START_FONT_FACE_CSS : FIRA_SANS_FONT_FACE_CSS;
    document.head.appendChild(el);
    mountedStage = stage;
  } else if (mountedStage === "start" && stage === "game") {
    style.textContent = FIRA_SANS_FONT_FACE_CSS;
    mountedStage = "game";
  }

  const markLoaded = () => {
    if (applyClass) {
      document.documentElement.classList.add("font-loaded");
    }
  };

  // Start screen: put Fira in the stack now. `optional` keeps the fallback if
  // the file is still in flight, so body copy does not jump when it arrives.
  if (stage === "start") {
    markLoaded();
    return Promise.resolve();
  }

  if (!("fonts" in document)) {
    markLoaded();
    return Promise.resolve();
  }

  // Kick the fetch for the primary face used on start / body copy.
  // Cap the wait so gameplay init cannot hang if the face never resolves.
  const loaded = document.fonts.load("400 16px 'Fira Sans'").then(
    () => {
      markLoaded();
    },
    () => {
      markLoaded();
    },
  );
  return Promise.race([
    loaded,
    new Promise<void>((resolve) => {
      setTimeout(() => {
        markLoaded();
        resolve();
      }, 800);
    }),
  ]);
}
