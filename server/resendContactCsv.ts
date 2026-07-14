/**
 * Build Resend Audience CSV strings from Supabase auth + marketing_preferences.
 * Used by the admin download endpoint and the optional CLI export script.
 *
 * Marketing CSV includes a per-contact `unsubscribe_url` (Supabase one-time token).
 * In Resend: create a string Contact Property `unsubscribe_url`, map the CSV column,
 * and use `{{{contact.unsubscribe_url}}}` in broadcast HTML — not `{{{RESEND_UNSUBSCRIBE_URL}}}`.
 * The property must exist before import (Resend drops values for unknown keys);
 * `syncMarketingContactsToResend` calls `ensureResendUnsubscribeUrlProperty` to guarantee this.
 */

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createMarketingUnsubscribeUrl } from "./marketing";

export type AdminClient = SupabaseClient;

const PAGE_SIZE = 1000;

export const RESEND_MARKETING_CSV_FILENAME = "resend-marketing-opt-in.csv";
export const RESEND_NO_MARKETING_CSV_FILENAME = "resend-no-marketing.csv";

/** Resend Contact Property key for Supabase unsubscribe links in broadcast HTML. */
export const RESEND_UNSUBSCRIBE_URL_PROPERTY = "unsubscribe_url";

export function namesFromMetadata(
  meta: User["user_metadata"] | undefined,
): { first_name: string; last_name: string } {
  if (!meta || typeof meta !== "object") {
    return { first_name: "", last_name: "" };
  }
  const m = meta as Record<string, unknown>;
  const fn = m.first_name ?? m.given_name;
  const ln = m.last_name ?? m.family_name;
  if (typeof fn === "string" || typeof ln === "string") {
    return {
      first_name: typeof fn === "string" ? fn : "",
      last_name: typeof ln === "string" ? ln : "",
    };
  }
  const full = m.full_name ?? m.name;
  if (typeof full === "string" && full.trim()) {
    const parts = full.trim().split(/\s+/);
    if (parts.length === 1) {
      return { first_name: parts[0]!, last_name: "" };
    }
    return { first_name: parts[0]!, last_name: parts.slice(1).join(" ") };
  }
  return { first_name: "", last_name: "" };
}

function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export type ResendContactRow = { email: string; first_name: string; last_name: string };

export type ResendMarketingContactRow = ResendContactRow & {
  user_id: string;
  unsubscribe_url?: string;
};

export function rowsToResendContactCsv(rows: ResendContactRow[]): string {
  const header = ["email", "first_name", "last_name", "unsubscribed"].join(",");
  const lines = rows.map((r) =>
    [r.email, r.first_name, r.last_name, "false"].map(csvCell).join(","),
  );
  return `${header}\n${lines.join("\n")}\n`;
}

export function rowsToResendMarketingContactCsv(
  rows: ResendMarketingContactRow[],
): string {
  const header = [
    "email",
    "first_name",
    "last_name",
    "unsubscribed",
    RESEND_UNSUBSCRIBE_URL_PROPERTY,
  ].join(",");
  const lines = rows.map((r) => {
    if (!r.unsubscribe_url?.trim()) {
      throw new Error(
        `Missing unsubscribe_url for marketing contact ${r.email}`,
      );
    }
    return [r.email, r.first_name, r.last_name, "false", r.unsubscribe_url]
      .map(csvCell)
      .join(",");
  });
  return `${header}\n${lines.join("\n")}\n`;
}

const UNSUBSCRIBE_URL_BATCH_SIZE = 25;

/** One-time Supabase unsubscribe token per marketing row (for Resend broadcast merge). */
export async function attachUnsubscribeUrlsToMarketingRows(
  admin: AdminClient,
  rows: ResendMarketingContactRow[],
): Promise<void> {
  for (let i = 0; i < rows.length; i += UNSUBSCRIBE_URL_BATCH_SIZE) {
    const chunk = rows.slice(i, i + UNSUBSCRIBE_URL_BATCH_SIZE);
    await Promise.all(
      chunk.map(async (row) => {
        row.unsubscribe_url = await createMarketingUnsubscribeUrl(
          admin,
          row.user_id,
        );
      }),
    );
  }
}

export async function fetchMarketingMap(admin: AdminClient): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  let from = 0;
  for (; ;) {
    const { data, error } = await admin
      .from("marketing_preferences")
      .select("user_id, marketing_opt_in")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data as { user_id: string; marketing_opt_in: boolean }[]) {
      map.set(row.user_id, row.marketing_opt_in === true);
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return map;
}

export async function fetchAllAuthUsers(admin: AdminClient): Promise<User[]> {
  const users: User[] = [];
  let page = 1;
  for (; ;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });
    if (error) throw error;
    if (!data?.users.length) break;
    users.push(...data.users);
    if (data.users.length < PAGE_SIZE) break;
    page += 1;
  }
  return users;
}

