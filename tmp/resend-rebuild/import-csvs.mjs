/**
 * Import pre-consent.csv + subscribed.csv into Resend segments.
 * Usage: RESEND_API_KEY=... node tmp/resend-rebuild/import-csvs.mjs
 */

import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const DIR = resolve("tmp/resend-rebuild");
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error("Missing RESEND_API_KEY");
  process.exit(1);
}

const SEGMENT_PRE = "Pre-consent legacy (no marketing record)";
const SEGMENT_SUB = "Currently subscribed (marketing opt-in)";
const UNSUB = "unsubscribe_url";

async function resendJson(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? `${method} ${url} (${res.status})`);
  }
  return data;
}

async function ensureUnsubProperty() {
  const res = await fetch("https://api.resend.com/contact-properties", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ key: UNSUB, type: "string" }),
  });
  if (res.ok || res.status === 409) return;
  const body = await res.json().catch(() => ({}));
  const detail = body.message ?? body.error ?? body.name ?? "";
  if (/already exists|duplicate|conflict/i.test(detail)) return;
  throw new Error(detail || `property create failed (${res.status})`);
}

async function findOrCreateSegment(name) {
  const listed = await resendJson("GET", "https://api.resend.com/segments");
  const existing = (listed.data ?? []).find(
    (s) => (s.name ?? "").trim().toLowerCase() === name.trim().toLowerCase(),
  );
  if (existing?.id) return { id: existing.id, created: false };
  const created = await resendJson("POST", "https://api.resend.com/segments", {
    name,
  });
  return { id: created.id, created: true };
}

async function waitImport(importId) {
  const started = Date.now();
  for (;;) {
    const status = await resendJson(
      "GET",
      `https://api.resend.com/contacts/imports/${importId}`,
    );
    const state = String(status.status ?? "").toLowerCase();
    if (["completed", "failed", "cancelled", "canceled"].includes(state)) {
      return status;
    }
    if (Date.now() - started > 20 * 60 * 1000) {
      throw new Error(`Timeout waiting for import ${importId}`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}

async function importCsv(csv, segmentId, label) {
  const form = new FormData();
  form.append("file", new Blob([csv], { type: "text/csv" }), `${label}.csv`);
  form.append(
    "column_map",
    JSON.stringify({
      email: "email",
      firstName: "first_name",
      lastName: "last_name",
      properties: { [UNSUB]: { column: UNSUB, type: "string" } },
    }),
  );
  form.append("on_conflict", "upsert");
  form.append("segments", JSON.stringify([{ id: segmentId }]));
  const res = await fetch("https://api.resend.com/contacts/imports", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.message ?? body.error ?? `import failed (${res.status})`);
  }
  if (!body.id) throw new Error("import missing id");
  console.log(`Queued ${label} import ${body.id}`);
  const status = await waitImport(body.id);
  console.log(
    `${label}: ${status.status} imported=${status.imported_contacts ?? 0} failed=${status.failed_contacts ?? 0}`,
  );
  if (String(status.status).toLowerCase() === "failed") {
    throw new Error(status.error ?? `${label} import failed`);
  }
  return status;
}

async function main() {
  await ensureUnsubProperty();
  const jobs = [
    { name: SEGMENT_PRE, file: "pre-consent.csv" },
    { name: SEGMENT_SUB, file: "subscribed.csv" },
  ];
  for (const job of jobs) {
    const csv = readFileSync(join(DIR, job.file), "utf8");
    const lines = csv.trim().split(/\n/).length - 1;
    if (lines <= 0) {
      console.log(`Skipping ${job.name} (empty)`);
      continue;
    }
    const segment = await findOrCreateSegment(job.name);
    console.log(
      `Segment "${job.name}" ${segment.created ? "created" : "reused"} (${segment.id}) — ${lines} rows`,
    );
    await importCsv(csv, segment.id, job.file.replace(/\.csv$/, ""));
  }
  console.log("DONE imports");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
