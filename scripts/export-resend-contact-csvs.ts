/**
 * Export confirmed Supabase users to two CSV files for Resend Audience import.
 *
 * Env (same dev/prod split as server/index.ts getAdminClient):
 * - NODE_ENV === "development" → VITE_SUPABASE_URL_DEV + SUPABASE_SERVICE_ROLE_KEY_DEV
 * - Otherwise → VITE_SUPABASE_URL_PROD + SUPABASE_SERVICE_ROLE_KEY_PROD
 *
 * CLI: tsx scripts/export-resend-contact-csvs.ts [--out ./exports] [--dry-run]
 *
 * Prefer the admin dashboard (production) for downloads so CSVs never touch the repo.
 *
 * Resend (manual after export):
 * 1. Create two Segments: https://resend.com/docs/dashboard/segments/introduction
 * 2. Audience → Add Contacts → Import CSV: https://resend.com/docs/dashboard/audiences/contacts
 *    Map columns to email, first_name, last_name, unsubscribed; assign each file to the matching Segment.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  buildResendContactCsvExports,
  RESEND_MARKETING_CSV_FILENAME,
  RESEND_NO_MARKETING_CSV_FILENAME,
} from "../server/resendContactCsv";

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

async function main(): Promise<void> {
  const { outDir, dryRun } = parseArgs();
  const { url, serviceKey } = getSupabaseConfig();

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { marketingCsv, noMarketingCsv, marketingCount, noMarketingCount } =
    await buildResendContactCsvExports(admin);

  console.log(
    `Confirmed users: marketing opt-in ${marketingCount}, no marketing ${noMarketingCount} (NODE_ENV=${process.env.NODE_ENV ?? "undefined"})`,
  );

  if (dryRun) {
    console.log("--dry-run: not writing files");
    return;
  }

  mkdirSync(outDir, { recursive: true });
  const pathMarketing = resolve(outDir, RESEND_MARKETING_CSV_FILENAME);
  const pathNo = resolve(outDir, RESEND_NO_MARKETING_CSV_FILENAME);
  writeFileSync(pathMarketing, marketingCsv, "utf-8");
  writeFileSync(pathNo, noMarketingCsv, "utf-8");
  console.log(`Wrote ${pathMarketing}`);
  console.log(`Wrote ${pathNo}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
