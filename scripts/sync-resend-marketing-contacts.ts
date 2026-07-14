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

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { syncMarketingContactsToResend } from "../server/resendContactSync";

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
      `Missing VITE_SUPABASE_URL_${which} or SUPABASE_SERVICE_ROLE_KEY_${which}`,
    );
  }
  return { url: url.trim(), serviceKey: serviceKey.trim() };
}

function getResendApiKeyFromEnv(): string | null {
  const key =
    process.env.RESEND_API_KEY_PROD?.trim() ||
    process.env.RESEND_API_KEY?.trim();
  return key || null;
}

function getResendApiKeyFromMcpJson(): string | null {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".cursor/mcp.json"), "utf8");
    const parsed = JSON.parse(raw) as {
      mcpServers?: {
        resend?: { headers?: { Authorization?: string } };
      };
    };
    const auth = parsed.mcpServers?.resend?.headers?.Authorization ?? "";
    const match = auth.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim() || null;
  } catch {
    return null;
  }
}

function parseArgs(): { wait: boolean } {
  return { wait: !process.argv.includes("--no-wait") };
}

async function main(): Promise<void> {
  const { wait } = parseArgs();
  const { url, serviceKey } = getSupabaseConfig();
  const apiKey = getResendApiKeyFromEnv() ?? getResendApiKeyFromMcpJson();
  if (!apiKey) {
    throw new Error(
      "Missing Resend API key (set RESEND_API_KEY / RESEND_API_KEY_PROD or add Bearer token in .cursor/mcp.json)",
    );
  }

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
