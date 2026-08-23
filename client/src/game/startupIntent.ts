import {
  hasUtmAttribution,
  utmAttributionFromSearchParams,
  type UtmAttribution,
} from "@shared/utmAttribution";
import { parseRefParam } from "@shared/referralCode";

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
   * OAuth alone does not force Game; the player may still be on Make Fire.
   */
  forceGame: boolean;
  openShop: boolean;
  cruelShopHighlight: boolean;
  googleAdsSource: string | null;
  /** First-touch campaign params from the landing URL (UTM + legacy `c`). */
  utmAttribution: UtmAttribution | null;
  /** Valid `?ref=` invite code, if present. */
  referralCode: string | null;
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
  const utmAttribution = utmAttributionFromSearchParams(search);

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
    utmAttribution,
    referralCode: parseRefParam(search.get("ref")),
    hardReloadCacheBust: search.has("_cb"),
  };
}

export function intentHasCampaignParams(intent: StartupIntent): boolean {
  return Boolean(intent.googleAdsSource) || hasUtmAttribution(intent.utmAttribution);
}
