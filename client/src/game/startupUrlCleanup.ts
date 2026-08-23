import { HARD_RELOAD_CACHE_BUST_PARAM } from "@/lib/hardReload";
import { isLocalOnlyEdition } from "@/lib/edition";
import { logger } from "@/lib/logger";
import {
  intentHasCampaignParams,
  parseStartupIntent,
  type StartupIntent,
  type StartupLocation,
} from "./startupIntent";
import { persistLandingReferralCode } from "./referralLanding";

export type StartupUrlCleanupScope =
  | "auth-callback"
  | "campaign"
  | "email-confirmed"
  | "stripe-return"
  | "boost-path"
  | "hard-reload-bust"
  | "shop"
  | "referral";

export interface StartupUrlCleanupPlan {
  /** True when URL carries OAuth/PKCE material Supabase must read first. */
  needsAuthConsumption: boolean;
  scopes: StartupUrlCleanupScope[];
}

export function planStartupUrlCleanup(
  location: StartupLocation,
  intent: StartupIntent = parseStartupIntent(location),
): StartupUrlCleanupPlan {
  const scopes: StartupUrlCleanupScope[] = [];
  if (intent.oauthCallback) scopes.push("auth-callback");
  if (intent.emailConfirmed) scopes.push("email-confirmed");
  if (
    intentHasCampaignParams(intent) ||
    new URLSearchParams(location.search).has("src")
  ) {
    scopes.push("campaign");
  }
  if (intent.openShop || intent.cruelShopHighlight) scopes.push("shop");
  if (intent.paymentReturn) scopes.push("stripe-return");
  if (intent.boost) scopes.push("boost-path");
  if (intent.hardReloadCacheBust) scopes.push("hard-reload-bust");
  if (intent.referralCode) scopes.push("referral");

  return {
    needsAuthConsumption: intent.oauthCallback,
    scopes,
  };
}

/**
 * Initialize Supabase so detectSessionInUrl can consume OAuth/PKCE material.
 * Must run before any auth-related URL cleanup.
 */
export async function consumeStartupAuthCallback(
  location: StartupLocation = window.location,
): Promise<void> {
  const intent = parseStartupIntent(location);
  if (!intent.oauthCallback || isLocalOnlyEdition()) return;

  try {
    const { getSupabaseClient } = await import("@/lib/supabase");
    const supabase = await getSupabaseClient();
    await supabase.auth.getSession();
  } catch (error) {
    logger.error("[STARTUP] Failed to consume auth callback:", error);
  }
}

function buildCleanedUrl(
  location: StartupLocation,
  scopes: StartupUrlCleanupScope[],
): string | null {
  if (scopes.length === 0) return null;

  if (scopes.includes("boost-path") && location.pathname === "/boost") {
    // Boost cleanup replaces the whole path; still preserve unrelated query if any remain.
    const search = new URLSearchParams(location.search);
    stripSearchParams(search, scopes);
    const qs = search.toString();
    return "/" + (qs ? `?${qs}` : "");
  }

  const search = new URLSearchParams(location.search);
  let hash = location.hash;
  const before = `${location.pathname}${location.search}${location.hash}`;

  stripSearchParams(search, scopes);

  if (scopes.includes("auth-callback")) {
    // OAuth tokens live in the hash fragment for implicit/legacy flows.
    hash = "";
  }

  const qs = search.toString();
  const next =
    location.pathname + (qs ? `?${qs}` : "") + (hash.startsWith("#") ? hash : hash ? `#${hash}` : "");
  return next === before ? null : next;
}

function stripSearchParams(
  search: URLSearchParams,
  scopes: StartupUrlCleanupScope[],
): void {
  if (scopes.includes("auth-callback")) {
    search.delete("access_token");
    search.delete("refresh_token");
    search.delete("expires_in");
    search.delete("token_type");
    search.delete("code");
    search.delete("type");
  }
  if (scopes.includes("email-confirmed")) {
    search.delete("email_confirmed");
  }
  if (scopes.includes("campaign")) {
    search.delete("c");
    search.delete("src");
    search.delete("utm_source");
    search.delete("utm_medium");
    search.delete("utm_campaign");
    search.delete("utm_content");
    search.delete("utm_term");
  }
  if (scopes.includes("shop")) {
    search.delete("openShop");
    search.delete("cruelHighlight");
  }
  if (scopes.includes("stripe-return")) {
    search.delete("payment_intent");
    search.delete("payment_intent_client_secret");
    search.delete("redirect_status");
  }
  if (scopes.includes("hard-reload-bust")) {
    search.delete(HARD_RELOAD_CACHE_BUST_PARAM);
  }
  if (scopes.includes("referral")) {
    search.delete("ref");
  }
}

/** Idempotent URL cleanup. Safe after consumeStartupAuthCallback for auth scopes. */
export function applyStartupUrlCleanup(
  location: StartupLocation = window.location,
  scopes: StartupUrlCleanupScope[],
): void {
  if (scopes.includes("referral")) {
    persistLandingReferralCode(location.search);
  }
  const next = buildCleanedUrl(location, scopes);
  if (!next) return;
  if (typeof window === "undefined" || !window.history?.replaceState) return;
  window.history.replaceState({}, document.title, next);
}

/** Convenience: strip Stripe return params after payment processing. */
export function stripStripeReturnParamsFromUrl(
  location: StartupLocation = window.location,
): void {
  applyStartupUrlCleanup(location, ["stripe-return"]);
}
