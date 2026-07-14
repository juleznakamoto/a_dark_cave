/**
 * Sync confirmed marketing opt-in users to Resend via the Contacts Import API.
 *
 * Full sync (with per-contact unsubscribe_url tokens) requires Supabase service role:
 *   NODE_ENV=production tsx scripts/sync-resend-marketing-contacts.ts
 *
 * Env:
 *   RESEND_API_KEY or RESEND_API_KEY_PROD
 *   VITE_SUPABASE_URL_PROD + SUPABASE_SERVICE_ROLE_KEY_PROD (when NODE_ENV !== development)
 *
 * One-off without Supabase env (no unsubscribe_url property):
 *   node scripts/sync-resend-marketing-contacts.mjs --mcp-export <path> --api-key re_...
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const RESEND_IMPORTS_URL = "https://api.resend.com/contacts/imports";

function namesFromMetadata(meta) {
  if (!meta || typeof meta !== "object") {
    return { first_name: "", last_name: "" };
  }
  const fn = meta.first_name ?? meta.given_name;
  const ln = meta.last_name ?? meta.family_name;
  if (typeof fn === "string" || typeof ln === "string") {
    return {
      first_name: typeof fn === "string" ? fn : "",
      last_name: typeof ln === "string" ? ln : "",
    };
  }
  const full = meta.full_name ?? meta.name;
  if (typeof full === "string" && full.trim()) {
    const parts = full.trim().split(/\s+/);
    if (parts.length === 1) {
      return { first_name: parts[0], last_name: "" };
    }
    return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
  }
  return { first_name: "", last_name: "" };
}

function csvCell(value) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseMcpExportText(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    const outer = JSON.parse(trimmed);
    if (typeof outer.result === "string") {
      const match = outer.result.match(
        /<untrusted-data-[^>]+>\s*(\[[\s\S]*\])\s*<\/untrusted-data-[^>]+>/,
      );
      if (match?.[1]) {
        return JSON.parse(match[1]);
      }
    }
  }
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) {
    throw new Error("Could not find JSON array in MCP export file");
  }
  return JSON.parse(text.slice(start, end + 1));
}

function buildRowsFromMcpExport(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const emailRaw = row.email?.trim();
    if (!emailRaw) continue;
    const emailKey = emailRaw.toLowerCase();
    if (seen.has(emailKey)) continue;
    seen.add(emailKey);
    const { first_name, last_name } = namesFromMetadata(row.raw_user_meta_data);
    out.push({ email: emailRaw, first_name, last_name });
  }
  out.sort((a, b) => a.email.localeCompare(b.email));
  return out;
}

function rowsToCsv(rows) {
  const header = ["email", "first_name", "last_name", "unsubscribed"].join(",");
  const lines = rows.map((r) =>
    [r.email, r.first_name, r.last_name, "false"].map(csvCell).join(","),
  );
  return `${header}\n${lines.join("\n")}\n`;
}

async function createImport(csv, apiKey) {
  const form = new FormData();
  form.append(
    "file",
    new Blob([csv], { type: "text/csv" }),
    "resend-marketing-opt-in.csv",
  );
  form.append(
    "column_map",
    JSON.stringify({
      email: "email",
      firstName: "first_name",
      lastName: "last_name",
    }),
  );
  form.append("on_conflict", "upsert");

  const res = await fetch(RESEND_IMPORTS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.message ?? body.error ?? `Import failed (${res.status})`);
  }
  return body.id;
}

async function waitForImport(importId, apiKey) {
  const started = Date.now();
  for (; ;) {
    const res = await fetch(`${RESEND_IMPORTS_URL}/${importId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.message ?? body.error ?? `Status failed (${res.status})`);
    }
    const state = (body.status ?? "").toLowerCase();
    const counts = body.counts ?? {};
    const imported =
      body.imported_contacts ??
      counts.created ??
      counts.updated ??
      0;
    const total = body.total_contacts ?? counts.total ?? "?";
    process.stdout.write(
      `\rImport ${importId}: ${body.status ?? "unknown"} (${imported}/${total})`,
    );
    if (
      state === "completed" ||
      state === "failed" ||
      state === "cancelled" ||
      state === "canceled"
    ) {
      process.stdout.write("\n");
      return body;
    }
    if (Date.now() - started > 10 * 60 * 1000) {
      throw new Error(`Timed out waiting for import ${importId}`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}

function parseArgs() {
  const argv = process.argv.slice(2);
  let mcpExport = "";
  let apiKey = process.env.RESEND_API_KEY_PROD ?? process.env.RESEND_API_KEY ?? "";
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--mcp-export" && argv[i + 1]) {
      mcpExport = argv[++i];
    } else if (a === "--api-key" && argv[i + 1]) {
      apiKey = argv[++i];
    }
  }
  if (!mcpExport) {
    throw new Error("Usage: node scripts/sync-resend-marketing-contacts.mjs --mcp-export <file> [--api-key re_...]");
  }
  if (!apiKey.trim()) {
    throw new Error("Missing Resend API key (--api-key or RESEND_API_KEY_PROD)");
  }
  return { mcpExport: resolve(mcpExport), apiKey: apiKey.trim() };
}

async function main() {
  const { mcpExport, apiKey } = parseArgs();
  const raw = readFileSync(mcpExport, "utf8");
  const sourceRows = parseMcpExportText(raw);
  const rows = buildRowsFromMcpExport(sourceRows);
  const csv = rowsToCsv(rows);
  console.log(`Uploading ${rows.length} marketing contacts to Resend...`);
  const importId = await createImport(csv, apiKey);
  console.log(`Started import ${importId}`);
  const status = await waitForImport(importId, apiKey);
  if ((status.status ?? "").toLowerCase() === "failed") {
    throw new Error(status.error ?? `Import failed (${status.failed_contacts ?? 0} failed)`);
  }
  console.log(
    `Done. created=${status.counts?.created ?? status.imported_contacts ?? 0} failed=${status.counts?.failed ?? status.failed_contacts ?? 0}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
