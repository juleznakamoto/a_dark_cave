/**
 * Right-side footer icon links in [`GameFooter`](client/src/components/game/GameFooter.tsx).
 * Order matches the footer; keep crawlable anchors in sync elsewhere (e.g. start screen, SEO fallback).
 */

import { SITE_ORIGIN } from "@shared/publicSeo";

export type FooterSocialPlatformId =
  | "reddit"
  | "steam"
  | "contact";

/** Official subreddit URL (structured data, footer, start screen). */
export const OFFICIAL_REDDIT_URL =
  "https://www.reddit.com/r/aDarkCave/" as const;

/** Instagram URL (social rewards / legacy links — not in game footer). */
export const OFFICIAL_INSTAGRAM_URL =
  "https://www.instagram.com/a_dark_cave/" as const;

/** Canonical Steam store page (no tracking params; use {@link steamStoreUrl} for clicks). */
export const OFFICIAL_STEAM_URL =
  "https://store.steampowered.com/app/4882240/A_Dark_Cave/" as const;

/**
 * Readable `utm_content` values for in-game Steam store links.
 * Steam / analytics show these verbatim — pick the key that matches the button.
 */
export const STEAM_STORE_UTM_CONTENT = {
  /** In-game footer Steam icon (+ wishlist callout). */
  gameFooter: "game_footer",
  /** Start-screen footer Steam icon. */
  startScreenFooter: "start_screen_footer",
  /** End-screen "Wishlist on Steam" CTA. */
  endScreenWishlist: "end_screen_wishlist",
  /** Demo time-up dialog wishlist button (Galaxy / Steam demo). */
  demoTimeUp: "demo_time_up",
  /** Crawlable noscript fallback link in `index.html`. */
  htmlNoscriptFooter: "html_noscript_footer",
} as const;

export type SteamStoreUtmContent =
  (typeof STEAM_STORE_UTM_CONTENT)[keyof typeof STEAM_STORE_UTM_CONTENT];

/**
 * Steam store URL with UTM so each button/source is identifiable:
 * `utm_source=a_dark_cave`, `utm_medium=web_game`, `utm_campaign=steam_store`,
 * `utm_content=<button id>`.
 */
export function steamStoreUrl(utmContent: SteamStoreUtmContent): string {
  const url = new URL(OFFICIAL_STEAM_URL);
  url.searchParams.set("utm_source", "a_dark_cave");
  url.searchParams.set("utm_medium", "web_game");
  url.searchParams.set("utm_campaign", "steam_store");
  url.searchParams.set("utm_content", utmContent);
  return url.toString();
}

/**
 * Readable `utm_content` for X (Twitter) posts that link to the game.
 */
export const X_GAME_UTM_CONTENT = {
  /** Default organic / promo post linking to the game. */
  post: "post",
} as const;

export type XGameUtmContent =
  (typeof X_GAME_UTM_CONTENT)[keyof typeof X_GAME_UTM_CONTENT];

/**
 * Game landing URL for X posts:
 * `utm_source=x`, `utm_medium=social`, `utm_campaign=game`,
 * `utm_content=<post id>`.
 */
export function xGameLandingUrl(
  utmContent: XGameUtmContent = X_GAME_UTM_CONTENT.post,
): string {
  const url = new URL(SITE_ORIGIN + "/");
  url.searchParams.set("utm_source", "x");
  url.searchParams.set("utm_medium", "social");
  url.searchParams.set("utm_campaign", "game");
  url.searchParams.set("utm_content", utmContent);
  return url.toString();
}

export const GAME_FOOTER_RIGHT_ICON_LINKS: Readonly<
  Record<
    FooterSocialPlatformId,
    Readonly<{ href: string; title: string }>
  >
> = {
  reddit: {
    href: OFFICIAL_REDDIT_URL,
    title: "Reddit",
  },
  steam: {
    // Bare canonical URL; click sites must use steamStoreUrl(...) for tracking.
    href: OFFICIAL_STEAM_URL,
    title: "Steam",
  },
  contact: {
    href: "mailto:support@a-dark-cave.com",
    title: "Contact",
  },
} as const;

/** Stable row order for the game footer icons and start-screen mirrors. */
export const GAME_FOOTER_RIGHT_ICON_ORDER: readonly FooterSocialPlatformId[] = [
  "steam",
  "reddit",
  "contact",
] as const;
