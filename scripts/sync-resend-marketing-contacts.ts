/**
 * Sync confirmed marketing opt-in users to Resend (with unsubscribe_url tokens).
 *
 * Env (same as export-resend-contact-csvs.ts):
 * - NODE_ENV === "development" → *_DEV Supabase vars
 * - Otherwise → *_PROD Supabase vars
 * - RESEND_API_KEY or RESEND_API_KEY_PROD
 *
 * CLI: tsx scripts/sync-resend-marketing-contacts.ts [--no-wait]
 */

import { createClient } from "@supabase/supabase-js";
import { syncMarketingContactsToResend } from "../server/resendContactSync";
import { getResendApiKey, getSupabaseConfig } from "./resendScriptEnv";

function parseArgs(): { wait: boolean } {
  return { wait: !process.argv.includes("--no-wait") };
}

async function main(): Promise<void> {
  const { wait } = parseArgs();
  const { url, serviceKey } = getSupabaseConfig();
  const apiKey = getResendApiKey();

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const result = await syncMarketingContactsToResend(admin, apiKey, { wait });
  console.log(
    `Queued ${result.contactCount} marketing contacts (import ${result.importId})`,
  );
  if (result.status) {
    console.log(
      `Import ${result.status.status}: imported=${result.status.imported_contacts ?? 0} failed=${result.status.failed_contacts ?? 0}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
