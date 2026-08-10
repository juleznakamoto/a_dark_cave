import { describe, expect, it } from "vitest";
import {
  OFFICIAL_STEAM_URL,
  STEAM_STORE_UTM_CONTENT,
  steamStoreUrl,
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
