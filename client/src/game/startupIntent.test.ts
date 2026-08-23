import { describe, expect, it } from "vitest";
import { parseStartupIntent } from "./startupIntent";

describe("parseStartupIntent", () => {
  it("recognizes callback and forced-game visits", () => {
    expect(
      parseStartupIntent({
        pathname: "/",
        search:
          "?payment_intent=pi_1&redirect_status=succeeded&email_confirmed=true",
        hash: "#access_token=token-1",
      }),
    ).toMatchObject({
      accessToken: "token-1",
      oauthCallback: true,
      paymentReturn: true,
      emailConfirmed: true,
      forceGame: true,
    });
  });

  it("recognizes OAuth without forcing Game", () => {
    expect(
      parseStartupIntent({
        pathname: "/",
        search: "",
        hash: "#access_token=token-1",
      }),
    ).toMatchObject({
      accessToken: "token-1",
      oauthCallback: true,
      forceGame: false,
    });
  });

  it("recognizes boost, shop, and campaign intent", () => {
    expect(
      parseStartupIntent({
        pathname: "/boost",
        search: "?openShop=true&cruelHighlight=true&c=campaign-1",
        hash: "",
      }),
    ).toMatchObject({
      boost: true,
      forceGame: true,
      openShop: true,
      cruelShopHighlight: true,
      googleAdsSource: "campaign-1",
      utmAttribution: {
        source: "google_ads",
        campaign: "campaign-1",
      },
    });
  });

  it("parses standard UTM params into utmAttribution", () => {
    expect(
      parseStartupIntent({
        pathname: "/",
        search:
          "?utm_source=playlight&utm_medium=discovery&utm_campaign=exit&utm_content=banner",
        hash: "",
      }),
    ).toMatchObject({
      googleAdsSource: null,
      utmAttribution: {
        source: "playlight",
        medium: "discovery",
        campaign: "exit",
        content: "banner",
      },
    });
  });

  it("parses a short invite code from ?ref=", () => {
    expect(
      parseStartupIntent({
        pathname: "/",
        search: "?ref=ab3k9m",
        hash: "",
      }),
    ).toMatchObject({
      referralCode: "AB3K9M",
    });
  });

  it("keeps an ordinary landing visit on the start screen", () => {
    expect(
      parseStartupIntent({ pathname: "/", search: "", hash: "" }),
    ).toMatchObject({
      oauthCallback: false,
      paymentReturn: false,
      emailConfirmed: false,
      boost: false,
      forceGame: false,
      openShop: false,
      hardReloadCacheBust: false,
      utmAttribution: null,
      referralCode: null,
    });
  });
});
