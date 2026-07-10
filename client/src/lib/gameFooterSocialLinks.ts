/**
 * Right-side footer icon links in [`GameFooter`](client/src/components/game/GameFooter.tsx).
 * Order matches the footer; keep crawlable anchors in sync elsewhere (e.g. start screen, SEO fallback).
 */

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

/** Steam store page (footer, start screen, SEO sitelinks). */
export const OFFICIAL_STEAM_URL =
  "https://store.steampowered.com/app/4882240/A_Dark_Cave/" as const;

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
  "reddit",
  "steam",
  "contact",
] as const;
