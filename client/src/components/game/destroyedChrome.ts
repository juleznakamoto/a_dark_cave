import {
  createContext,
  createElement,
  useContext,
  type CSSProperties,
  type ReactNode,
} from "react";

/**
 * Destroyed hairline chrome (header, footer, columns, outline action buttons,
 * tooltips, dialog frames, queue/preset slots).
 * Flip to `false` to restore solid 1px `border-border` / orange outlines.
 */
export const DESTROYED_CHROME_ENABLED = true;

const DestroyedChromeAllowedContext = createContext(true);

/** Wrap shop, auth, leaderboard, and other out-of-game UI so madness chrome stays off. */
export function DestroyedChromeScope({
  allow,
  children,
}: {
  allow: boolean;
  children: ReactNode;
}) {
  return createElement(
    DestroyedChromeAllowedContext.Provider,
    { value: allow },
    children,
  );
}

/** Master switch plus the current subtree (in-game vs meta UI). */
export function useDestroyedChrome(): boolean {
  return DESTROYED_CHROME_ENABLED && useContext(DestroyedChromeAllowedContext);
}

const CHROME_TILE_PX = 720;
const CHROME_MAIN_TILE_PX = 3840;

function destroyedEdge(edge: "top" | "bottom" | "left" | "right"): string {
  if (!DESTROYED_CHROME_ENABLED) {
    return {
      top: "border-t border-border",
      bottom: "border-b border-border",
      left: "border-l border-border",
      right: "border-r border-border",
    }[edge];
  }
  return `game-chrome-rule game-chrome-rule--${edge}`;
}

/** Destroyed 1px chrome rules. Mask tiles live in `assets/chrome/` via `.game-chrome-rule`. */
export const GAME_CHROME_RULE_BOTTOM = destroyedEdge("bottom");
export const GAME_CHROME_RULE_TOP = destroyedEdge("top");
export const GAME_CHROME_RULE_LEFT = destroyedEdge("left");
export const GAME_CHROME_RULE_RIGHT = destroyedEdge("right");
/** Side panel: top seam on mobile, right seam on desktop. */
export const GAME_CHROME_RULE_SIDE_PANEL = DESTROYED_CHROME_ENABLED
  ? "game-chrome-rule game-chrome-rule--top md:game-chrome-rule--right"
  : "border-t border-border md:border-t-0 md:border-r md:border-border";
/** Event log: left seam on desktop only. */
export const GAME_CHROME_RULE_LOG = DESTROYED_CHROME_ENABLED
  ? "game-chrome-rule md:game-chrome-rule--left"
  : "md:border-l md:border-border";
/** Location tabs: top seam on mobile only. */
export const GAME_CHROME_RULE_TABS_NAV = DESTROYED_CHROME_ENABLED
  ? "game-chrome-rule game-chrome-rule--top md:game-chrome-rule--none"
  : "border-t border-border md:border-t-0";

/** Four-sided destroyed outline for action buttons. Empty when the switch is off. */
export function gameChromeBoxClassName(): string {
  return DESTROYED_CHROME_ENABLED
    ? "game-chrome-rule game-chrome-rule--box overflow-visible border border-transparent"
    : "";
}

/** Four-sided destroyed outline for tooltip frames. Neutral-800 hairline. */
export function gameChromeTooltipClassName(): string {
  return DESTROYED_CHROME_ENABLED
    ? `${gameChromeBoxClassName()} game-chrome-rule--tooltip border-transparent`
    : "";
}

/** Four-sided destroyed outline for dialog frames. `--border` hairline. */
export function gameChromeDialogClassName(): string {
  return DESTROYED_CHROME_ENABLED
    ? `${gameChromeBoxClassName()} game-chrome-rule--dialog`
    : "";
}

/** Cracked hairline color. Set this on the control; do not map Tailwind `border-*` in CSS. */
export function chromeRuleColorStyle(color: string): CSSProperties {
  return { "--adc-chrome-rule-color": color } as CSSProperties;
}

/**
 * Tiny 18–20px squares (−/+, queue, presets): cropped tiles, less push-out,
 * busy-stretch sampling. Color stays on the control (orange vs slot gray).
 */
export function gameChromeTinyClassName(): string {
  return DESTROYED_CHROME_ENABLED ? "game-chrome-rule--compact" : "";
}

