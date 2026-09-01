/**
 * Split non-unsubscribed contacts into 10 Resend batches (plan cap: 1000
 * contacts). Wipe the audience, then upload one batch.
 *
 * Batches are oldest → newest by signup, persisted under
 * tmp/resend-rebuild/batches/ so later `--batch 2` … `--batch 10` stay stable.
 *
 * Env: RESEND_API_KEY / RESEND_API_KEY_PROD (see resendScriptEnv.ts)
 *
 * CLI:
 *   tsx scripts/import-resend-contact-batches.ts [--prepare-only]
 *                                                [--batch 1]
 *                                                [--skip-delete]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  namesFromMetadata,
  rowsToResendMarketingContactCsv,
  type ResendMarketingContactRow,
} from "../server/resendContactCsv";
import {
  createResendMarketingContactImport,
  ensureResendUnsubscribeUrlProperty,
  findOrCreateResendSegment,
  waitForResendContactImport,
} from "../server/resendContactSync";
import {
  generateMarketingRawToken,
  getPublicSiteOrigin,
  hashMarketingToken,
} from "../server/marketing";
import { getResendApiKey } from "./resendScriptEnv";

export const RESEND_BATCH_COUNT = 10;
export const RESEND_BATCH_CONTACT_CAP = 1000;

const ROOT = resolve("tmp/resend-rebuild");
const BATCH_DIR = join(ROOT, "batches");
const ALL_CONTACTS_FILE = join(BATCH_DIR, "all-contacts.json");
const MANIFEST_FILE = join(BATCH_DIR, "manifest.json");

const AGENT_TOOLS = resolve(
  process.env.USERPROFILE ?? "",
  ".cursor/projects/c-Users-bauer-dev-a-dark-cave/agent-tools",
);
const PAGE_FILES = [
  "5fb3a7b8-d1ae-4cf8-b1f6-0fcadb8cbc0d.txt",
  "3c193911-dcd8-4dc0-ad76-7ddc14ef6b82.txt",
  "7929cf89-791f-4d09-bbbf-37f9b7b3fe10.txt",
  "a8adc1e8-32ca-49c3-9502-6017a88fae9a.txt",
  "9f37fd09-3478-4519-8594-a9c838db95b9.txt",
];

type StoredContact = ResendMarketingContactRow & {
  created_at: string;
  cohort: "pre_consent" | "subscribed";
};

type ExportRow = {
  user_id: string;
  email: string;
  created_at: string;
  raw_user_meta_data?: Record<string, unknown> | null;
  first_name?: string;
  last_name?: string;
  cohort: "pre_consent" | "subscribed";
};

type Manifest = {
  createdAt: string;
  batchCount: number;
  total: number;
  batches: { index: number; file: string; count: number; segment: string }[];
};

function parseArgs(): { batch: number; prepareOnly: boolean; skipDelete: boolean } {
  const argv = process.argv.slice(2);
  const idx = argv.indexOf("--batch");
  const raw = idx >= 0 ? Number(argv[idx + 1]) : 1;
  if (!Number.isInteger(raw) || raw < 1 || raw > RESEND_BATCH_COUNT) {
    throw new Error(`--batch must be 1..${RESEND_BATCH_COUNT}`);
  }
  return {
    batch: raw,
    prepareOnly: argv.includes("--prepare-only"),
    skipDelete: argv.includes("--skip-delete"),
  };
}

function parseMcpFile(path: string): ExportRow[] {
  const raw = readFileSync(path, "utf8");
  const wrapped = JSON.parse(raw) as { result?: string };
  const text = typeof wrapped.result === "string" ? wrapped.result : raw;
  const firstTag = text.indexOf("<untrusted-data-");
  const open = text.indexOf("<untrusted-data-", firstTag + 1);
  const contentStart = text.indexOf(">", open);
  const close = text.indexOf("</untrusted-data-", contentStart);
  if (open < 0 || contentStart < 0 || close < 0) {
    throw new Error(`No JSON payload in ${path}`);
  }
  return JSON.parse(text.slice(contentStart + 1, close).trim()) as ExportRow[];
}

function loadOldUnsubscribeUrls(): Map<string, string> {
  const map = new Map<string, string>();
  for (const file of ["pre-consent.csv", "subscribed.csv", "fetched-unsub-urls.json"]) {
    const path = join(ROOT, file);
    if (!existsSync(path)) continue;
    if (file.endsWith(".json")) {
      const obj = JSON.parse(readFileSync(path, "utf8")) as Record<string, string>;
      for (const [email, url] of Object.entries(obj)) {
        if (email && url) map.set(email.toLowerCase(), url);
      }
      continue;
    }
    for (const line of readFileSync(path, "utf8").split(/\r?\n/).slice(1).filter(Boolean)) {
      const emailEnd = line.indexOf(",");
      const urlStart = line.lastIndexOf(",");
      if (emailEnd < 0 || urlStart <= emailEnd) continue;
      const email = line.slice(0, emailEnd).trim().toLowerCase();
      const url = line.slice(urlStart + 1).trim();
      if (email && url) map.set(email, url);
    }
  }
  return map;
}

function loadExportRows(): ExportRow[] {
  const eligiblePath = join(ROOT, "eligible-export.json");
  if (existsSync(eligiblePath)) {
    return JSON.parse(readFileSync(eligiblePath, "utf8")) as ExportRow[];
  }
  const byEmail = new Map<string, ExportRow>();
  for (const file of PAGE_FILES) {
    for (const row of parseMcpFile(join(AGENT_TOOLS, file))) {
      const email = String(row.email ?? "").trim();
      if (!email) continue;
      const key = email.toLowerCase();
      const existing = byEmail.get(key);
      if (!existing || (existing.cohort !== "subscribed" && row.cohort === "subscribed")) {
        byEmail.set(key, { ...row, email });
      }
    }
  }
  return [...byEmail.values()];
}

function sqlQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function splitIntoBatches<T>(items: T[], batchCount: number): T[][] {
  const size = Math.ceil(items.length / batchCount);
  if (size > RESEND_BATCH_CONTACT_CAP) {
    throw new Error(
      `Batch size ${size} exceeds Resend cap ${RESEND_BATCH_CONTACT_CAP} (${items.length} contacts / ${batchCount} batches)`,
    );
  }
  const batches: T[][] = [];
  for (let i = 0; i < batchCount; i++) {
    batches.push(items.slice(i * size, Math.min((i + 1) * size, items.length)));
  }
  return batches.filter((b) => b.length > 0);
}

function batchFileName(index: number): string {
  return `batch-${String(index).padStart(2, "0")}.json`;
}

function batchSegmentName(index: number): string {
  return `Broadcast batch ${index} of ${RESEND_BATCH_COUNT}`;
}

function buildStoredContacts(): { contacts: StoredContact[]; newTokenCount: number } {
  const exported = loadExportRows();
  const urls = loadOldUnsubscribeUrls();
  const origin = getPublicSiteOrigin();
  const newTokens: { user_id: string; token_hash: string }[] = [];
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);
  const expiresIso = expiresAt.toISOString();

  const sorted = [...exported].sort((a, b) => {
    const ta = a.created_at ? Date.parse(a.created_at) : 0;
    const tb = b.created_at ? Date.parse(b.created_at) : 0;
    if (ta !== tb) return ta - tb;
    return a.email.localeCompare(b.email);
  });

  const contacts: StoredContact[] = sorted.map((row) => {
    const email = row.email.trim();
    const names =
      typeof row.first_name === "string" || typeof row.last_name === "string"
        ? { first_name: row.first_name ?? "", last_name: row.last_name ?? "" }
        : namesFromMetadata(row.raw_user_meta_data ?? undefined);
    let unsubscribeUrl = urls.get(email.toLowerCase());
    if (!unsubscribeUrl) {
      const raw = generateMarketingRawToken();
      newTokens.push({ user_id: row.user_id, token_hash: hashMarketingToken(raw) });
      unsubscribeUrl = `${origin}/unsubscribe?token=${encodeURIComponent(raw)}`;
    }
    return {
      user_id: row.user_id,
      email,
      first_name: names.first_name,
      last_name: names.last_name,
      unsubscribe_url: unsubscribeUrl,
      created_at: row.created_at,
      cohort: row.cohort,
    };
  });

  if (newTokens.length) {
    const values = newTokens
      .map(
        (t) =>
          `(${sqlQuote(t.user_id)}::uuid, ${sqlQuote(t.token_hash)}, ${sqlQuote(expiresIso)}::timestamptz)`,
      )
      .join(",\n");
    writeFileSync(
      join(ROOT, "insert-new-unsubscribe-tokens.sql"),
      `INSERT INTO marketing_unsubscribe_tokens (user_id, token_hash, expires_at)\nVALUES\n${values}\nON CONFLICT (token_hash) DO NOTHING;\n`,
      "utf8",
    );
  }

  return { contacts, newTokenCount: newTokens.length };
}

function writeBatches(contacts: StoredContact[]): Manifest {
  mkdirSync(BATCH_DIR, { recursive: true });
  writeFileSync(ALL_CONTACTS_FILE, JSON.stringify(contacts), "utf8");
  const batches = splitIntoBatches(contacts, RESEND_BATCH_COUNT);
  const manifest: Manifest = {
    createdAt: new Date().toISOString(),
    batchCount: batches.length,
    total: contacts.length,
    batches: batches.map((rows, i) => {
      const index = i + 1;
      const file = batchFileName(index);
      writeFileSync(join(BATCH_DIR, file), JSON.stringify(rows), "utf8");
      return { index, file, count: rows.length, segment: batchSegmentName(index) };
    }),
  };
  writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), "utf8");
  return manifest;
}

function loadOrCreateBatches(): Manifest {
  if (existsSync(MANIFEST_FILE) && existsSync(ALL_CONTACTS_FILE)) {
    return JSON.parse(readFileSync(MANIFEST_FILE, "utf8")) as Manifest;
  }
  const { contacts, newTokenCount } = buildStoredContacts();
  const manifest = writeBatches(contacts);
  console.log(
    `Prepared ${manifest.total} contacts in ${manifest.batchCount} batches (new_tokens=${newTokenCount})`,
  );
  for (const b of manifest.batches) {
    console.log(`  batch ${b.index}: ${b.count} → ${b.file} (${b.segment})`);
  }
  return manifest;
}

function createRateLimiter(maxPerSec: number): () => Promise<void> {
  const timestamps: number[] = [];
  return async () => {
    for (; ;) {
      const now = Date.now();
      while (timestamps.length && now - timestamps[0]! >= 1000) timestamps.shift();
      if (timestamps.length < maxPerSec) {
        timestamps.push(now);
        return;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  };
}

async function listAllResendContactIds(apiKey: string): Promise<string[]> {
  const ids: string[] = [];
  let after: string | null = null;
  const acquire = createRateLimiter(4);
  for (; ;) {
    await acquire();
    const url = new URL("https://api.resend.com/contacts");
    url.searchParams.set("limit", "100");
    if (after) url.searchParams.set("after", after);
    let res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    for (let attempt = 0; res.status === 429 && attempt < 8; attempt++) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      await acquire();
      res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    }
    if (!res.ok) throw new Error(`List contacts failed (${res.status})`);
    const body = (await res.json()) as { data?: { id: string }[]; has_more?: boolean };
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
    let deleted = 0;
    let failed = 0;
    let i = 0;
    const workers = 8;
    const acquire = createRateLimiter(8);
    async function worker() {
      while (i < ids.length) {
        const id = ids[i++]!;
        let ok = false;
        for (let attempt = 0; attempt < 12; attempt++) {
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
          console.error(`Delete failed ${id}: ${res.status}`);
          break;
        }
        if (ok) deleted++;
        else failed++;
        if ((deleted + failed) % 200 === 0 || deleted + failed === ids.length) {
          console.log(`  deleted=${deleted} failed=${failed} / ${ids.length}`);
        }
      }
    }
    await Promise.all(Array.from({ length: workers }, () => worker()));
    totalDeleted += deleted;
    if (failed > 0 && deleted === 0) throw new Error("Delete stalled (all failed)");
  }
  return totalDeleted;
}

async function uploadBatch(index: number, apiKey: string): Promise<void> {
  const file = join(BATCH_DIR, batchFileName(index));
  const rows = JSON.parse(readFileSync(file, "utf8")) as StoredContact[];
  if (rows.length > RESEND_BATCH_CONTACT_CAP) {
    throw new Error(`Batch ${index} has ${rows.length} contacts; cap is ${RESEND_BATCH_CONTACT_CAP}`);
  }
  const segmentName = batchSegmentName(index);
  await ensureResendUnsubscribeUrlProperty(apiKey);
  const segment = await findOrCreateResendSegment(segmentName, apiKey);
  console.log(
    `Segment "${segmentName}" ${segment.created ? "created" : "reused"} (${segment.id})`,
  );
  const csv = rowsToResendMarketingContactCsv(rows);
  const { importId } = await createResendMarketingContactImport(csv, apiKey, {
    segmentIds: [segment.id],
  });
  console.log(`Queued batch ${index}: ${rows.length} contacts (import ${importId})`);
  const status = await waitForResendContactImport(importId, apiKey);
  const counts = status.counts;
  console.log(
    `Import ${status.status}: created=${counts?.created ?? 0} updated=${counts?.updated ?? 0} failed=${counts?.failed ?? status.failed_contacts ?? 0}`,
  );
  if ((status.status ?? "").toLowerCase() === "failed") {
    throw new Error(status.error ?? `Resend import ${importId} failed`);
  }
}

async function main(): Promise<void> {
  const { batch, prepareOnly, skipDelete } = parseArgs();
  const apiKey = getResendApiKey();
  const manifest = loadOrCreateBatches();
  if (prepareOnly) {
    console.log("--prepare-only: batches written, no upload");
    return;
  }
  const entry = manifest.batches.find((b) => b.index === batch);
  if (!entry) throw new Error(`Batch ${batch} not in manifest`);
  if (!skipDelete) {
    const deleted = await deleteAllResendContacts(apiKey);
    console.log(`Wiped ${deleted} Resend contacts`);
  } else {
    console.log("--skip-delete: leaving existing Resend contacts in place");
  }
  await uploadBatch(batch, apiKey);
  console.log(`DONE batch ${batch}/${manifest.batchCount} (${entry.count} contacts)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
