/**
 * Build Resend Audience CSV strings from Supabase auth + marketing_preferences.
 * Used by the admin download endpoint and the optional CLI export script.
 */

import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AdminClient = SupabaseClient;

const PAGE_SIZE = 1000;

export const RESEND_MARKETING_CSV_FILENAME = "resend-marketing-opt-in.csv";
export const RESEND_NO_MARKETING_CSV_FILENAME = "resend-no-marketing.csv";

function namesFromMetadata(
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

export function rowsToResendContactCsv(rows: ResendContactRow[]): string {
  const header = ["email", "first_name", "last_name", "unsubscribed"].join(",");
  const lines = rows.map((r) =>
    [r.email, r.first_name, r.last_name, "false"].map(csvCell).join(","),
  );
  return `${header}\n${lines.join("\n")}\n`;
}

async function fetchMarketingMap(admin: AdminClient): Promise<Map<string, boolean>> {
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

async function fetchAllAuthUsers(admin: AdminClient): Promise<User[]> {
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
): { marketing: ResendContactRow[]; noMarketing: ResendContactRow[] } {
  const marketing: ResendContactRow[] = [];
  const noMarketing: ResendContactRow[] = [];
  const seenMarketing = new Set<string>();
  const seenNo = new Set<string>();

  for (const u of users) {
    if (!u.email_confirmed_at || !u.email?.trim()) continue;
    const emailRaw = u.email.trim();
    const emailKey = emailRaw.toLowerCase();
    const optedIn = marketingByUserId.get(u.id) === true;
    const { first_name, last_name } = namesFromMetadata(u.user_metadata);
    const row: ResendContactRow = {
      email: emailRaw,
      first_name,
      last_name,
    };
    if (optedIn) {
      if (seenMarketing.has(emailKey)) continue;
      seenMarketing.add(emailKey);
      marketing.push(row);
    } else {
      if (seenNo.has(emailKey)) continue;
      seenNo.add(emailKey);
      noMarketing.push(row);
    }
  }

  const byEmail = (a: ResendContactRow, b: ResendContactRow) =>
    a.email.localeCompare(b.email);
  marketing.sort(byEmail);
  noMarketing.sort(byEmail);
  return { marketing, noMarketing };
}

export async function loadResendContactRowsSplit(admin: AdminClient): Promise<{
  marketing: ResendContactRow[];
  noMarketing: ResendContactRow[];
}> {
  const marketingByUserId = await fetchMarketingMap(admin);
  const users = await fetchAllAuthUsers(admin);
  return buildResendContactRows(users, marketingByUserId);
}

export async function buildResendContactCsvExports(admin: AdminClient): Promise<{
  marketingCsv: string;
  noMarketingCsv: string;
  marketingCount: number;
  noMarketingCount: number;
}> {
  const { marketing, noMarketing } = await loadResendContactRowsSplit(admin);
  return {
    marketingCsv: rowsToResendContactCsv(marketing),
    noMarketingCsv: rowsToResendContactCsv(noMarketing),
    marketingCount: marketing.length,
    noMarketingCount: noMarketing.length,
  };
}