export function buildResendContactRows(
  users: User[],
  marketingByUserId: Map<string, boolean>,
): { marketing: ResendMarketingContactRow[]; noMarketing: ResendContactRow[] } {
  const marketing: ResendMarketingContactRow[] = [];
  const noMarketing: ResendContactRow[] = [];
  const seenMarketing = new Set<string>();
  const seenNo = new Set<string>();

  for (const u of users) {
    if (!u.email_confirmed_at || !u.email?.trim()) continue;
    const emailRaw = u.email.trim();
    const emailKey = emailRaw.toLowerCase();
    const optedIn = marketingByUserId.get(u.id) === true;
    const { first_name, last_name } = namesFromMetadata(u.user_metadata);
    if (optedIn) {
      if (seenMarketing.has(emailKey)) continue;
      seenMarketing.add(emailKey);
      marketing.push({
        user_id: u.id,
        email: emailRaw,
        first_name,
        last_name,
      });
    } else {
      if (seenNo.has(emailKey)) continue;
      seenNo.add(emailKey);
      noMarketing.push({
        email: emailRaw,
        first_name,
        last_name,
      });
    }
  }

  const byEmail = (a: { email: string }, b: { email: string }) =>
    a.email.localeCompare(b.email);
  marketing.sort(byEmail);
  noMarketing.sort(byEmail);
  return { marketing, noMarketing };
}

export async function loadResendContactRowsSplit(admin: AdminClient): Promise<{
  marketing: ResendMarketingContactRow[];
  noMarketing: ResendContactRow[];
}> {
  const marketingByUserId = await fetchMarketingMap(admin);
  const users = await fetchAllAuthUsers(admin);
  return buildResendContactRows(users, marketingByUserId);
}

/** Ascending signup order so imports land oldest → newest. */
function byCreatedAtAsc(a: User, b: User): number {
  const ta = a.created_at ? Date.parse(a.created_at) : 0;
  const tb = b.created_at ? Date.parse(b.created_at) : 0;
  return ta - tb;
}

/**
 * Split confirmed users into the two legacy Resend-segment cohorts, each sorted
 * oldest → newest by signup date and de-duplicated by (lowercased) email:
 *  - `preConsent`: users with NO `marketing_preferences` row (predate consent capture)
 *  - `subscribed`: users with `marketing_opt_in = true`
 *
 * Explicit opt-outs (row present, `marketing_opt_in = false`) are excluded from both.
 * The cohorts are mutually exclusive by email — if the same address is both subscribed
 * and (via another user row) pre-consent, `subscribed` wins so it never lands in both.
 */
export async function loadResendLegacyCohorts(admin: AdminClient): Promise<{
  preConsent: ResendMarketingContactRow[];
  subscribed: ResendMarketingContactRow[];
}> {
  const marketingByUserId = await fetchMarketingMap(admin);
  const users = [...(await fetchAllAuthUsers(admin))].sort(byCreatedAtAsc);

  const subscribed: ResendMarketingContactRow[] = [];
  const seenSubscribed = new Set<string>();
  for (const u of users) {
    if (!u.email_confirmed_at || !u.email?.trim()) continue;
    if (marketingByUserId.get(u.id) !== true) continue;
    const emailRaw = u.email.trim();
    const emailKey = emailRaw.toLowerCase();
    if (seenSubscribed.has(emailKey)) continue;
    seenSubscribed.add(emailKey);
    subscribed.push({ user_id: u.id, email: emailRaw, ...namesFromMetadata(u.user_metadata) });
  }

  const preConsent: ResendMarketingContactRow[] = [];
  const seenPreConsent = new Set<string>();
  for (const u of users) {
    if (!u.email_confirmed_at || !u.email?.trim()) continue;
    // Pre-consent = no preferences row at all (opt-in and opt-out both have rows).
    if (marketingByUserId.has(u.id)) continue;
    const emailRaw = u.email.trim();
    const emailKey = emailRaw.toLowerCase();
    if (seenSubscribed.has(emailKey) || seenPreConsent.has(emailKey)) continue;
    seenPreConsent.add(emailKey);
    preConsent.push({ user_id: u.id, email: emailRaw, ...namesFromMetadata(u.user_metadata) });
  }

  return { preConsent, subscribed };
}

export async function buildResendContactCsvExports(admin: AdminClient): Promise<{
  marketingCsv: string;
  noMarketingCsv: string;
  marketingCount: number;
  noMarketingCount: number;
}> {
  const { marketing, noMarketing } = await loadResendContactRowsSplit(admin);
  await attachUnsubscribeUrlsToMarketingRows(admin, marketing);
  return {
    marketingCsv: rowsToResendMarketingContactCsv(marketing),
    noMarketingCsv: rowsToResendContactCsv(noMarketing),
    marketingCount: marketing.length,
    noMarketingCount: noMarketing.length,
  };
}