/** Four-sided destroyed outline for queue / preset slot marks. Neutral gray. */
export function gameChromeSlotClassName(): string {
  return DESTROYED_CHROME_ENABLED
    ? `${gameChromeBoxClassName()} ${gameChromeTinyClassName()} game-chrome-rule--slot border border-transparent`
    : "";
}

function hashChromeSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const CHROME_CORNERS = ["tl", "tr", "bl", "br"] as const;
/** bit0=tl, bit1=tr, bit2=bl, bit3=br. 1 = arc present. */
const CHROME_CORNER_BITS = { tl: 1, tr: 2, bl: 4, br: 8 } as const;

/**
 * How many box-corner arcs may be missing at each destroyed stage:
 * Light 0, Medium 0-1, Intense 0-2, Extreme 0-3. Tiny −/+/slot/preset
 * squares cap Extreme at 0-2 so at least two corners stay drawn.
 * Counts only rise with stage so a corner does not come back after it
 * has dropped.
 */
function destroyedChromeCornerVars(
  seedHash: number,
  options?: { small?: boolean },
): Record<string, string> {
  const order = [...CHROME_CORNERS];
  let mix = seedHash;
  for (let i = order.length - 1; i > 0; i--) {
    mix = Math.imul(mix ^ 0x9e3779b9, 2654435761) >>> 0;
    const j = mix % (i + 1);
    const swap = order[i];
    order[i] = order[j];
    order[j] = swap;
  }
  mix = Math.imul(mix ^ 0xc2b2ae35, 0x27d4eb2f) >>> 0;
  const k2 = mix % 2;
  mix = Math.imul(mix, 0x165667b1) >>> 0;
  const k3 = k2 + (mix % (3 - k2));
  mix = Math.imul(mix, 0x85ebca77) >>> 0;
  // Exclusive upper bound for Extreme missing count (4 → 0-3, tiny 3 → 0-2).
  const extremeCap = options?.small ? 3 : 4;
  const k4 = k3 + (mix % (extremeCap - k3));
  const missingAt = [0, k2, k3, k4] as const;
  const vars: Record<string, string> = {};
  for (let stage = 1; stage <= 4; stage++) {
    const hide = missingAt[stage - 1];
    let mask = 0;
    for (let i = 0; i < order.length; i++) {
      if (i >= hide) mask |= CHROME_CORNER_BITS[order[i]];
    }
    vars[`--adc-chrome-c-${stage}`] = String(mask);
  }
  return vars;
}

/**
 * Busy stretches in the compact 720px seam tiles. 18–20px controls only see a
 * tiny window, so they sample these instead of a random solid hairline.
 */
const CHROME_SMALL_PHASES = [
  28, 100, 134, 208, 232, 286, 321, 426, 513, 584, 690,
] as const;

/** Mask phases for tiny −/+, queue, and preset squares. */
export function destroyedChromeTinyMaskStyle(
  seed?: string,
): Record<string, string> {
  return destroyedChromeMaskStyle(seed, { small: true });
}

/** Per-control mask phase so identical buttons do not share the same chips. */
export function destroyedChromeMaskStyle(
  seed?: string,
  options?: { small?: boolean },
): Record<string, string> {
  if (!DESTROYED_CHROME_ENABLED) return {};
  const n = hashChromeSeed(seed ?? "");
  const tile = options?.small ? CHROME_TILE_PX : CHROME_MAIN_TILE_PX;
  const pos = (value: number) => `${((value % tile) + tile) % tile}px`;
  if (options?.small) {
    const pick = (lane: number) => {
      const mixed =
        Math.imul(n ^ Math.imul(lane + 1, 0x9e3779b9), 2654435761) >>> 0;
      const idx = mixed % CHROME_SMALL_PHASES.length;
      const jitter = (mixed % 13) - 6;
      return pos(CHROME_SMALL_PHASES[idx] + jitter);
    };
    return {
      "--adc-chrome-mask-x": pick(0),
      "--adc-chrome-mask-x2": pick(1),
      "--adc-chrome-mask-y": pick(2),
      "--adc-chrome-mask-y2": pick(3),
      ...destroyedChromeCornerVars(n, options),
    };
  }
  return {
    "--adc-chrome-mask-x": pos(n),
    "--adc-chrome-mask-x2": pos(Math.imul(n, 3) + 187),
    "--adc-chrome-mask-y": pos(Math.imul(n, 5) + 311),
    "--adc-chrome-mask-y2": pos(Math.imul(n, 7) + 503),
    ...destroyedChromeCornerVars(n, options),
  };
}
