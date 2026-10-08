/**
 * Import one Resend contact CSV. Prints counts only.
 *
 * The audience must already be empty. Clear it first with
 * scripts/clear-resend-contacts.ts. The plan cap is 1000 contacts.
 *
 * CLI: tsx scripts/upload-resend-contact-csv.ts --file exports/newsletter-next-fest/batch-01.csv
 *
 * CSV headers: email, first_name, last_name, unsubscribed, unsubscribe_url
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createResendMarketingContactImport,
  ensureResendUnsubscribeUrlProperty,
  waitForResendContactImport,
} from "../server/resendContactSync";
import { getResendApiKey } from "./resendScriptEnv";

const CONTACT_CAP = 1000;

function arg(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : "";
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function countContacts(apiKey: string): Promise<number> {
  let total = 0;
  let after: string | null = null;
  for (;;) {
    const url = new URL("https://api.resend.com/contacts");
    url.searchParams.set("limit", "100");
    if (after) url.searchParams.set("after", after);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`List contacts failed (${res.status})`);
    const body = (await res.json()) as {
      data?: { id: string }[];
      has_more?: boolean;
    };
    const page = body.data ?? [];
    total += page.length;
    if (!body.has_more || page.length === 0) break;
    after = page[page.length - 1]!.id;
  }
  return total;
}

async function main(): Promise<void> {
  const file = resolve(arg("--file"));
  const csv = readFileSync(file, "utf8");
  const rows = csv.trim().split(/\n/).length - 1;
  if (rows < 1 || rows > CONTACT_CAP) {
    throw new Error(`CSV has ${rows} contacts. Cap is ${CONTACT_CAP}.`);
  }
  const apiKey = getResendApiKey();
  const before = await countContacts(apiKey);
  console.log(`contacts_before=${before}`);
  if (before > 0) {
    throw new Error(
      `Resend already has ${before} contacts. Run scripts/clear-resend-contacts.ts first.`,
    );
  }
  await ensureResendUnsubscribeUrlProperty(apiKey);
  const { importId } = await createResendMarketingContactImport(csv, apiKey);
  console.log(`import_id=${importId} queued=${rows}`);
  const status = await waitForResendContactImport(importId, apiKey);
  const counts = status.counts;
  console.log(
    `status=${status.status ?? "unknown"} created=${counts?.created ?? 0} updated=${counts?.updated ?? 0} skipped=${counts?.skipped ?? 0} failed=${counts?.failed ?? status.failed_contacts ?? 0}`,
  );
  if ((status.status ?? "").toLowerCase() === "failed") {
    throw new Error(status.error ?? `Import ${importId} failed`);
  }
  console.log(`contacts_after=${await countContacts(apiKey)}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(1);
});
