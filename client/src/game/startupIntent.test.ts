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
      paymentReturn: true,
      emailConfirmed: true,
      forceGame: true,
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
    });
  });

  it("keeps an ordinary landing visit on the start screen", () => {
    expect(
      parseStartupIntent({ pathname: "/", search: "", hash: "" }),
    ).toMatchObject({
      paymentReturn: false,
      emailConfirmed: false,
      boost: false,
      forceGame: false,
      openShop: false,
    });
  });
});
