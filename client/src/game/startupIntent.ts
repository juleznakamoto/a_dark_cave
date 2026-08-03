export interface StartupLocation {
  pathname: string;
  search: string;
  hash: string;
}

export interface StartupIntent {
  accessToken: string | null;
  paymentReturn: boolean;
  emailConfirmed: boolean;
  boost: boolean;
  forceGame: boolean;
  openShop: boolean;
  cruelShopHighlight: boolean;
  googleAdsSource: string | null;
}

/** Parse visit intent once so the start page and Game cannot disagree. */
export function parseStartupIntent(location: StartupLocation): StartupIntent {
  const search = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  const boost = location.pathname === "/boost";
  const emailConfirmed = search.get("email_confirmed") === "true";
  const paymentReturn = Boolean(
    search.get("payment_intent") && search.get("redirect_status"),
  );
  const openShop = search.get("openShop") === "true";

  return {
    accessToken: hash.get("access_token") || search.get("access_token"),
    paymentReturn,
    emailConfirmed,
    boost,
    forceGame:
      paymentReturn ||
      boost ||
      search.get("game") === "true" ||
      emailConfirmed,
    openShop,
    cruelShopHighlight:
      openShop && search.get("cruelHighlight") === "true",
    googleAdsSource: search.get("c"),
  };
}
