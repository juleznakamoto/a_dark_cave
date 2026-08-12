import { describe, expect, it } from "vitest";
import { SITE_ORIGIN } from "@shared/publicSeo";
import {
  OFFICIAL_STEAM_URL,
  OFFICIAL_STEAM_WIDGET_URL,
  STEAM_STORE_UTM_CONTENT,
  X_GAME_UTM_CONTENT,
  steamStoreUrl,
  steamWidgetUrl,
  xGameLandingUrl,
} from "./gameFooterSocialLinks";

describe("steamStoreUrl", () => {
  it("keeps the canonical store path and adds readable UTM params", () => {
    const href = steamStoreUrl(STEAM_STORE_UTM_CONTENT.gameFooter);
    const url = new URL(href);

    expect(href.startsWith(OFFICIAL_STEAM_URL)).toBe(true);
    expect(url.searchParams.get("utm_source")).toBe("a_dark_cave");
    expect(url.searchParams.get("utm_medium")).toBe("web_game");
    expect(url.searchParams.get("utm_campaign")).toBe("steam_store");
    expect(url.searchParams.get("utm_content")).toBe("game_footer");
  });

  it("uses a distinct utm_content per placement", () => {
    const contents = Object.values(STEAM_STORE_UTM_CONTENT).map(
      (content) => new URL(steamStoreUrl(content)).searchParams.get("utm_content"),
    );
    expect(new Set(contents).size).toBe(contents.length);
  });
});

describe("steamWidgetUrl", () => {
  it("keeps the widget path and mirrors steamStoreUrl UTM params", () => {
    const href = steamWidgetUrl(STEAM_STORE_UTM_CONTENT.endScreenWishlist);
    const url = new URL(href);

    expect(href.startsWith(OFFICIAL_STEAM_WIDGET_URL)).toBe(true);
    expect(url.searchParams.get("utm_source")).toBe("a_dark_cave");
    expect(url.searchParams.get("utm_medium")).toBe("web_game");
    expect(url.searchParams.get("utm_campaign")).toBe("steam_store");
    expect(url.searchParams.get("utm_content")).toBe("end_screen_wishlist");
  });
});

describe("xGameLandingUrl", () => {
  it("builds a game landing URL with X UTM params", () => {
    const href = xGameLandingUrl();
    const url = new URL(href);

    expect(url.origin).toBe(SITE_ORIGIN);
    expect(url.pathname).toBe("/");
    expect(url.searchParams.get("utm_source")).toBe("x");
    expect(url.searchParams.get("utm_medium")).toBe("social");
    expect(url.searchParams.get("utm_campaign")).toBe("game");
    expect(url.searchParams.get("utm_content")).toBe(X_GAME_UTM_CONTENT.post);
  });
});
