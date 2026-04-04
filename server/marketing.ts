import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const MARKETING_CONSENT_TEXT_VERSION = 1;
export const MARKETING_PROMPT_VERSION = 1;

export type MarketingConsentSource =
  | "email_signup"
  | "google_signup"
  | "settings_toggle"
  | "unsubscribe_link";

/** Sources the browser may send (unsubscribe_link is server-only). */
export const CLIENT_ALLOWED_MARKETING_SOURCES = new Set<MarketingConsentSource>([
  "email_signup",
  "google_signup",
  "settings_toggle",
]);

export function hashMarketingToken(raw: string): string {
  return crypto.createHash("sha256").update(raw, "utf8").digest("hex");
}

export function generateMarketingRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getMarketingAdminEnv(): "dev" | "prod" {
  return process.env.NODE_ENV === "development" ? "dev" : "prod";
}

/** Base URL for unsubscribe links (no trailing slash). */
export function getPublicSiteOrigin(): string {
  const fromEnv =
    process.env.PUBLIC_SITE_URL?.trim() ||
    process.env.VITE_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://a-dark-cave.com";
}

export async function upsertMarketingPreferences(
  adminClient: SupabaseClient,
  userId: string,
  email: string | null | undefined,
  marketingOptIn: boolean,
  consentSource: MarketingConsentSource,
  consentTextVersion: number,
  promptVersion: number,
): Promise<void> {
  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    user_id: userId,
    email: email ?? null,
    marketing_opt_in: marketingOptIn,
    consent_source: consentSource,
    consent_text_version: consentTextVersion,
    prompt_version: promptVersion,
    updated_at: now,
  };
  if (marketingOptIn) {
    row.consented_at = now;
    row.revoked_at = null;
  } else {
    row.revoked_at = now;
    row.consented_at = null;
  }

  const { error } = await adminClient
    .from("marketing_preferences")
    .upsert(row, { onConflict: "user_id" });
  if (error) throw error;
}

/**
 * Create a one-time unsubscribe URL for marketing emails.
 * Store the raw token only in the email; only the hash is persisted.
 */
export async function createMarketingUnsubscribeUrl(
  adminClient: SupabaseClient,
  userId: string,
): Promise<string> {
  const raw = generateMarketingRawToken();
  const tokenHash = hashMarketingToken(raw);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);

  const { error } = await adminClient.from("marketing_unsubscribe_tokens").insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw error;

  const origin = getPublicSiteOrigin();
  return `${origin}/unsubscribe?token=${encodeURIComponent(raw)}`;
}
