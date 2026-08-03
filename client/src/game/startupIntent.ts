export interface StartupLocation {
  pathname: string;
  search: string;
  hash: string;
}

export interface StartupIntent {
  accessToken: string | null;
  /** True when the URL carries OAuth/PKCE material Supabase must consume. */
  oauthCallback: boolean;
  paymentReturn: boolean;
  emailConfirmed: boolean;
  boost: boolean;
  /**
   * True when this visit should open Game immediately.
   * OAuth alone does not force Game; the player may still be on Light Fire.
   */
  forceGame: boolean;
  openShop: boolean;
  cruelShopHighlight: boolean;
  googleAdsSource: string | null;
  hardReloadCacheBust: boolean;
}

function hasOauthCallbackMaterial(
  search: URLSearchParams,
  hash: URLSearchParams,
): boolean {
  if (hash.get("access_token") || search.get("access_token")) return true;
  if (search.get("code")) return true;
  const type = search.get("type") || hash.get("type");
  return type === "signup" || type === "recovery" || type === "invite";
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
  const accessToken = hash.get("access_token") || search.get("access_token");
  const oauthCallback = hasOauthCallbackMaterial(search, hash);

  return {
    accessToken,
    oauthCallback,
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
    hardReloadCacheBust: search.has("_cb"),
  };
}
