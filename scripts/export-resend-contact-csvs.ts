/**
 * Export confirmed Supabase users to two CSV files for Resend Audience import.
 *
 * Env (same dev/prod split as server/index.ts getAdminClient):
 * - NODE_ENV === "development" → VITE_SUPABASE_URL_DEV + SUPABASE_SERVICE_ROLE_KEY_DEV
 * - Otherwise → VITE_SUPABASE_URL_PROD + SUPABASE_SERVICE_ROLE_KEY_PROD
 *
 * CLI: tsx scripts/export-resend-contact-csvs.ts [--out ./exports] [--dry-run]
 *
 * Resend (manual after export):
 * 1. Create two Segments: https://resend.com/docs/dashboard/segments/introduction
 * 2. Audience → Add Contacts → Import CSV: https://resend.com/docs/dashboard/audiences/contacts
 *    Map columns to email, first_name, last_name, unsubscribed; assign each file to the matching Segment.
 *
 * Files written:
 * - resend-marketing-opt-in.csv — marketing_preferences.marketing_opt_in === true
 * - resend-no-marketing.csv — no row or marketing_opt_in === false
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

type AdminClient = SupabaseClient;

const MARKETING_FILE = "resend-marketing-opt-in.csv";
const NO_MARKETING_FILE = "resend-no-marketing.csv";

const PAGE_SIZE = 1000;

function getSupabaseConfig(): { url: string; serviceKey: string } {
  const dev = process.env.NODE_ENV === "development";
  const url = dev
    ? process.env.VITE_SUPABASE_URL_DEV
    : process.env.VITE_SUPABASE_URL_PROD;
  const serviceKey = dev
    ? process.env.SUPABASE_SERVICE_ROLE_KEY_DEV
    : process.env.SUPABASE_SERVICE_ROLE_KEY_PROD;
  if (!url?.trim() || !serviceKey?.trim()) {
    const which = dev ? "DEV" : "PROD";
    throw new Error(
      `Missing VITE_SUPABASE_URL_${which} or SUPABASE_SERVICE_ROLE_KEY_${which} (NODE_ENV=${process.env.NODE_ENV ?? "undefined"})`,
    );
  }
  return { url: url.trim(), serviceKey: serviceKey.trim() };
}

function parseArgs(): { outDir: string; dryRun: boolean } {
  const argv = process.argv.slice(2);
  let outDir = resolve(process.cwd(), "exports");
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") {
      dryRun = true;
    } else if (a === "--out" && argv[i + 1]) {
      outDir = resolve(process.cwd(), argv[++i]!);
    }
  }
  return { outDir, dryRun };
}

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

type Row = { email: string; first_name: string; last_name: string };

function rowsToCsv(rows: Row[]): string {
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

function buildRows(
  users: User[],
  marketingByUserId: Map<string, boolean>,
): { marketing: Row[]; noMarketing: Row[] } {
  const marketing: Row[] = [];
  const noMarketing: Row[] = [];
  const seenMarketing = new Set<string>();
  const seenNo = new Set<string>();

  for (const u of users) {
    if (!u.email_confirmed_at || !u.email?.trim()) continue;
    const emailRaw = u.email.trim();
    const emailKey = emailRaw.toLowerCase();
    const optedIn = marketingByUserId.get(u.id) === true;
    const { first_name, last_name } = namesFromMetadata(u.user_metadata);
    const row: Row = {
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

  const byEmail = (a: Row, b: Row) => a.email.localeCompare(b.email);
  marketing.sort(byEmail);
  noMarketing.sort(byEmail);
  return { marketing, noMarketing };
}

async function main(): Promise<void> {
  const { outDir, dryRun } = parseArgs();
  const { url, serviceKey } = getSupabaseConfig();

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const marketingByUserId = await fetchMarketingMap(admin);
  const users = await fetchAllAuthUsers(admin);
  const { marketing, noMarketing } = buildRows(users, marketingByUserId);

  console.log(
    `Confirmed users: marketing opt-in ${marketing.length}, no marketing ${noMarketing.length} (NODE_ENV=${process.env.NODE_ENV ?? "undefined"})`,
  );

  if (dryRun) {
    console.log("--dry-run: not writing files");
    return;
  }

  mkdirSync(outDir, { recursive: true });
  const pathMarketing = resolve(outDir, MARKETING_FILE);
  const pathNo = resolve(outDir, NO_MARKETING_FILE);
  writeFileSync(pathMarketing, rowsToCsv(marketing), "utf-8");
  writeFileSync(pathNo, rowsToCsv(noMarketing), "utf-8");
  console.log(`Wrote ${pathMarketing}`);
  console.log(`Wrote ${pathNo}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
