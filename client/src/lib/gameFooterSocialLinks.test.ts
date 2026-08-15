import { describe, expect, it } from "vitest";
import { SITE_ORIGIN } from "@shared/publicSeo";
import {
  OFFICIAL_STEAM_URL,
  OFFICIAL_STEAM_WIDGET_URL,
  STEAM_STORE_UTM_CONTENT,
  UTM_CAMPAIGN_LINKS,
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

describe("UTM_CAMPAIGN_LINKS", () => {
  it("lists unique ids and urls", () => {
    const ids = UTM_CAMPAIGN_LINKS.map((link) => link.id);
    const urls = UTM_CAMPAIGN_LINKS.map((link) => link.url);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("keeps inbound links on the game origin with full UTM params", () => {
    const inbound = UTM_CAMPAIGN_LINKS.filter((link) => link.group === "inbound");
    expect(inbound.length).toBeGreaterThan(0);
    for (const link of inbound) {
      const url = new URL(link.url);
      expect(url.origin).toBe(SITE_ORIGIN);
      expect(url.searchParams.get("utm_source")).toBeTruthy();
      expect(url.searchParams.get("utm_medium")).toBeTruthy();
      expect(url.searchParams.get("utm_campaign")).toBeTruthy();
      expect(url.searchParams.get("utm_content")).toBeTruthy();
    }
  });

  it("includes the X landing URL and every Steam store placement", () => {
    const urls = new Set(UTM_CAMPAIGN_LINKS.map((link) => link.url));
    expect(urls.has(xGameLandingUrl())).toBe(true);
    for (const content of Object.values(STEAM_STORE_UTM_CONTENT)) {
      expect(urls.has(steamStoreUrl(content))).toBe(true);
    }
  });
});
