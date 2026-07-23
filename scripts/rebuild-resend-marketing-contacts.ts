/**
 * Wipe all Resend contacts, then re-import pre-consent + subscribed cohorts
 * (excludes explicit marketing opt-outs). Same cohorts as import-legacy-resend-segments.
 *
 * Env (see scripts/resendScriptEnv.ts):
 *   VITE_SUPABASE_URL_PROD + SUPABASE_SERVICE_ROLE_KEY_PROD
 *   RESEND_API_KEY / RESEND_API_KEY_PROD (or .cursor/mcp.json)
 *
 * CLI:
 *   tsx scripts/rebuild-resend-marketing-contacts.ts [--dry-run] [--skip-delete] [--no-wait]
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
const MAX_PER_SEC = 8;

function parseArgs(): {
  wait: boolean;
  dryRun: boolean;
  skipDelete: boolean;
} {
  const argv = process.argv.slice(2);
  return {
    wait: !argv.includes("--no-wait"),
    dryRun: argv.includes("--dry-run"),
    skipDelete: argv.includes("--skip-delete"),
  };
}

async function listAllResendContactIds(apiKey: string): Promise<string[]> {
  const ids: string[] = [];
  let after: string | null = null;
  const timestamps: number[] = [];
  const acquire = async () => {
    for (;;) {
      const now = Date.now();
      while (timestamps.length && now - timestamps[0]! >= 1000) timestamps.shift();
      if (timestamps.length < MAX_PER_SEC) {
        timestamps.push(now);
        return;
      }
      await new Promise((r) => setTimeout(r, 25));
    }
  };

  for (;;) {
    await acquire();
    const url = new URL("https://api.resend.com/contacts");
    url.searchParams.set("limit", "100");
    if (after) url.searchParams.set("after", after);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`List contacts failed (${res.status}): ${await res.text()}`);
    }
    const body = (await res.json()) as {
      data?: { id: string }[];
      has_more?: boolean;
    };
    for (const c of body.data ?? []) ids.push(c.id);
    if (!body.has_more || !(body.data?.length)) break;
    after = body.data[body.data.length - 1]!.id;
  }
  return ids;
}

async function deleteAllResendContacts(apiKey: string): Promise<number> {
  let totalDeleted = 0;
  for (let pass = 1; ; pass++) {
    const ids = await listAllResendContactIds(apiKey);
    console.log(`Delete pass ${pass}: ${ids.length} contacts`);
    if (!ids.length) break;

    const timestamps: number[] = [];
    const acquire = async () => {
      for (;;) {
        const now = Date.now();
        while (timestamps.length && now - timestamps[0]! >= 1000) {
          timestamps.shift();
        }
        if (timestamps.length < MAX_PER_SEC) {
          timestamps.push(now);
          return;
        }
        await new Promise((r) => setTimeout(r, 25));
      }
    };

    let deleted = 0;
    let failed = 0;
    let i = 0;
    const workers = 8;
    async function worker() {
      while (i < ids.length) {
        const id = ids[i++]!;
        let ok = false;
        for (let attempt = 0; attempt < 10; attempt++) {
          await acquire();
          const res = await fetch(`https://api.resend.com/contacts/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (res.ok || res.status === 404) {
            ok = true;
            break;
          }
          if (res.status === 429) {
            await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
            continue;
          }
          console.error(`Delete failed ${id}: ${res.status} ${await res.text()}`);
          break;
        }
        if (ok) deleted++;
        else failed++;
        if ((deleted + failed) % 100 === 0 || deleted + failed === ids.length) {
          console.log(`  deleted=${deleted} failed=${failed} / ${ids.length}`);
        }
      }
    }
    await Promise.all(Array.from({ length: workers }, () => worker()));
    totalDeleted += deleted;
    if (failed > 0 && deleted === 0) {
      throw new Error("Delete stalled (all failed)");
    }
  }
  return totalDeleted;
}

async function main(): Promise<void> {
  const { wait, dryRun, skipDelete } = parseArgs();
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
    console.log("--dry-run: no deletes, no imports");
    return;
  }

  if (!skipDelete) {
    const deleted = await deleteAllResendContacts(apiKey);
    console.log(`Wiped ${deleted} Resend contacts`);
  } else {
    console.log("--skip-delete: leaving existing Resend contacts in place");
  }

  const jobs = [
    { name: SEGMENT_PRE_CONSENT, rows: preConsent },
    { name: SEGMENT_SUBSCRIBED, rows: subscribed },
  ];

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
