/**
 * Right-side footer icon links in [`GameFooter`](client/src/components/game/GameFooter.tsx).
 * Order matches the footer; keep crawlable anchors in sync elsewhere (e.g. start screen, SEO fallback).
 */

import { SITE_ORIGIN } from "@shared/publicSeo";

export type FooterSocialPlatformId =
  | "reddit"
  | "instagram"
  | "youtube"
  | "steam"
  | "itch"
  | "contact";

/** Official subreddit URL (structured data, footer, start screen). */
export const OFFICIAL_REDDIT_URL =
  "https://www.reddit.com/r/aDarkCave/" as const;

/** Official Instagram URL (footer, start screen, social rewards). */
export const OFFICIAL_INSTAGRAM_URL =
  "https://www.instagram.com/a_dark_cave/" as const;

/** Official YouTube channel URL. */
export const OFFICIAL_YOUTUBE_URL =
  "https://www.youtube.com/channel/UCdQDWTJe_Bno7xyjnO1aC-w" as const;

/** Canonical Steam store page (no tracking params; use {@link steamStoreUrl} for clicks). */
export const OFFICIAL_STEAM_URL =
  "https://store.steampowered.com/app/4882240/A_Dark_Cave/" as const;

/** Official Steam store embed widget (no tracking params; use {@link steamWidgetUrl}). */
export const OFFICIAL_STEAM_WIDGET_URL =
  "https://store.steampowered.com/widget/4882240/" as const;

/** Official itch.io page (same URL as `ITCH_URL` in `shared/publicPages.ts`). */
export const OFFICIAL_ITCH_URL =
  "https://a-dark-cave.itch.io/a-dark-cave" as const;

/**
 * Readable `utm_content` values for in-game Steam store links.
 * Steam / analytics show these verbatim — pick the key that matches the button.
 */
export const STEAM_STORE_UTM_CONTENT = {
  /** In-game footer Steam icon (+ wishlist callout). */
  gameFooter: "game_footer",
  /** CrazyGames in-game header menu Steam item. */
  profileMenu: "profile_menu",
  /** Start-screen footer Steam icon. */
  startScreenFooter: "start_screen_footer",
  /** CrazyGames start-screen header menu Steam item. */
  startScreenMenu: "start_screen_menu",
  /** End-screen Steam wishlist widget / CTA. */
  endScreenWishlist: "end_screen_wishlist",
  /** Demo time-up dialog wishlist button (Galaxy / Steam demo). */
  demoTimeUp: "demo_time_up",
  /** Crawlable noscript fallback link in `index.html`. */
  htmlNoscriptFooter: "html_noscript_footer",
} as const;

export type SteamStoreUtmContent =
  (typeof STEAM_STORE_UTM_CONTENT)[keyof typeof STEAM_STORE_UTM_CONTENT];

function applySteamStoreUtm(
  url: URL,
  utmContent: SteamStoreUtmContent,
): string {
  url.searchParams.set("utm_source", "a_dark_cave");
  url.searchParams.set("utm_medium", "web_game");
  url.searchParams.set("utm_campaign", "steam_store");
  url.searchParams.set("utm_content", utmContent);
  return url.toString();
}

/**
 * Steam store URL with UTM so each button/source is identifiable:
 * `utm_source=a_dark_cave`, `utm_medium=web_game`, `utm_campaign=steam_store`,
 * `utm_content=<button id>`.
 */
export function steamStoreUrl(utmContent: SteamStoreUtmContent): string {
  return applySteamStoreUtm(new URL(OFFICIAL_STEAM_URL), utmContent);
}

/**
 * Steam store widget iframe `src` with the same UTM scheme as {@link steamStoreUrl}.
 */
export function steamWidgetUrl(utmContent: SteamStoreUtmContent): string {
  return applySteamStoreUtm(new URL(OFFICIAL_STEAM_WIDGET_URL), utmContent);
}

export type GameLandingUtmParams = {
  source: string;
  medium: string;
  campaign: string;
  content: string;
};

/** Game homepage with UTM params (inbound landings tracked on the Traffic tab). */
export function gameLandingUrl(params: GameLandingUtmParams): string {
  const url = new URL(SITE_ORIGIN + "/");
  url.searchParams.set("utm_source", params.source);
  url.searchParams.set("utm_medium", params.medium);
  url.searchParams.set("utm_campaign", params.campaign);
  url.searchParams.set("utm_content", params.content);
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
  return gameLandingUrl({
    source: "x",
    medium: "social",
    campaign: "game",
    content: utmContent,
  });
}

export type UtmCampaignLinkGroup = "inbound" | "steam_store";

export type UtmCampaignLink = {
  id: string;
  label: string;
  description: string;
  group: UtmCampaignLinkGroup;
  url: string;
};

