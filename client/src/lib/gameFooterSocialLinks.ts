/**
 * Right-side footer icon links in [`GameFooter`](client/src/components/game/GameFooter.tsx).
 * Order matches the footer; keep crawlable anchors in sync elsewhere (e.g. start screen, SEO fallback).
 */

export type FooterSocialPlatformId =
  | "reddit"
  | "instagram"
  | "incrementalDb"
  | "wiki"
  | "contact";

export const SITE_HOME_URL = "https://a-dark-cave.com/";

/** Official subreddit URL (structured data, footer, start screen). */
export const OFFICIAL_REDDIT_URL =
  "https://www.reddit.com/r/aDarkCave/" as const;

/** Instagram URL for sitelink-style structured data / SEO markup. */
export const OFFICIAL_INSTAGRAM_URL =
  "https://www.instagram.com/a_dark_cave/" as const;

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
  instagram: {
    href: OFFICIAL_INSTAGRAM_URL,
    title: "Instagram",
  },
  incrementalDb: {
    href: "https://www.incrementaldb.com/game/a-dark-cave",
    title: "Incremental DB",
  },
  wiki: {
    href: "https://a-dark-cave.fandom.com/wiki/A_Dark_Cave_Wiki",
    title: "Wiki",
  },
  contact: {
    href: "mailto:support@a-dark-cave.com",
    title: "Contact",
  },
} as const;

/** Stable row order for the game footer icons and start-screen mirrors. */
export const GAME_FOOTER_RIGHT_ICON_ORDER: readonly FooterSocialPlatformId[] = [
  "reddit",
  "instagram",
  "incrementalDb",
  "wiki",
  "contact",
] as const;
