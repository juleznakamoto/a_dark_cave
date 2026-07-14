/**
 * One-time import of legacy users into two Resend segments (oldest → newest):
 *
 *  1. "Pre-consent legacy (no marketing record)" — confirmed users that predate
 *     marketing-consent capture (no `marketing_preferences` row).
 *  2. "Currently subscribed (marketing opt-in)" — confirmed users with
 *     `marketing_opt_in = true`.
 *
 * Cohorts are de-duplicated by email and mutually exclusive (subscribed wins).
 * Explicit opt-outs are excluded. Each contact gets a fresh Supabase unsubscribe
 * token, and the `unsubscribe_url` contact property is created if missing.
 *
 * Env (see scripts/resendScriptEnv.ts):
 *   - NODE_ENV !== "development" → *_PROD Supabase + Resend key
 *   - RESEND_API_KEY_PROD / RESEND_API_KEY, or Bearer token in .cursor/mcp.json
 *
 * CLI:
 *   tsx scripts/import-legacy-resend-segments.ts [--dry-run] [--no-wait]
 *                                                [--only pre-consent|subscribed]
 */

import { createClient } from "@supabase/supabase-js";
import { loadResendLegacyCohorts } from "../server/resendContactCsv";
import {
  findOrCreateResendSegment,
  importMarketingRowsToResendSegment,
} from "../server/resendContactSync";
import { getResendApiKey, getSupabaseConfig } from "./resendScriptEnv";

const SEGMENT_PRE_CONSENT = "Pre-consent legacy (no marketing record)";
const SEGMENT_SUBSCRIBED = "Currently subscribed (marketing opt-in)";

type Only = "pre-consent" | "subscribed" | "both";

function parseArgs(): { wait: boolean; dryRun: boolean; only: Only } {
  const argv = process.argv.slice(2);
  const wait = !argv.includes("--no-wait");
  const dryRun = argv.includes("--dry-run");
  let only: Only = "both";
  const idx = argv.indexOf("--only");
  const val = idx >= 0 ? argv[idx + 1] : undefined;
  if (val === "pre-consent" || val === "subscribed") only = val;
  return { wait, dryRun, only };
}

async function main(): Promise<void> {
  const { wait, dryRun, only } = parseArgs();
  const env = process.env.NODE_ENV === "development" ? "DEV" : "PROD";
  const { url, serviceKey } = getSupabaseConfig();
  const apiKey = getResendApiKey();

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { preConsent, subscribed } = await loadResendLegacyCohorts(admin);
  console.log(
    `[${env}] cohorts: pre-consent ${preConsent.length}, subscribed ${subscribed.length}`,
  );

  if (dryRun) {
    console.log("--dry-run: no segments created, no contacts imported");
    console.log(
      `  pre-consent oldest→newest: ${preConsent[0]?.email ?? "-"} … ${preConsent.at(-1)?.email ?? "-"}`,
    );
    console.log(
      `  subscribed  oldest→newest: ${subscribed[0]?.email ?? "-"} … ${subscribed.at(-1)?.email ?? "-"}`,
    );
    return;
  }

  const jobs: { name: string; rows: typeof preConsent }[] = [];
  if (only !== "subscribed") jobs.push({ name: SEGMENT_PRE_CONSENT, rows: preConsent });
  if (only !== "pre-consent") jobs.push({ name: SEGMENT_SUBSCRIBED, rows: subscribed });

  for (const job of jobs) {
    if (!job.rows.length) {
      console.log(`Skipping "${job.name}" (0 contacts)`);
      continue;
    }
    const segment = await findOrCreateResendSegment(job.name, apiKey);
    console.log(
      `Segment "${job.name}" ${segment.created ? "created" : "reused"} (${segment.id})`,
    );
    const result = await importMarketingRowsToResendSegment(
      admin,
      apiKey,
      job.rows,
      segment.id,
      { wait },
    );
    console.log(
      `  Queued ${result.contactCount} contacts (import ${result.importId})`,
    );
    if (result.status) {
      console.log(
        `  Import ${result.status.status}: imported=${result.status.imported_contacts ?? 0} failed=${result.status.failed_contacts ?? 0}`,
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