/**
 * Canonical UTM URLs for posting and in-game Steam CTAs.
 * Traffic tab lists these for one-click copy.
 */
export const UTM_CAMPAIGN_LINKS: readonly UtmCampaignLink[] = [
  {
    id: "x-post",
    label: "X / Twitter",
    description: "Posts and replies",
    group: "inbound",
    url: xGameLandingUrl(),
  },
  {
    id: "reddit-post",
    label: "Reddit",
    description: "Posts and comments",
    group: "inbound",
    url: gameLandingUrl({
      source: "reddit",
      medium: "social",
      campaign: "game",
      content: "post",
    }),
  },
  {
    id: "instagram-bio",
    label: "Instagram",
    description: "Bio and stories",
    group: "inbound",
    url: gameLandingUrl({
      source: "instagram",
      medium: "social",
      campaign: "game",
      content: "bio",
    }),
  },
  {
    id: "youtube-description",
    label: "YouTube",
    description: "Video and channel description",
    group: "inbound",
    url: gameLandingUrl({
      source: "youtube",
      medium: "social",
      campaign: "game",
      content: "description",
    }),
  },
  {
    id: "email-newsletter",
    label: "Email",
    description: "Newsletter and marketing mail",
    group: "inbound",
    url: gameLandingUrl({
      source: "email",
      medium: "email",
      campaign: "newsletter",
      content: "link",
    }),
  },
  {
    id: "steam-store-description",
    label: "Steam (to web game)",
    description: "Store page or community linking here",
    group: "inbound",
    url: gameLandingUrl({
      source: "steam",
      medium: "store",
      campaign: "game",
      content: "description",
    }),
  },
  {
    id: "playlight-exit",
    label: "Playlight",
    description: "Discovery / exit-intent landing",
    group: "inbound",
    url: gameLandingUrl({
      source: "playlight",
      medium: "discovery",
      campaign: "exit",
      content: "banner",
    }),
  },
  {
    id: "steam-store-game-footer",
    label: "Steam store · game footer",
    description: "In-game footer Steam icon",
    group: "steam_store",
    url: steamStoreUrl(STEAM_STORE_UTM_CONTENT.gameFooter),
  },
  {
    id: "steam-store-profile-menu",
    label: "Steam store · profile menu",
    description: "CrazyGames header menu Steam item",
    group: "steam_store",
    url: steamStoreUrl(STEAM_STORE_UTM_CONTENT.profileMenu),
  },
  {
    id: "steam-store-start-screen",
    label: "Steam store · start screen",
    description: "Start-screen footer Steam icon",
    group: "steam_store",
    url: steamStoreUrl(STEAM_STORE_UTM_CONTENT.startScreenFooter),
  },
  {
    id: "steam-store-start-screen-menu",
    label: "Steam store · start screen menu",
    description: "CrazyGames start-screen header menu Steam item",
    group: "steam_store",
    url: steamStoreUrl(STEAM_STORE_UTM_CONTENT.startScreenMenu),
  },
  {
    id: "steam-store-end-screen",
    label: "Steam store · end screen",
    description: "End-screen wishlist widget / CTA",
    group: "steam_store",
    url: steamStoreUrl(STEAM_STORE_UTM_CONTENT.endScreenWishlist),
  },
  {
    id: "steam-store-demo-time-up",
    label: "Steam store · demo time up",
    description: "Galaxy / Steam demo time-up dialog",
    group: "steam_store",
    url: steamStoreUrl(STEAM_STORE_UTM_CONTENT.demoTimeUp),
  },
  {
    id: "steam-store-html-noscript",
    label: "Steam store · HTML fallback",
    description: "Noscript footer in index.html",
    group: "steam_store",
    url: steamStoreUrl(STEAM_STORE_UTM_CONTENT.htmlNoscriptFooter),
  },
] as const;

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
  youtube: {
    href: OFFICIAL_YOUTUBE_URL,
    title: "YouTube",
  },
  steam: {
    // Bare canonical URL; click sites must use steamStoreUrl(...) for tracking.
    href: OFFICIAL_STEAM_URL,
    title: "Steam",
  },
  itch: {
    href: OFFICIAL_ITCH_URL,
    title: "itch.io",
  },
  contact: {
    href: "mailto:support@a-dark-cave.com",
    title: "Email",
  },
} as const;

/** Links shown in the footer Social dropdown (not inline icons). */
export const NETWORK_MENU_PLATFORM_ORDER: readonly Exclude<
  FooterSocialPlatformId,
  "steam"
>[] = ["reddit", "instagram", "youtube", "itch", "contact"] as const;

/** Stable row order for the game footer icons and start-screen mirrors. */
export const GAME_FOOTER_RIGHT_ICON_ORDER: readonly FooterSocialPlatformId[] = [
  "steam",
] as const;
